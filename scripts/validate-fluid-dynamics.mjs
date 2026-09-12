import { spawn } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';

const server = await createServer({ server: { host: '127.0.0.1', port: 5199, strictPort: true }, logLevel: 'error' });
let browser, socket;
const errors = [], checks = [];
try {
  await server.listen();
  const profile = await mkdtemp(join(tmpdir(), 'gcanvas-planar-'));
  browser = spawn(process.env.NS_CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    ['--headless=new', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'],
    { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  const endpoint = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Browser startup timed out')), 20000);
    browser.once('error', reject);
    browser.stderr.on('data', data => { const match = String(data).match(/DevTools listening on (ws:\/\/[^\s]+)/); if (match) { clearTimeout(timer); resolve(match[1]); } });
  });
  socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0; const pending = new Map();
  socket.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails);
    const handler = pending.get(m.id);
    if (handler) { pending.delete(m.id); m.error ? handler.reject(m.error) : handler.resolve(m.result); }
  };
  function call(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const key = ++id, timer = setTimeout(() => { pending.delete(key); reject(new Error(`${method} timeout`)); }, 120000);
      pending.set(key, { resolve: r => { clearTimeout(timer); resolve(r); }, reject: e => { clearTimeout(timer); reject(e); } });
      socket.send(JSON.stringify({ id: key, method, params, sessionId }));
    });
  }
  const { targetInfos } = await call('Target.getTargets');
  const { sessionId: sid } = await call('Target.attachToTarget', { targetId: targetInfos.find(t => t.type === 'page').targetId, flatten: true });
  const evaluate = async expression => {
    const r = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sid);
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  await call('Runtime.enable', {}, sid); await call('Page.enable', {}, sid);
  if (process.argv.includes('--info')) {
    for (const [page, name, isLab] of [['fluid-dynamics', 'ink', false], ['nsvortex', 'vortex', false], ['ns-lab', 'lab', true]]) {
      await call('Emulation.setDeviceMetricsOverride', {width:1440,height:900,deviceScaleFactor:1,mobile:false},sid);
      await call('Page.navigate',{url:`http://127.0.0.1:5199/demos/${page}.html?paused=1&debug`},sid);
      for(let n=0;n<100;n++){
        if(await evaluate(`location.pathname==='/demos/${page}.html'&&document.readyState==='complete'&&!!document.getElementById('${isLab?'about-toggle':'info-toggle'}')`))break;
        await new Promise(r=>setTimeout(r,100));
      }
      for(const [width,height] of [[1440,900],[390,844],[844,390]]) {
        await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<900},sid);
        await evaluate('new Promise(r=>setTimeout(r,250))');
        checks.push(await evaluate(`(()=>{
          const info=document.getElementById('${isLab?'about':'info'}'),button=document.getElementById('${isLab?'about-toggle':'info-toggle'}');
          if(button.getAttribute('aria-expanded')!=='true')button.click();
          return {name:'${name}-${width}-opens',passed:button.getAttribute('aria-expanded')==='true'&&!info.hidden&&(${isLab}||info.classList.contains('open'))};
        })()`));
        await evaluate('new Promise(r=>setTimeout(r,250))');
        checks.push(await evaluate(`(()=>{
          const info=document.getElementById('${isLab?'about':'info'}'),r=info.getBoundingClientRect(),math=info.querySelector('.math');
          const g=window.fluidDynamicsDemo??window.nsVortexDemo,b=g?.toggle??g?.toggleButton;
          return {name:'${name}-${width}-fits-and-shared-math',passed:getComputedStyle(info).visibility==='visible'&&r.left>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&
            document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight&&!!math&&getComputedStyle(math).borderLeftStyle==='solid'&&
            (!b?.visible||b.x/(g.displayRatio??1)-b.width*b.scaleX/(g.displayRatio??1)/2>40)};
        })()`));
        if(isLab) {
          checks.push(await evaluate(`(()=>{const panels=[...document.querySelectorAll('#about details')];return {name:'lab-${width}-math-optional',passed:panels.length===2&&panels.every(p=>!p.open)};})()`));
        }
        const shot=await call('Page.captureScreenshot',{format:'png'},sid);
        await writeFile(`.temp/${name}-info-${width}.png`,Buffer.from(shot.data,'base64'));
        await evaluate(`document.getElementById('${isLab?'about-close':'info-toggle'}').click()`);
        checks.push(await evaluate(`({name:'${name}-${width}-closes',passed:document.getElementById('${isLab?'about-toggle':'info-toggle'}').getAttribute('aria-expanded')==='false'})`));
      }
    }
  } else {
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sid);
  await call('Page.navigate', { url: `http://127.0.0.1:5199/demos/fluid-dynamics.html?paused${process.argv.includes('--cpu') ? '&cpu' : ''}` }, sid);
  for (let n = 0; n < 100; n++) {
    if (await evaluate('!!window.fluidDynamicsDemo?.field')) break;
    await new Promise(r => setTimeout(r, 100));
  }
  const report = await evaluate(`(async () => {
    const g = window.fluidDynamicsDemo; g.stop(); const f = g.field, m = f.model;
    window.inkSnapshot=()=>{f.dirty=true;g.render();const canvas=document.createElement('canvas');canvas.width=320;canvas.height=200;
      const ctx=canvas.getContext('2d');ctx.drawImage(f.gpu?.available?f.gpu.draw():f.raster,0,0,320,200);return ctx.getImageData(0,0,320,200).data;};
    const before = inkSnapshot(), t = performance.now();
    for (let i = 0; i < 360; i++) f.step(1/60);
    const ms = performance.now() - t;
    const after=inkSnapshot();let change = 0; for (let k = 0; k < after.length; k++) change += Math.abs(after[k] - before[k]);
    g.render();
    return { name: 'six-seconds-of-visible-flow', passed: change > 10000 && m.u.every(Number.isFinite), time: m.time, change, msPerStep: ms/360, divergence: m.divergenceRMS(), grid: [m.nx,m.ny], ink: f.gpu?.available?[f.gpu.width,f.gpu.height]:[m.nx,m.ny], gpuError:f.gpu?.error };
  })()`);
  checks.push(report); console.log(JSON.stringify(report));
  let shot = await call('Page.captureScreenshot', { format: 'png' }, sid);
  await writeFile('.temp/fluid-dynamics.png', Buffer.from(shot.data, 'base64'));
  checks.push(await evaluate(`(() => {
    const g=window.fluidDynamicsDemo, m=g.field.model; const t=m.time, a=inkSnapshot();
    g.paused=true; g.update(0.04);
    return {name:'pause-freezes-state',passed:m.time===t&&inkSnapshot().every((v,i)=>v===a[i])};
  })()`));
  checks.push(await evaluate(`(async()=>{
    const {PALETTES}=await import('/demos/js/navier-stokes-looks.js');
    const g=window.fluidDynamicsDemo,m=g.field.model,t=m.time,original=inkSnapshot();
    const u=m.u.slice(),v=m.v.slice(),dye=m.dye.map(a=>a.slice()),texture=g.field.gpu?.targets[0]?.texture;
    const images=[];for(const name of Object.keys(PALETTES)){
      g.paletteControl.value=name;images.push(inkSnapshot());
      if(g.palette!==name)throw new Error('Palette control not connected');
    }
    g.paletteControl.value='original';const restored=inkSnapshot();
    const distinct=images.every((image,i)=>image.some((v,k)=>v!==original[k])&&images.slice(0,i).every(other=>image.some((v,k)=>v!==other[k])));
    return {name:'six-live-palettes-preserve-state-and-original',passed:distinct&&g.paused&&m.time===t&&
      m.u.every((x,i)=>x===u[i])&&m.v.every((x,i)=>x===v[i])&&m.dye.every((a,c)=>a.every((x,i)=>x===dye[c][i]))&&
      g.field.gpu?.targets[0]?.texture===texture&&restored.every((v,i)=>v===original[i]),palettes:Object.keys(PALETTES)};
  })()`));
  checks.push(await evaluate(`(()=>{
    const g=window.fluidDynamicsDemo;g.view='speed';g.field.dirty=true;g.render();const before=g.field.pixels.data.slice();
    g.paletteControl.value='orchid';g.render();const passed=g.field.pixels.data.every((v,i)=>v===before[i]);
    g.view='ink';g.paletteControl.value='copper';g.render();return {name:'palette-keeps-speed-colors-stable',passed};
  })()`));
  shot=await call('Page.captureScreenshot',{format:'png'},sid);
  await writeFile('.temp/fluid-dynamics-copper.png',Buffer.from(shot.data,'base64'));
  await evaluate(`window.fluidDynamicsDemo.paletteControl.value='original'`);
  await evaluate('window.fluidDynamicsDemo.drive=0; window.fluidDynamicsDemo.field.clear();');
  await call('Input.dispatchMouseEvent', { type: 'mousePressed', x: 450, y: 400, button: 'left', clickCount: 1 }, sid);
  await call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 650, y: 420, button: 'left', buttons: 1 }, sid);
  checks.push(await evaluate(`(() => {
    const g=window.fluidDynamicsDemo;g.field.step(1/60);g.render();
    return {name:'mouse-push-and-ink',passed:!!g.brush&&g.field.model.u.some(v=>Math.abs(v)>0.01)&&inkSnapshot().some((v,i)=>i%4!==3&&v>100)};
  })()`));
  await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 650, y: 420, button: 'left', clickCount: 1 }, sid);
  checks.push(await evaluate(`({name:'release-stops-brush',passed:window.fluidDynamicsDemo.brush===null})`));
  await evaluate('window.fluidDynamicsDemo.paused=true;');
  await call('Input.dispatchMouseEvent', { type: 'mousePressed', x: 1362, y: 30, button: 'left', clickCount: 1 }, sid);
  await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 1362, y: 30, button: 'left', clickCount: 1 }, sid);
  checks.push(await evaluate(`({name:'canvas-controls-capture-input',passed:!window.fluidDynamicsDemo.panelOpen&&window.fluidDynamicsDemo.paused&&window.fluidDynamicsDemo.brush===null})`));
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, sid);
  await evaluate('new Promise(r=>setTimeout(r,400))');
  await call('Emulation.setTouchEmulationEnabled', { enabled: true }, sid);
  await evaluate('window.fluidDynamicsDemo.field.clear();');
  await call('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 190, y: 400 }] }, sid);
  await call('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }, sid);
  checks.push(await evaluate(`(() => {
    const g=window.fluidDynamicsDemo;g.render();
    const a=inkSnapshot();let sx=0,sy=0,sum=0;for(let y=0;y<200;y++)for(let x=0;x<320;x++){const k=(x+y*320)*4,w=Math.max(0,a[k]+a[k+1]+a[k+2]-20);sx+=x*w;sy+=y*w;sum+=w;}
    return {name:'mobile-retina-tap-position',passed:sum>100&&!g.brush&&!g.paused&&Math.abs(sx/sum/320-190/390)<0.03&&Math.abs(sy/sum/200-400/844)<0.03,center:[sx/sum/320,sy/sum/200]};
  })()`));
  checks.push(await evaluate(`(() => {
    const g=window.fluidDynamicsDemo;g.drive=1;g.field.seed();for(let i=0;i<180;i++)g.field.step(1/60);g.render();
    return {name:'mobile-retina-viewport-fits',passed:document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight&&g.canvas.width===780&&g.canvas.height===1688};
  })()`));
  shot = await call('Page.captureScreenshot', { format: 'png' }, sid);
  await writeFile('.temp/fluid-dynamics-mobile.png', Buffer.from(shot.data, 'base64'));
  await evaluate('window.fluidDynamicsDemo.panelOpen=true; window.fluidDynamicsDemo.layoutUI(); window.fluidDynamicsDemo.render();');
  checks.push(await evaluate(`(() => {const g=window.fluidDynamicsDemo,p=g.panel;return {name:'mobile-controls-fit',passed:p.y+p.height*p.scaleY<=g.height&&p.x>=0};})()`));
  shot = await call('Page.captureScreenshot', { format: 'png' }, sid);
  await writeFile('.temp/fluid-dynamics-mobile-controls.png', Buffer.from(shot.data, 'base64'));
  await call('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[{x:312,y:30}]},sid);
  await call('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]},sid);
  checks.push(await evaluate(`({name:'retina-control-hit-test',passed:!window.fluidDynamicsDemo.panelOpen&&!window.fluidDynamicsDemo.brush})`));
  if(!process.argv.includes('--cpu')) {
    checks.push(await evaluate(`(() => {const f=window.fluidDynamicsDemo.field;return {name:'gpu-target-and-no-gl-errors',passed:f.gpu?.available&&f.gpu.width>f.model.nx&&f.gpu.gl.getError()===0,error:f.gpu?.error};})()`));
    checks.push(await evaluate(`(() => {
      const g=window.fluidDynamicsDemo,f=g.field,t=f.model.time,before=inkSnapshot();g.quality='high';f.resizeInk();const after=inkSnapshot();
      let error=0;for(let i=0;i<after.length;i++)error+=Math.abs(after[i]-before[i]);
      return {name:'quality-resize-preserves-ink-and-time',passed:f.gpu.height>512&&t===f.model.time&&error/after.length<4,meanError:error/after.length};
    })()`));
    checks.push(await evaluate(`(async()=>{
      const {GPUInk}=await import('/demos/js/fluid-dynamics-ink.js');const {FluidGrid2D}=await import('/src/math/fluid-grid.js');
      const m=new FluidGrid2D({nx:64,ny:32,fade:0}),gpu=new GPUInk();m.u.fill(.3);gpu.resize(512,256,m);
      gpu.splat(.65,.25,.025,[1,0,0],1);
      const centroid=()=>{const c=document.createElement('canvas');c.width=512;c.height=256;const ctx=c.getContext('2d');ctx.drawImage(gpu.draw(),0,0);
        const a=ctx.getImageData(0,0,512,256).data;let sum=0,xsum=0,ysum=0,lit=0;for(let y=0;y<256;y++)for(let x=0;x<512;x++){const w=Math.max(0,a[(x+y*512)*4]-3);sum+=w;xsum+=(x+.5)/512*2*w;ysum+=(y+.5)/256*w;if(w>20)lit++;}return {x:xsum/sum,y:ysum/sum,lit};};
      const before=centroid();for(let i=0;i<30;i++)gpu.step(m,1/60);const after=centroid(),error=gpu.gl.getError();gpu.destroy();
      return {name:'fine-ink-transport-and-orientation',passed:Math.abs(after.x-before.x-.15)<.006&&Math.abs(after.y-.25)<.006&&before.lit>10&&error===0,before,after,error};
    })()`));
    await evaluate(`window.lostExtension=window.fluidDynamicsDemo.field.gpu.gl.getExtension('WEBGL_lose_context');lostExtension.loseContext()`);
    await evaluate('new Promise(r=>setTimeout(r,100))');
    checks.push(await evaluate(`(()=>{const g=window.fluidDynamicsDemo;g.field.step(1/60);g.render();return {name:'context-loss-cpu-fallback',passed:!g.field.gpu.available&&g.field.model.u.every(Number.isFinite)&&g.field.model.dye.some(a=>a.some(v=>v>0))};})()`));
    await evaluate(`lostExtension.restoreContext()`);
    await evaluate('new Promise(r=>setTimeout(r,300))');
    checks.push(await evaluate(`(()=>{const g=window.fluidDynamicsDemo;g.field.step(1/60);g.render();return {name:'context-restoration-resumes-gpu-ink',passed:g.field.gpu.available&&g.field.gpu.gl.getError()===0&&inkSnapshot().some((v,i)=>i%4!==3&&v>10)};})()`));
    checks.push(await evaluate(`(()=>{
      const g=window.fluidDynamicsDemo;g.quality='auto';g.autoScale=1;g.field.resizeInk();const before=g.field.gpu.height,t=g.field.model.time;
      g.running=true;g.paused=false;g.qualitySamples=180;g.lastQualityChange=-10000;g.frameCost=50;g.frameStarted=performance.now();g.render();g.stop();
      return {name:'auto-reduces-ink-budget-without-reset',passed:g.field.gpu.height<before&&g.field.model.time===t,before,after:g.field.gpu.height};
    })()`));
  }
  }
  checks.push({ name: 'no-browser-exceptions', passed: errors.length === 0, errors });
  const result = { passed: checks.every(c => c.passed), checks };
  console.log(JSON.stringify(result, null, 2));
  await writeFile('.temp/fluid-dynamics-results.json', JSON.stringify(result, null, 2));
  if (!result.passed) process.exitCode = 1;
  await call('Browser.close');
} catch (e) { console.error(e); process.exitCode = 1; }
finally { socket?.close(); browser?.kill(); await server.close(); }
