import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/index.js", () => ({
  Game: class {}, Gesture: {}, Screen: {}, Attractors: {}, Keys: {}, Tweenetik: {}, Easing: {},
}));
import { Attractor3DDemo } from "../../demos/js/attractor-3d-demo.js";
import { WebGPUAttractorPipeline } from "../../src/webgpu/webgpu-attractor-pipeline.js";

function scene(capacity = 10) {
  return {
    config: { visual: { maxSpeed: 10 }, camera: { perspective: 800 } },
    camera: { project: vi.fn((x, y, z) => ({ x, y, z, scale: z < -800 ? -1 : 1 })) },
    attractorPipeline: { maxSegments: capacity },
    particles: [{ flowPhase: 0.25, blinkIntensity: 0, trail: [
      { x: 0, y: 0, z: 0, speed: 2 },
      { x: 1, y: 2, z: 3, speed: 4 },
      { x: 3, y: 4, z: 5, speed: 6 },
    ] }],
    zoom: 2, segments: [], _segmentPool: [],
  };
}

describe("attractor segment preparation", () => {
  it("projects each point once and preserves connected screen-space endpoints", () => {
    const demo = scene();
    expect(Attractor3DDemo.prototype.collectSegments.call(demo, 100, 200)).toBe(2);
    expect(demo.camera.project).toHaveBeenCalledTimes(3);
    expect(demo.segments[0]).toMatchObject({ x1: 100, y1: 200, x2: 102, y2: 204, speedNorm: 0.4 });
    expect(demo.segments[1].x1).toBe(demo.segments[0].x2);
    expect(demo.segments[1].y1).toBe(demo.segments[0].y2);
    expect(demo.segments[0].segIdx - demo.segments[0].age).toBeCloseTo(0.25);
  });

  it("reuses records, respects GPU capacity, and clears stale segments after restart", () => {
    const demo = scene(1);
    const collect = () => Attractor3DDemo.prototype.collectSegments.call(demo, 0, 0);
    expect(collect()).toBe(1);
    const record = demo.segments[0];
    demo.zoom = 3;
    collect();
    expect(demo.segments[0]).toBe(record);
    expect(record.x2).toBe(3);
    demo.particles = [];
    expect(collect()).toBe(0);
    expect(demo.segments).toHaveLength(0);
  });

  it("does not connect across a clipped point", () => {
    const demo = scene();
    demo.particles[0].trail[1].z = -900;
    expect(Attractor3DDemo.prototype.collectSegments.call(demo, 0, 0)).toBe(0);
  });
});

it("keeps horizontal and vertical WebGPU bloom uniforms independent until submission", () => {
  const pass = { setPipeline: vi.fn(), setBindGroup: vi.fn(), draw: vi.fn(), end: vi.fn() };
  const pipeline = {
    brightRT: { width: 400, height: 300, view: {} },
    blurPingRT: { view: {}, colorAttachment: vi.fn() },
    blurPongRT: { view: {}, colorAttachment: vi.fn() },
    bloomConfig: { passes: 2, radius: 1.8 },
    blurUniformBuffer: {}, blurVerticalUniformBuffer: {},
    device: { queue: { writeBuffer: vi.fn() }, createBindGroup: vi.fn(x => x) },
    _encoder: { beginRenderPass: vi.fn(() => pass) },
    bindGroupLayouts: { texturePass: {} }, pipelines: { blur: {} }, linearSampler: {},
  };
  WebGPUAttractorPipeline.prototype._renderBlur.call(pipeline);
  const groups = pipeline.device.createBindGroup.mock.calls.map(([group]) => group);
  expect(groups[0].entries[0].resource.buffer).not.toBe(groups[1].entries[0].resource.buffer);
  expect(groups[0].entries[0].resource.buffer).toBe(pipeline.blurUniformBuffer);
  expect(groups[1].entries[0].resource.buffer).toBe(pipeline.blurVerticalUniformBuffer);
  expect(pipeline.device.queue.writeBuffer.mock.calls[0][2][0]).toBeCloseTo(1 / 400);
  expect(pipeline.device.queue.writeBuffer.mock.calls[1][2][1]).toBeCloseTo(1 / 300);
});
