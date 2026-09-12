@compute @workgroup_size(8,8)
fn corners(@builtin(global_invocation_id) id:vec3u) {
  let i=i32(id.x);let j=i32(id.y);if(i>i32(p.size.x)||j>i32(p.size.y)){return;}
  var psi=0.0;
  if(i>0){
    if(i==i32(p.size.x)||j==0||j==i32(p.size.y)){psi=source[index(i,j)].w;}
    else {
      let weights=array<f32,4>(-0.0625,0.5625,0.5625,-0.0625);
      var correction=0.0;
      for(var y=0;y<4;y++){for(var x=0;x<4;x++){
        let value=state[index(i+x-2,j+y-2)];psi+=weights[x]*weights[y]*value.z;correction+=weights[x]*weights[y]*value.w;
      }}
      psi+=correction;
      let r=f32(i)*p.geometry.x;psi*=r*r;
    }
  }
  flux[index(i,j)].x=psi;
}
@compute @workgroup_size(8,8)
fn faces(@builtin(global_invocation_id) id:vec3u) {
  let i=i32(id.x);let j=i32(id.y);if(i>i32(p.size.x)||j>i32(p.size.y)){return;}
  let k=index(i,j);
  if(j<i32(p.size.y)){flux[k].y=select(flux[k].x-flux[k+p.size.z].x,0.0,i==0);}
  if(i<i32(p.size.x)){flux[k].z=flux[k+1u].x-flux[k].x;}
}
@compute @workgroup_size(8,8)
fn cells(@builtin(global_invocation_id) id:vec3u) {
  let i=i32(id.x);let j=i32(id.y);if(!interior(i,j)){return;}
  let k=index(i,j);var west=0.0;
  if(i>0){west=flux[k].y/(f32(i)*p.geometry.x*p.geometry.y);}
  velocity[k]=vec4f(0.5*(west+flux[k+1u].y/(f32(i+1)*p.geometry.x*p.geometry.y)),
    0.5*(flux[k].z+flux[k+p.size.z].z)/(radius(i)*p.geometry.x),0.0,0.0);
}
