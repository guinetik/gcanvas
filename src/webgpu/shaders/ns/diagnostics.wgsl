var<workgroup> energy:array<vec4f,64>;
var<workgroup> maxima:array<vec4f,64>;
var<workgroup> rates:array<vec4f,64>;
var<workgroup> validity:array<vec4f,64>;

// Second reduction: one workgroup reduces every first-pass group to 64 bytes.
// Host binds statistics as state and a distinct small result buffer as output.
@compute @workgroup_size(8,8)
fn reduce_statistics(@builtin(local_invocation_index) local:u32) {
  var e=vec4f(0.0);var m=vec4f(0.0);var rt=vec4f(0.0);var v=vec4f(0.0);
  let count=((p.size.z+7u)/8u)*((p.size.w+7u)/8u);
  for(var group=local;group<count;group+=64u){
    let k=4u*group;e=vec4f(e.xy+state[k].xy,max(e.zw,state[k].zw));
    m=max(m,state[k+1u]);rt=max(rt,state[k+2u]);v=max(v,state[k+3u]);
  }
  energy[local]=e;maxima[local]=m;rates[local]=rt;validity[local]=v;
  workgroupBarrier();
  for(var stride=32u;stride>0u;stride/=2u){
    if(local<stride){
      energy[local]=vec4f(energy[local].xy+energy[local+stride].xy,max(energy[local].zw,energy[local+stride].zw));
      maxima[local]=max(maxima[local],maxima[local+stride]);rates[local]=max(rates[local],rates[local+stride]);
      validity[local]=max(validity[local],validity[local+stride]);
    }
    workgroupBarrier();
  }
  if(local==0u){output[0]=energy[0];output[1]=maxima[0];output[2]=rates[0];output[3]=validity[0];}
}

@compute @workgroup_size(8,8)
fn diagnostics(@builtin(global_invocation_id) id:vec3u,@builtin(local_invocation_index) local:u32,
  @builtin(workgroup_id) group:vec3u,@builtin(num_workgroups) groups:vec3u) {
  var e=vec4f(0.0);var m=vec4f(0.0);var rt=vec4f(0.0);var valid=vec4f(0.0);
  if(all(id.xy<p.size.zw)){
    let i=i32(id.x)-2;let j=i32(id.y)-2;let k=index(i,j);
    if(!finite(state[k])||!finite(velocity[k])||!finite(flux[k])){valid.y=1.0;}
    if(interior(i,j)){
      let r=radius(i);let dr=p.geometry.x;let dz=p.geometry.y;let W=p.size.z;let a=state[k].x;
      let omega=vec3f(-r*(state[k+W].x-state[k-W].x)/(2.0*dz),r*state[k].y,
        2.0*a+r*(state[k+1u].x-state[k-1u].x)/(2.0*dr));
      let speed=vec3f(velocity[k].xy,r*a);let volume=6.283185307179586*r*dr*dz;
      e=vec4f(0.5*dot(speed,speed)*volume,0.5*dot(omega,omega)*volume,length(omega),length(speed));
      let div=abs(flux[k+1u].y-flux[k].y+flux[k+W].z-flux[k].z)/(r*dr*dz);
      var slip=0.0;
      if(p.control.x==1u){
        if(i==i32(p.size.x)-1){let r2=radius(i-1);
          slip=abs((9.0*r*r*state[k].z-r2*r2*state[k-1u].z)+(9.0*r*r*state[k].w-r2*r2*state[k-1u].w))/(3.0*dr*p.geometry.z);}
        if(j==0){slip=max(slip,r*abs((9.0*state[k].z-state[k+W].z)+(9.0*state[k].w-state[k+W].w))/(3.0*dz));}
        if(j==i32(p.size.y)-1){slip=max(slip,r*abs((9.0*state[k].z-state[k-W].z)+(9.0*state[k].w-state[k-W].w))/(3.0*dz));}
      }
      m=vec4f(abs(a),abs(state[k].y),div,slip);
      let c=row(i,j,p.control.x==1u);
      let lap=rowLaplacian(k,c);let residual=abs((-lap.z-state[k].y)-lap.w);
      let outgoing=max(flux[k+1u].y,0.0)+max(-flux[k].y,0.0)+max(flux[k+W].z,0.0)+max(-flux[k].z,0.0);
      let diffusion=p.physics.x*c.diagonal*select(1.0,4.0,p.control.x==1u);
      let src=sources(k);
      rt=vec4f(residual,outgoing/(r*dr*dz*p.physics.z)+diffusion/p.physics.w,abs(src.z),abs(src.x));
      valid.x=abs(src.y);
      if(!finite(e)||!finite(m)||!finite(rt)||!finite(src)){valid.y=1.0;}
    }
  }
  energy[local]=e;maxima[local]=m;rates[local]=rt;validity[local]=valid;
  workgroupBarrier();
  for(var stride=32u;stride>0u;stride/=2u){
    if(local<stride){
      energy[local]=vec4f(energy[local].xy+energy[local+stride].xy,max(energy[local].zw,energy[local+stride].zw));
      maxima[local]=max(maxima[local],maxima[local+stride]);rates[local]=max(rates[local],rates[local+stride]);
      validity[local]=max(validity[local],validity[local+stride]);
    }
    workgroupBarrier();
  }
  if(local==0u){let k=4u*(group.y*groups.x+group.x);
    statistics[k]=energy[0];statistics[k+1u]=maxima[0];statistics[k+2u]=rates[0];statistics[k+3u]=validity[0];}
}
