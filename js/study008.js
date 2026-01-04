/**
 * Study 008 - 3D Logo Extrusion
 *
 * Parses the GCanvas SVG logo path, tesselates it, and extrudes it into 3D.
 *
 * Features:
 * - SVG Path parsing and triangulation
 * - 3D Extrusion (front/back faces + sides)
 * - Wireframe rendering
 * - Mouse rotation
 */

import { gcanvas } from "/gcanvas.es.min.js";

// Hardcoded path data from logo.svg
const LOGO_PATH_1 = "M 57.971 224.292 L 57.971 203.374 L 57.971 194.861 L 75.109 194.861 L 75.109 188.769 L 63.16 188.769 L 63.16 174.743 L 57.971 174.743 L 57.971 189.041 L 57.971 194.861 L 32.9 194.861 L 32.9 203.773 L 50.377 203.773 L 50.377 224.292 L 57.971 224.292 Z";
const LOGO_PATH_2 = "M 79.717 238.319 L 79.717 224.02 L 79.717 218.2 L 104.788 218.2 L 104.788 209.287 L 87.31 209.287 L 87.31 188.769 L 79.717 188.769 L 79.717 209.686 L 79.717 218.2 L 62.579 218.2 L 62.579 224.293 L 74.526 224.293 L 74.526 238.319 L 79.717 238.319 Z";

// Configuration
const CONFIG = {
  extrusionDepth: 25,
  scale: 12,
  fov: 600,
  // Change baseColor to HSL object for easier lighting calcs
  baseColor: { h: 120, s: 100, l: 50 },
  bgColor: "#000000",
  faceOpacity: 0.8, // More solid
};

/**
 * Minimal Vector class
 */
class Vec3 {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  
  // Add some helper methods
  sub(v) { return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z); }
  cross(v) { return new Vec3(this.y * v.z - this.z * v.y, this.z * v.x - this.x * v.z, this.x * v.y - this.y * v.x); }
  normalize() {
    const len = Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z);
    return new Vec3(this.x/len, this.y/len, this.z/len);
  }
  dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
}

/**
 * 3D Logo Object
 */
class Logo3D {
  constructor(game) {
    this.game = game;
    this.rotation = { x: 0, y: 0 };
    this.targetRotation = { x: 0.2, y: 0.2 };
    this.autoRotate = true;
    
    // Interaction state
    this.energy = 0;
    this.baseScale = CONFIG.scale;
    
    this.vertices = [];
    this.edges = []; // array of [index1, index2]
    this.faces = []; // array of { indices: number[], color: string, z: number }
    
    this.buildMesh();
  }
  
  /**
   * Simple parser for "M x y L x y ... Z" style paths (polygons)
   */
  parsePath(pathStr) {
    const commands = pathStr.split(" ");
    const points = [];
    let i = 0;
    while(i < commands.length) {
      const cmd = commands[i];
      if (cmd === "M" || cmd === "L") {
        const x = parseFloat(commands[i+1]);
        const y = parseFloat(commands[i+2]);
        points.push({x, y});
        i += 3;
      } else if (cmd === "Z") {
        i += 1;
      } else {
        // Just skip unknown
        i += 1;
      }
    }
    return points;
  }
  
