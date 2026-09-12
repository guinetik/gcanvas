struct ViewParams {
  size: vec4u, // nr, nz, padded width, mode
  geometry: vec4f, // dr, dz, R, Z
  display: vec4f, // color range, vector overlay, plain palette, slice z
  viewport: vec4f, // render width and height in pixels
};
@group(0) @binding(0) var<uniform> p: ViewParams;
@group(0) @binding(1) var<storage,read> state: array<vec4f>;
@group(0) @binding(2) var<storage,read> velocity: array<vec4f>;
@group(0) @binding(3) var<storage,read_write> profile: array<vec4f>;

fn index(i:i32,j:i32)->u32 { return u32(j+2)*p.size.z+u32(i+2); }
fn sample(q:vec2i)->vec4f { return state[index(q.x,q.y)]; }
fn omega(q:vec2i)->vec3f {
  let r=(f32(q.x)+0.5)*p.geometry.x;
  let a=sample(q).x;
  let ar=(sample(q+vec2i(1,0)).x-sample(q-vec2i(1,0)).x)/(2.0*p.geometry.x);
  let az=(sample(q+vec2i(0,1)).x-sample(q-vec2i(0,1)).x)/(2.0*p.geometry.y);
  return vec3f(-r*az,r*sample(q).y,2.0*a+r*ar);
}
fn scalar(q:vec2i)->f32 {
  let r=(f32(q.x)+0.5)*p.geometry.x;let v=sample(q);
  switch p.size.w {
    case 0u: {return r*r*v.x;}
    case 1u: {return length(omega(q));}
    case 2u: {
      let up=sample(q+vec2i(0,1)).x;let down=sample(q-vec2i(0,1)).x;
      return (up*up-down*down)/(2.0*p.geometry.y);
    }
    case 3u: {return r*r*(v.z+v.w);}
    default: {return v.x;}
  }
}
struct Vertex { @builtin(position) position:vec4f, @location(0) uv:vec2f };
@vertex fn fullscreen(@builtin(vertex_index) i:u32)->Vertex {
  let points=array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));
  var v:Vertex;v.position=vec4f(points[i],0.0,1.0);v.uv=points[i]*0.5+0.5;return v;
}
@fragment fn field(v:Vertex)->@location(0) vec4f {
  // Subtract the center before scaling, so mirrored pixels use identical
  // radial arithmetic even on thin, antialiased streamfunction contours.
  let signedR=(v.position.x-0.5*p.viewport.x)*(2.0*p.geometry.z/p.viewport.x);
  let cell=vec2f(abs(signedR)/p.geometry.x,(1.0-v.position.y/p.viewport.y)*f32(p.size.y))-0.5;
  // Clamp interpolation to interior samples; numerical ghosts are only used
  // by the derivative stencils. Display never extrapolates beyond the walls.
  let f=clamp(cell,vec2f(0.0),vec2f(p.size.xy)-1.0);
  let lo=vec2i(floor(f));let hi=min(lo+1,vec2i(p.size.xy)-1);let t=fract(f);
  let c00=scalar(lo);let c10=scalar(vec2i(hi.x,lo.y));
  let c01=scalar(vec2i(lo.x,hi.y));let c11=scalar(hi);
  let value=mix(mix(c00,c10,t.x),mix(c01,c11,t.x),t.y);
  let normalized=clamp(value/p.display.x,-1.0,1.0);let strength=abs(normalized);
  let base=vec3f(0.019,0.041,0.068);
  let negative=vec3f(0.10,0.42,0.98);let positive=vec3f(1.0,0.39,0.08);
  let tint=select(negative,positive,normalized>=0.0);
  var color=mix(base,tint,pow(strength,0.65));
  color=mix(color,vec3f(1.0,0.89,0.65),smoothstep(0.65,1.0,strength)*0.75);
  if(p.display.z>0.5){color=mix(base,tint,strength);}
  if(p.size.w==3u){
    // Level sets of the computed streamfunction are meridional streamlines.
    let level=value/p.display.x*14.0;let distance=abs(fract(level+0.5)-0.5);
    // Use the bilinear gradient's pixel footprint. Hardware derivative quads
    // can give unequal line coverage on reflected pixels at cell boundaries.
    let gradient=abs(vec2f(mix(c10-c00,c11-c01,t.y),mix(c01-c00,c11-c10,t.x)));
    let footprint=dot(gradient,vec2f(2.0*f32(p.size.x),f32(p.size.y))/p.viewport.xy)*14.0/p.display.x;
    let line=1.0-smoothstep(0.0,max(footprint*1.2,0.015),distance);
    color=mix(base,color,0.22)+line*tint*0.75*smoothstep(0.0,0.02,strength);
  }
  if(p.display.y>0.5){
    let tiled=vec2f(v.uv.x*18.0,v.uv.y*24.0);
    let center=(floor(tiled)+0.5)/vec2f(18.0,24.0);
    let ci=clamp(vec2i(vec2f(abs(2.0*center.x-1.0)*f32(p.size.x),center.y*f32(p.size.y))),vec2i(0),vec2i(p.size.xy)-1);
    let u=velocity[index(ci.x,ci.y)].xy;
    // ur changes sign across the axis; uz does not. Account for cell aspect.
    let direction=vec2f(sign(2.0*center.x-1.0)*u.x/p.geometry.z*18.0,u.y/p.geometry.w*24.0);
    let speed=length(direction);let d=direction/max(speed,1e-20);let offset=fract(tiled)-0.5;
    let along=dot(offset,d);let across=abs(dot(offset,vec2f(-d.y,d.x)));
    let shaft=(1.0-smoothstep(0.015,0.04,across))*step(abs(along),0.25);
    let head=(1.0-smoothstep(0.015,0.04,abs(across-(0.25-along)*0.65)))*step(0.08,along)*step(along,0.25);
    color=mix(color,vec3f(0.78,0.91,1.0),max(shaft,head)*0.65*step(1e-7,speed));
  }
  return vec4f(color,1.0);
}

@compute @workgroup_size(64) fn cross_section(@builtin(global_invocation_id) id:vec3u) {
  let i=i32(id.x);if(id.x>=p.size.x){return;}
  let jf=clamp((p.display.w+p.geometry.w)/p.geometry.y-0.5,0.0,f32(p.size.y)-1.0);
  let j=i32(floor(jf));let next=min(j+1,i32(p.size.y)-1);let t=fract(jf);
  let r=(f32(i)+0.5)*p.geometry.x;
  let a=mix(sample(vec2i(i,j)).x,sample(vec2i(i,next)).x,t);
  let uz=mix(omega(vec2i(i,j)).z,omega(vec2i(i,next)).z,t);
  let u=mix(velocity[index(i,j)].xy,velocity[index(i,next)].xy,t);
  profile[id.x]=vec4f(r*a,uz,length(vec3f(u,r*a)),a);
}
