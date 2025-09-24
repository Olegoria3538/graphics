import { inject, injectable } from "inversify";
import { Scene } from "../core/scene";
import { FastColor, type ColorInput } from "@ant-design/fast-color";

//использование storage буфера

const CODE = /* wgsl */ `
    struct InstanceData {
        color: vec4f,
        pos: vec2f
    };

    @group(0) @binding(0) var<storage, read> instances: array<InstanceData>;

    struct VertexOutput {
        @builtin(position) position: vec4f,
        @location(0) color: vec4f,
    };

    @vertex 
    fn vs(
        @builtin(vertex_index) vertexIndex: u32,
        @builtin(instance_index) instanceIndex: u32
    ) -> VertexOutput {
        let instance = instances[instanceIndex];
        var output: VertexOutput;
        output.position = vec4f(instance.pos, 0.0, 1.0);
        output.color = instance.color;
        return output;
    }

    @fragment 
    fn fs(input: VertexOutput) -> @location(0) vec4f {
        return input.color;
    }
`;

@injectable()
export class PrimitivePointsStorageBuffer {
  private pipeline: GPURenderPipeline;
  private bindGroupLayout: GPUBindGroupLayout;

  constructor(@inject(Scene) readonly scene: Scene) {
    const module = scene.gpu.device.createShaderModule({
      label: "instancing shaders",
      code: CODE,
    });

    // Create bind group layout
    this.bindGroupLayout = scene.gpu.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "read-only-storage" },
        },
      ],
    });

    const pipelineLayout = scene.gpu.device.createPipelineLayout({
      bindGroupLayouts: [this.bindGroupLayout],
    });

    this.pipeline = scene.gpu.device.createRenderPipeline({
      label: "instancing pipeline",
      layout: pipelineLayout,
      vertex: {
        module,
        entryPoint: "vs",
      },
      fragment: {
        module,
        entryPoint: "fs",
        targets: [
          {
            format: scene.gpu.presentationFormat,
            blend: {
              color: {
                srcFactor: "src-alpha",
                dstFactor: "one-minus-src-alpha",
                operation: "add",
              },
              alpha: {
                srcFactor: "one",
                dstFactor: "one-minus-src-alpha",
                operation: "add",
              },
            },
          },
        ],
      },
      primitive: {
        topology: "point-list",
      },
    });
  }

  public draw({
    items: itemsProp,
  }: {
    items: {
      color: ColorInput;
      position: [number, number];
    }[];
  }) {
    const scene = this.scene;
    const device = scene.gpu.device;

    // Prepare instance data
    const instanceData = new Float32Array(itemsProp.length * 8); // 6 floats per instance (vec4 color + vec2 position)

    itemsProp.forEach((item, index) => {
      const color = new FastColor(item.color);
      const { r, g, b, a } = color.toRgb();
      const baseIndex = index * 8;

      // Color (RGBA)
      instanceData[baseIndex] = r / 255;
      instanceData[baseIndex + 1] = g / 255;
      instanceData[baseIndex + 2] = b / 255;
      instanceData[baseIndex + 3] = a;

      // Position (XY)
      instanceData[baseIndex + 4] = item.position[0];
      instanceData[baseIndex + 5] = item.position[1];
    });

    // Create instance buffer
    const instanceBuffer = device.createBuffer({
      size: instanceData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });

    new Float32Array(instanceBuffer.getMappedRange()).set(instanceData);
    instanceBuffer.unmap();

    // Create bind group
    const bindGroup = device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: instanceBuffer },
        },
      ],
    });

    const renderPassDescriptor: GPURenderPassDescriptor = {
      label: "instancing render pass",
      colorAttachments: [
        {
          view: scene.context.getCurrentTexture().createView(),
          clearValue: [1, 1, 1, 1],
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    };

    const encoder = device.createCommandEncoder({
      label: "instancing encoder",
    });

    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(1, itemsProp.length);
    pass.end();

    scene.render({
      buffer: encoder.finish(),
    });

    // Clean up
    instanceBuffer.destroy();
  }
}