  buildMesh() {
    this.vertices = [];
    this.edges = [];
    this.faces = [];
    
    // Center the geometry
    // Calculate bounds roughly
    const allPoints = [...this.parsePath(LOGO_PATH_1), ...this.parsePath(LOGO_PATH_2)];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    for(const p of allPoints) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    const shapes = [LOGO_PATH_1, LOGO_PATH_2];
    
    // Precompute normals in object space
    // Front face normal: [0, 0, -1] (facing camera initially)
    // Back face normal: [0, 0, 1]
    
    shapes.forEach((path, shapeIdx) => {
      const points = this.parsePath(path);
      const startIndex = this.vertices.length;
      
      const frontIndices = [];
      const backIndices = [];
      
      // Add Front Face vertices
      points.forEach((p, i) => {
        this.vertices.push(new Vec3(
          (p.x - centerX) * CONFIG.scale,
          (p.y - centerY) * CONFIG.scale,
          -CONFIG.extrusionDepth * CONFIG.scale
        ));
        frontIndices.push(startIndex + i);
      });
      
      const frontCount = points.length;
      const backStartIndex = this.vertices.length;
      
      // Add Back Face vertices
      points.forEach((p, i) => {
        this.vertices.push(new Vec3(
          (p.x - centerX) * CONFIG.scale,
          (p.y - centerY) * CONFIG.scale,
          CONFIG.extrusionDepth * CONFIG.scale
        ));
        backIndices.push(backStartIndex + i);
      });
      
      // Create Edges and Side Faces
      for (let i = 0; i < frontCount; i++) {
        const next = (i + 1) % frontCount;
        
        // Front face edges
        this.edges.push([startIndex + i, startIndex + next]);
        
        // Back face edges
        this.edges.push([backStartIndex + i, backStartIndex + next]);
        
        // Connecting edges (sides)
        this.edges.push([startIndex + i, backStartIndex + i]);
        
        // Side Faces (Quads)
        // Vertices: Front[i], Front[next], Back[next], Back[i]
        // Calculate normal for this side
        // v1 = Front[i], v2 = Front[next], v3 = Back[next]
        // U = v2 - v1, V = v3 - v1
        const idx1 = startIndex + i;
        const idx2 = startIndex + next;
        const idx3 = backStartIndex + next;
        const idx4 = backStartIndex + i;
        
        // We defer normal calculation to render time or store just indices?
        // Storing computed normal now is better as vertices are static in object space
        const v1 = this.vertices[idx1];
        const v2 = this.vertices[idx2];
        const v3 = this.vertices[idx3];
        
        const U = v2.sub(v1);
        const V = v3.sub(v1);
        const normal = U.cross(V).normalize();
        
        this.faces.push({
          indices: [idx1, idx2, idx3, idx4],
          type: 'side',
          normal: normal
        });
      }
      
      // Store Face definitions
      this.faces.push({ 
        indices: frontIndices, 
        type: 'front', 
        normal: new Vec3(0, 0, -1) 
      });
      this.faces.push({ 
        indices: backIndices, 
        type: 'back', 
        normal: new Vec3(0, 0, 1) 
      });
    });
  }
  
  update(dt) {
    this.rotation.x += (this.targetRotation.x - this.rotation.x) * 0.1;
    this.rotation.y += (this.targetRotation.y - this.rotation.y) * 0.1;
    
    if (this.autoRotate) {
      this.targetRotation.y += dt * 0.5;
    }
    
    // Decay energy
    this.energy *= 0.9;
    
    // Pulse scale based on energy
    CONFIG.scale = this.baseScale + this.energy * 2;
  }
  
