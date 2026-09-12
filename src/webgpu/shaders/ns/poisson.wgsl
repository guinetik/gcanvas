fn sweep(id:vec3u,color:i32) {
  if(any(id.xy>=p.size.zw)){return;}
  let i=i32(id.x)-2;let j=i32(id.y)-2;let k=index(i,j);var value=state[k];
  if(interior(i,j) && ((i+j)&1)==color){
    let c=row(i,j,p.control.x==1u);
    let lap=rowLaplacian(k,c);
    let correction=value.w+((state[k].y+lap.z)+lap.w)/c.diagonal;
    // Preserve the small correction when normalizing the potential pair.
    // The independent CPU residual check validates the represented sum.
    let high=value.z+correction;let shifted=high-value.z;
    value.w=(value.z-(high-shifted))+(correction-shifted);value.z=high;
  }
  // Separate input/output buffers preserve the untouched color without races.
  output[k]=value;
}
@compute @workgroup_size(8,8)
fn red(@builtin(global_invocation_id) id:vec3u){sweep(id,0);}
@compute @workgroup_size(8,8)
fn black(@builtin(global_invocation_id) id:vec3u){sweep(id,1);}
