struct Params {
  size: vec4u,       // nr, nz, ghosted width, ghosted height
  geometry: vec4f,   // dr, dz, R, Z
  physics: vec4f,    // nu, dt, advection safety, diffusion safety
  control: vec4u,    // wall mode, unused
}
@group(0) @binding(0) var<uniform> p: Params;
@group(0) @binding(1) var<storage, read> state: array<vec4f>; // a, chi, phi high, phi correction
@group(0) @binding(2) var<storage, read_write> output: array<vec4f>;
@group(0) @binding(3) var<storage, read> original: array<vec4f>;
@group(0) @binding(4) var<storage, read_write> flux: array<vec4f>; // corner psi, Fr, Fz
@group(0) @binding(5) var<storage, read_write> velocity: array<vec4f>;
@group(0) @binding(6) var<storage, read> exterior: array<vec4f>; // boundary a, chi, phi high/correction
@group(0) @binding(7) var<storage, read> source: array<vec4f>; // external sources, corner psi in w; or RK RHS
@group(0) @binding(8) var<storage, read_write> statistics: array<vec4f>;

fn index(i:i32,j:i32)->u32 { return u32(j+2)*p.size.z+u32(i+2); }
fn radius(i:i32)->f32 { return (f32(i)+0.5)*p.geometry.x; }
fn interior(i:i32,j:i32)->bool {return i>=0 && j>=0 && i<i32(p.size.x) && j<i32(p.size.y);}
fn finite(v:vec4f)->bool {return all((bitcast<vec4u>(v)&vec4u(0x7f800000u))!=vec4u(0x7f800000u));}
// East, west, north, south coefficients, followed by positive diagonal.
struct Row { off:vec4f, diagonal:f32, wallPenalty:f32 }
fn row(i:i32,j:i32,wall:bool)->Row {
  let h=1.0/(p.geometry.x*p.geometry.x);let v=1.0/(p.geometry.y*p.geometry.y);
  let q=3.0/(2.0*radius(i)*p.geometry.x);
  var c=Row(vec4f(h+q,h-q,v,v),2.0*h+2.0*v,0.0);
  if(i==0){c=Row(vec4f(4.0*h,0.0,v,v),4.0*h+2.0*v,0.0);}
  if(wall){
    if(i==i32(p.size.x)-1){c.wallPenalty+=8.0*c.off.x/3.0;c.diagonal+=2.0*c.off.x;c.off.y+=c.off.x/3.0;c.off.x=0.0;}
    if(j==0){c.wallPenalty+=8.0*c.off.w/3.0;c.diagonal+=2.0*c.off.w;c.off.z+=c.off.w/3.0;c.off.w=0.0;}
    if(j==i32(p.size.y)-1){c.wallPenalty+=8.0*c.off.z/3.0;c.diagonal+=2.0*c.off.z;c.off.w+=c.off.z/3.0;c.off.z=0.0;}
  }
  return c;
}
// Difference form avoids subtracting large O(phi/h²) terms in f32.
fn rowLaplacian(k:u32,c:Row)->vec4f {
  let v=state[k];
  return c.off.x*(state[k+1u]-v)+c.off.y*(state[k-1u]-v)+
    c.off.z*(state[k+p.size.z]-v)+c.off.w*(state[k-p.size.z]-v)-c.wallPenalty*v;
}
fn laplacian(i:i32,j:i32)->vec4f {
  let k=index(i,j);return rowLaplacian(k,row(i,j,false));
}
fn sources(k:u32)->vec4f {
  let northPhi=state[k+p.size.z];let southPhi=state[k-p.size.z];
  let strain=((northPhi.z-southPhi.z)+(northPhi.w-southPhi.w))/p.geometry.y;
  let north=state[k+p.size.z].x;let south=state[k-p.size.z].x;
  let swirl=(north*north-south*south)/(2.0*p.geometry.y);
  return vec4f(state[k].x*strain+source[k].x,swirl+source[k].y,strain,swirl);
}
