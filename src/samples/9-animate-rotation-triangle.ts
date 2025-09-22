import { inject, injectable } from "inversify";
import { Scene } from "../core/scene";
import { makeShaderDataDefinitions, makeStructuredView } from "webgpu-utils";
import { FastColor, type ColorInput } from "@ant-design/fast-color";

//uniform это механизм, который позволяет передавать данные в шейдеры из js

const CODE = /* wgsl */ `
      struct OurStruct {
        color: vec4f,
        scale: vec2f,
        offset: vec2f,
        angle: f32
      };

      @group(0) @binding(0) var<uniform> ourStruct: OurStruct;

      @vertex 
      fn vs(
        @builtin(vertex_index) vertexIndex : u32
      ) -> @builtin(position) vec4f {

        let pos = array(
          vec2f( 0.0,  0.5),  // top center
          vec2f(-0.5, -0.5),  // bottom left
          vec2f( 0.5, -0.5)   // bottom right
        );

        let cosA = cos(ourStruct.angle);
        let sinA = sin(ourStruct.angle);
        let rotationMatrix = mat2x2<f32>(
            cosA, -sinA,
            sinA,  cosA
        );
    

        return vec4f(rotationMatrix * pos[vertexIndex] * ourStruct.scale + ourStruct.offset, 0.0, 1.0);
      }

      @fragment 
      fn fs() -> @location(0) vec4f {
        return ourStruct.color;
      }
    `;

@injectable()
export class AnimateRotationTriangle {
  constructor(@inject(Scene) readonly scene: Scene) {}

  public draw({
    color,
    scale,
    offset,
    rotation,
  }: {
    color: ColorInput;
    scale: number;
    offset: { x: number; y: number };
    rotation: number;
  }) {
    const scene = this.scene;

    const defs = makeShaderDataDefinitions(CODE);
    const ourStruct = makeStructuredView(defs.uniforms.ourStruct);

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

    ourStruct.set({
      color: colorRgb,
      scale: [scale, scale],
      offset: [offset.x, offset.y],
      angle: (rotation * Math.PI) / 180,
    });

    scene.gpu.device.queue.writeBuffer(uniformBuffer, 0, ourStruct.arrayBuffer);

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
    });

    const bindGroup = scene.gpu.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
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
    pass.setBindGroup(0, bindGroup);
    pass.draw(3); // call our vertex shader 3 times.
    pass.end();

    scene.render({
      encoder,
    });
  }
}
