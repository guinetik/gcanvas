import { spawn } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';

// Uses an isolated, headless browser profile; never connects to a personal session.
const CONFIG = { timeout: process.argv.includes('--driven') ? 600000 : 240000, browser: process.env.NS_CHROME_PATH ??
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' };
const lab = process.argv.includes('--lab') || process.argv.includes('--driven');
const page = lab ? '/demos/ns-lab.html?debug&paused=1' : '/test/ns-axisym/browser/index.html?debug';
const server = await createServer({ server: { host: '127.0.0.1', port: 5199, strictPort: true }, logLevel: 'error' });
let browser, socket;
try {
  await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}`;
  const profile = await mkdtemp(join(tmpdir(), 'gcanvas-ns-gpu-'));
  browser = spawn(CONFIG.browser, ['--headless=new', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, `${url}${page}`],
    { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  const endpoint = await new Promise((resolve,reject) => {
    const timer = setTimeout(()=>reject(new Error('Browser startup timed out')),20000);
    let log='';
    browser.once('error',reject);
    browser.stderr.on('data',data=> {
      log+=String(data); const match=log.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if(match){clearTimeout(timer);resolve(match[1]);}
    });
  });
  socket = new WebSocket(endpoint);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  let id=0;const pending=new Map();
  socket.onmessage=event=> {
    const message=JSON.parse(event.data),handler=pending.get(message.id);
    if(lab&&message.method==='Runtime.exceptionThrown')console.error('Browser exception:',JSON.stringify(message.params.exceptionDetails));
    if(lab&&message.method==='Runtime.consoleAPICalled'&&message.params.args?.[0]?.value==='NS_LAB_CHECK')
      console.log(...message.params.args.map(arg=>arg.value));
    if(handler){pending.delete(message.id);message.error?handler.reject(new Error(JSON.stringify(message.error))):handler.resolve(message.result);}
  };
  function call(method,params={},sessionId) {
    return new Promise((resolve,reject)=> {
      const key=++id,timer=setTimeout(()=>{pending.delete(key);reject(new Error(`${method} timed out`));},CONFIG.timeout);
      pending.set(key,{resolve:v=>{clearTimeout(timer);resolve(v);},reject:e=>{clearTimeout(timer);reject(e);}});
      socket.send(JSON.stringify({id:key,method,params,sessionId}));
    });
  }
  const targets=await call('Target.getTargets');
  const target=targets.targetInfos.find(t=>t.type==='page');
  const {sessionId}=await call('Target.attachToTarget',{targetId:target.targetId,flatten:true});
  await call('Page.enable',{},sessionId);
  if(lab)await call('Runtime.enable',{},sessionId);
  await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1080,deviceScaleFactor:1,mobile:false},sessionId);
  await call('Page.navigate',{url:`${url}${page}`},sessionId);
  for(let attempt=0;attempt<100;attempt++) {
    await new Promise(resolve=>setTimeout(resolve,100));
    const ready=await call('Runtime.evaluate',{expression:`location.origin===${JSON.stringify(url)} && document.readyState==='complete'`,returnByValue:true},sessionId);
    if(ready.result.value)break;
    if(attempt===99)throw new Error('Validation page did not load');
  }
  const expression=process.argv.includes('--probe') ? `(async()=>{
    const a=await navigator.gpu?.requestAdapter(); return {gpu:!!navigator.gpu,adapter:!!a,info:a?.info};
  })()` : process.argv.includes('--driven') ? `(async()=>{
    const m=await import('/test/ns-axisym/browser/driven.js'); return await m.runDrivenChecks();
  })()` : lab ? `(async()=>{
    const m=await import('/test/ns-axisym/browser/lab.js'); return await m.runLabChecks();
  })()` : `(async()=>{
    const m=await import('/test/ns-axisym/browser/validation.js');
    return await m.runValidation({performance: ${process.argv.includes('--performance')}});
  })()`;
  const result=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sessionId);
  if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));
  const report=result.result.value;
  const screenshotIndex=process.argv.indexOf('--screenshot');
  if(screenshotIndex>=0){
    const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true},sessionId);
    await writeFile(process.argv[screenshotIndex+1],Buffer.from(shot.data,'base64'));
    if(lab){
      await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true},sessionId);
      await call('Runtime.evaluate',{expression:`new Promise(resolve=>setTimeout(resolve,300))`,awaitPromise:true},sessionId);
      const mobile=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true},sessionId);
      await writeFile(process.argv[screenshotIndex+1].replace(/\.png$/, '-mobile.png'),Buffer.from(mobile.data,'base64'));
      const mobileResult=await call('Runtime.evaluate',{expression:`(async()=>{
        const button=document.getElementById('panel-toggle');button.click();await new Promise(r=>setTimeout(r,400));
        const result={name:'mobile-instruments',passed:document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight&&
          button.getAttribute('aria-expanded')==='true'&&document.getElementById('instruments').getBoundingClientRect().width>0};
        window.scrollTo(0,0);return result;
      })()`,awaitPromise:true,returnByValue:true},sessionId);
      report.checks?.push(mobileResult.result.value);
      report.passed=report.passed&&mobileResult.result.value.passed;
      const controls=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true},sessionId);
      await writeFile(process.argv[screenshotIndex+1].replace(/\.png$/, '-mobile-controls.png'),Buffer.from(controls.data,'base64'));
      const chartsResult=await call('Runtime.evaluate',{expression:`(async()=>{
        document.getElementById('charts-tab').click();await new Promise(r=>setTimeout(r,300));
        const canvas=document.getElementById('charts'), rect=canvas.getBoundingClientRect();
        const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
        let lit=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]+pixels[i+1]+pixels[i+2]>120)lit++;
        const toggle=document.getElementById('panel-toggle').getBoundingClientRect();
        return {name:'mobile-charts-fit-and-render',passed:rect.width>200&&rect.height>250&&rect.bottom<=innerHeight&&lit>100&&
          toggle.right<=innerWidth&&document.documentElement.scrollHeight<=innerHeight,lit};
      })()`,awaitPromise:true,returnByValue:true},sessionId);
      report.checks?.push(chartsResult.result.value);
      report.passed=report.passed&&chartsResult.result.value.passed;
      const charts=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true},sessionId);
      await writeFile(process.argv[screenshotIndex+1].replace(/\.png$/, '-mobile-charts.png'),Buffer.from(charts.data,'base64'));
      await call('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true},sessionId);
      const landscape=await call('Runtime.evaluate',{expression:`(async()=>{
        if(document.body.classList.contains('panel-open'))document.getElementById('panel-toggle').click();
        await new Promise(r=>setTimeout(r,300));const r=document.getElementById('game').getBoundingClientRect();
        return {name:'landscape-no-page-scroll',passed:document.documentElement.scrollWidth<=innerWidth&&
          document.documentElement.scrollHeight<=innerHeight&&r.height>100&&r.bottom<=innerHeight};
      })()`,awaitPromise:true,returnByValue:true},sessionId);
      report.checks?.push(landscape.result.value);report.passed=report.passed&&landscape.result.value.passed;
      const touchPoint=await call('Runtime.evaluate',{expression:`(()=>{
        const lab=window.nsLab, r=lab.canvas.getBoundingClientRect(), b=lab.fieldBounds;
        return {x:r.left+(b.x+b.width*0.75)*r.width/lab.width,y:r.top+(b.y+b.height*0.5)*r.height/lab.height};
      })()`,returnByValue:true},sessionId);
      await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touchPoint.result.value]},sessionId);
      await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]},sessionId);
      const touch=await call('Runtime.evaluate',{expression:`({name:'touch-stir-queued',passed:window.nsLab.pendingStirs.length>0&&window.nsLab.paused&&!window.nsLab.stirDragging})`,returnByValue:true},sessionId);
      report.checks?.push(touch.result.value);report.passed=report.passed&&touch.result.value.passed;
    }
  }
  const outputIndex=process.argv.indexOf('--output');
  if(outputIndex>=0)await writeFile(process.argv[outputIndex+1],JSON.stringify(report,null,2)+'\n');
  const summary=outputIndex>=0&&!lab?{passed:report.passed,cases:report.cases?.map(c=>({name:c.name,passed:c.passed,error:c.error})),
    studies:report.studies,elapsedMs:report.elapsedMs}:report;
  console.log(JSON.stringify(summary,null,2));
  if(!process.argv.includes('--probe')&&!report.passed)process.exitCode=1;
  await call('Browser.close');
} catch(error) { console.error(error);process.exitCode=1; }
finally {socket?.close();browser?.kill();await server.close();}
