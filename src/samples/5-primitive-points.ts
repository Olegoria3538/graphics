import { inject, injectable } from "inversify";
import { Scene } from "../core/scene";
import { makeShaderDataDefinitions, makeStructuredView } from "webgpu-utils";
import { FastColor, type ColorInput } from "@ant-design/fast-color";

//примитивным точкам нельзя задать размер

const CODE = /* wgsl */ `
      struct OurStruct {
        color: vec4f,
        pos: vec2f
      };

      @group(0) @binding(0) var<uniform> ourStruct: OurStruct;

      @vertex 
      fn vs(
        @builtin(vertex_index) vertexIndex : u32
      ) -> @builtin(position) vec4f {

        return vec4f(ourStruct.pos, 0.0, 1.0);
      }

      @fragment 
      fn fs() -> @location(0) vec4f {
        return ourStruct.color;
      }
    `;

@injectable()
export class PrimitivePoints {
  constructor(@inject(Scene) readonly scene: Scene) {}

  public draw({
    items: itemsProp,
  }: {
    items: {
      color: ColorInput;
      position: [number, number];
    }[];
  }) {
    const scene = this.scene;

    const defs = makeShaderDataDefinitions(CODE);
    const ourStruct = makeStructuredView(defs.uniforms.ourStruct);

    const module = scene.gpu.device.createShaderModule({
      label: "uniform triangle shaders",
      code: CODE,
    });

    const pipeline = scene.gpu.device.createRenderPipeline({
      label: "our hardcoded red triangle pipeline",
      layout: "auto",
      vertex: {
        module,
      },
      fragment: {
        module,
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

    const items = itemsProp.map(({ color, position }) => {
      const uniformBuffer = scene.gpu.device.createBuffer({
        size: ourStruct.arrayBuffer.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      let colorRgb = [] as number[];

      {
        const _color = new FastColor(color);
        const { r, g, b, a } = _color.toRgb();
        colorRgb = [r / 255, g / 255, b / 255, a];
      }

      ourStruct.set({ color: colorRgb });
      ourStruct.set({ pos: position });

      scene.gpu.device.queue.writeBuffer(
        uniformBuffer,
        0,
        ourStruct.arrayBuffer
      );

      const bindGroup = scene.gpu.device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
      });

      return { uniformBuffer, bindGroup };
    });

    const renderPassDescriptor: GPURenderPassDescriptor = {
      label: "our basic canvas renderPass",
      colorAttachments: [
        {
          view: scene.context.getCurrentTexture().createView(),
          clearValue: [1, 1, 1, 1],
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    };

    const encoder = scene.gpu.device.createCommandEncoder({
      label: "our encoder",
    });

    // make a render pass encoder to encode render specific commands
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);

    items.forEach(({ bindGroup }) => {
      pass.setBindGroup(0, bindGroup);
      pass.draw(1);
    });

    pass.end();

    scene.render({
      buffer: encoder.finish(),
    });
  }
}
