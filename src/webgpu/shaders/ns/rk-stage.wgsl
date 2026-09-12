fn combine(id:vec3u,isFinal:bool) {
  if(any(id.xy>=p.size.zw)){return;}
  let i=i32(id.x)-2;let j=i32(id.y)-2;let k=index(i,j);var v=state[k];
  if(interior(i,j)){
    var base=state[k].xy;var increment=p.physics.y*source[k].xy;
    if(isFinal){base=original[k].xy;increment=0.5*p.physics.y*(exterior[k].xy+source[k].xy);}
    // Kahan accumulation preserves increments smaller than one state ulp.
    // RK binds original compensation as flux, and output compensation as statistics.
    // All arithmetic and storage remain f32; no f64 equation/stencil emulation.
    let corrected=increment-flux[k].xy;let total=base+corrected;
    statistics[k]=vec4f((total-base)-corrected,0.0,0.0);
    v=vec4f(total,state[k].zw);
  }
  output[k]=v;
}
@compute @workgroup_size(8,8)
fn trial(@builtin(global_invocation_id) id:vec3u){combine(id,false);}
@compute @workgroup_size(8,8)
fn final_stage(@builtin(global_invocation_id) id:vec3u){combine(id,true);}
