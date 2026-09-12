fn slope(a:vec2f,b:vec2f,c:vec2f)->vec2f {
  let left=b-a;let right=c-b;
  return select(vec2f(0.0),sign(left)*min(min(2.0*abs(left),2.0*abs(right)),abs(c-a)*0.5),left*right>vec2f(0.0));
}
fn face(q:f32,mm:vec2f,m:vec2f,n:vec2f,nn:vec2f)->vec2f {
  if(q>=0.0){return m+0.5*slope(mm,m,n);}return n-0.5*slope(m,n,nn);
}
@compute @workgroup_size(8,8)
fn rhs(@builtin(global_invocation_id) id:vec3u) {
  let i=i32(id.x);let j=i32(id.y);if(!interior(i,j)){return;}
  let k=index(i,j);let W=p.size.z;let w=flux[k].y;let e=flux[k+1u].y;let s=flux[k].z;let n=flux[k+W].z;
  let v=state[k].xy;
  let fw=face(w,state[k-2u].xy,state[k-1u].xy,v,state[k+1u].xy);
  let fe=face(e,state[k-1u].xy,v,state[k+1u].xy,state[k+2u].xy);
  let fs=face(s,state[k-2u*W].xy,state[k-W].xy,v,state[k+W].xy);
  let fnorth=face(n,state[k-W].xy,v,state[k+W].xy,state[k+2u*W].xy);
  let transport=-(e*(fe-v)-w*(fw-v)+n*(fnorth-v)-s*(fs-v))/(radius(i)*p.geometry.x*p.geometry.y);
  let src=sources(k);
  output[k]=vec4f(transport+p.physics.x*laplacian(i,j).xy+src.xy,0.0,src.w);
}