  render(ctx, width, height) {
    const cx = width / 2;
    const cy = height / 2;
    
    ctx.fillStyle = CONFIG.bgColor;
    ctx.fillRect(0, 0, width, height);
    
    const cosX = Math.cos(this.rotation.x);
    const sinX = Math.sin(this.rotation.x);
    const cosY = Math.cos(this.rotation.y);
    const sinY = Math.sin(this.rotation.y);
    
    const projected = [];
    
    // Transform Vertices
    for(let i=0; i<this.vertices.length; i++) {
      const v = this.vertices[i];
      
      // Rotate Y
      let x1 = v.x * cosY - v.z * sinY;
      let z1 = v.z * cosY + v.x * sinY;
      let y1 = v.y;
      
      // Rotate X
      let y2 = y1 * cosX - z1 * sinX;
      let z2 = z1 * cosX + y1 * sinX;
      let x2 = x1;
      
      // Project
      const scale = CONFIG.fov / (CONFIG.fov + z2 + 200);
      const px = x2 * scale + cx;
      const py = y2 * scale + cy;
      
      projected.push({x: px, y: py, z: z2, scale});
    }
    
    // Calculate Face Depths for Sorting
    const renderFaces = this.faces.map(face => {
      let avgZ = 0;
      face.indices.forEach(idx => {
        avgZ += projected[idx].z;
      });
      avgZ /= face.indices.length;
      return { ...face, avgZ };
    });
    
    // Sort faces: furthest first (Painter's algorithm)
    renderFaces.sort((a, b) => b.avgZ - a.avgZ);
    
    // Light source vector (normalized)
    // Light coming from top-left-front
    const lightDir = new Vec3(-0.5, -0.5, -1).normalize();
    
    // Render Faces (Fill)
    renderFaces.forEach(face => {
      // Rotate normal
      const n = face.normal;
      // Rotate Y
      let nx1 = n.x * cosY - n.z * sinY;
      let nz1 = n.z * cosY + n.x * sinY;
      let ny1 = n.y;
      
      // Rotate X
      let ny2 = ny1 * cosX - nz1 * sinX;
      let nz2 = nz1 * cosX + ny1 * sinX;
      let nx2 = nx1;
      
      const rotatedNormal = new Vec3(nx2, ny2, nz2);
      
      // Calculate lighting intensity
      // Dot product gives cosine of angle. 1.0 = facing light, -1.0 = away
      // We clamp to [0, 1] or use absolute? Usually clamp for directional.
      // But let's add some ambient.
      const dot = rotatedNormal.dot(lightDir);
      
      // Simple lighting model: Ambient + Diffuse
      // Ambient 0.3, Diffuse 0.7
      // Map dot [-1, 1] to [0, 1] roughly for visibility
      // Actually standard is max(0, dot)
      const intensity = Math.max(0, dot);
      
      // Vary lightness based on intensity
      // Base L is 50. Range 20-80
      const l = 20 + intensity * 60;
      
      ctx.fillStyle = `hsla(${CONFIG.baseColor.h}, ${CONFIG.baseColor.s}%, ${l}%, ${CONFIG.faceOpacity})`;
      
      ctx.beginPath();
      const first = projected[face.indices[0]];
      ctx.moveTo(first.x, first.y);
      for(let i=1; i<face.indices.length; i++) {
        const p = projected[face.indices[i]];
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.fill();
    });
    
    ctx.globalAlpha = 1.0;
    
    // Draw Edges with Depth Fading
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    
    for(const edge of this.edges) {
      const p1 = projected[edge[0]];
      const p2 = projected[edge[1]];
      
      // Culling
      if(p1.z < -CONFIG.fov + 10) continue;
      
      // Depth color
      const avgZ = (p1.z + p2.z) / 2;
      // Map Z (-600 to 600) to opacity
      // Close (negative z in our coord system? No, z increases away usually, but here z2 is depth)
      // Standard: z positive is into screen? 
      // In this projection: scale = fov / (fov + z). So larger Z = further away.
      
      const depthAlpha = Math.max(0.1, Math.min(1, 1 - (avgZ / 800)));
      
      ctx.strokeStyle = `rgba(0, 255, 0, ${depthAlpha})`;
      
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    
    // Draw vertices (dots)
    ctx.fillStyle = "#fff";
    for(const p of projected) {
        if(p.z < -CONFIG.fov + 10) continue;
        const size = Math.max(1, 3 * p.scale);
        
        // Dim dots too
        const depthAlpha = Math.max(0.1, Math.min(1, 1 - (p.z / 800)));
        ctx.globalAlpha = depthAlpha;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI*2);
        ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  }
}

// Initialize
window.addEventListener("load", () => {
  const canvas = document.getElementById("game");
  if (!canvas) return;

  const game = gcanvas({ canvas, bg: CONFIG.bgColor, fluid: true });
  const gameInstance = game.game;
  
  const logo = new Logo3D(gameInstance);

  // Render loop
  gameInstance.clear = function() {
    logo.render(this.ctx, this.width, this.height);
  };

  game.on("update", (dt) => {
    logo.update(dt);
  });
  
  // Interaction
  let isDragging = false;
  let lastX = 0, lastY = 0;
  
  gameInstance.events.on("mousedown", (e) => {
    isDragging = true;
    lastX = e.x;
    lastY = e.y;
    logo.autoRotate = false;
  });
  
  gameInstance.events.on("mouseup", () => {
    isDragging = false;
    setTimeout(() => { logo.autoRotate = true; }, 1000);
  });
  
  gameInstance.events.on("mousemove", (e) => {
    if(isDragging) {
      const dx = (e.x - lastX) * 0.01;
      const dy = (e.y - lastY) * 0.01;
      logo.targetRotation.y += dx;
      logo.targetRotation.x += dy;
      lastX = e.x;
      lastY = e.y;
    }
  });

  game.start();
});
