fn extension(near:vec4f,next:vec4f,wall:vec4f,layer:i32)->vec4f {
  if(layer==0){return (8.0*wall+next)/3.0-2.0*near;}
  return 8.0*wall+2.0*next-9.0*near;
}
@compute @workgroup_size(8,8)
fn analytic(@builtin(global_invocation_id) id:vec3u) {
  if(any(id.xy>=p.size.zw)){return;}
  let i=i32(id.x)-2;let j=i32(id.y)-2;let mirrored=select(i,-1-i,i<0);
  let k=index(i,j);let m=index(mirrored,j);
  output[k]=select(exterior[m],state[m],interior(mirrored,j));
}
@compute @workgroup_size(8,8)
fn radial(@builtin(global_invocation_id) id:vec3u) {
  if(any(id.xy>=p.size.zw)){return;}
  let i=i32(id.x)-2;let j=i32(id.y)-2;let k=index(i,j);
  var value=state[k];
  if(i>=i32(p.size.x) && j>=0 && j<i32(p.size.y)){
    let n=state[index(i32(p.size.x)-1,j)];let next=state[index(i32(p.size.x)-2,j)];
    let ratio=radius(i32(p.size.x)-1)/p.geometry.z;
    let wall=vec4f(0.0,-8.0*ratio*ratio*(n.z+n.w)/(p.geometry.x*p.geometry.x),0.0,0.0);
    value=extension(n,next,wall,i-i32(p.size.x));
  }
  output[k]=value;
}
@compute @workgroup_size(8,8)
fn axial(@builtin(global_invocation_id) id:vec3u) {
  if(any(id.xy>=p.size.zw)){return;}
  let i=i32(id.x)-2;let j=i32(id.y)-2;let k=index(i,j);var value=state[k];
  if(i>=0 && (j<0 || j>=i32(p.size.y))){
    let upper=j>=i32(p.size.y);let near=select(0,i32(p.size.y)-1,upper);
    let next=select(1,i32(p.size.y)-2,upper);let layer=select(-1-j,j-i32(p.size.y),upper);
    let n=state[index(i,near)];
    value=extension(n,state[index(i,next)],vec4f(0.0,-8.0*(n.z+n.w)/(p.geometry.y*p.geometry.y),0.0,0.0),layer);
  }
  output[k]=value;
}
@compute @workgroup_size(8,8)
fn axis(@builtin(global_invocation_id) id:vec3u) {
  if(any(id.xy>=p.size.zw)){return;}
  let i=i32(id.x)-2;let j=i32(id.y)-2;
  output[index(i,j)]=state[index(select(i,-1-i,i<0),j)];
}
