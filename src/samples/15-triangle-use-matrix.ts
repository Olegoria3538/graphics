import { inject, injectable } from "inversify";
import { Scene } from "../core/scene";
import { makeShaderDataDefinitions, makeStructuredView } from "webgpu-utils";
import { mat3 } from "wgpu-matrix";

const CODE = /* wgsl */ `
      struct OurStruct {
        matrix: mat3x3<f32>,
      };

      @group(0) @binding(0) var<uniform> ourStruct: OurStruct;

      @vertex 
      fn vs(
        @builtin(vertex_index) vertexIndex : u32
      ) -> @builtin(position) vec4f {

        let pos = array(
          vec2f(0,  1),  // top center
          vec2f(-1, -1),  // bottom left
          vec2f(1, -1)   // bottom right
        );

        let p = pos[vertexIndex];

        let result = (ourStruct.matrix * vec3f(p, 1)).xy;
    
        return vec4f(result, 0.0, 1.0);
      }

      @fragment 
      fn fs() -> @location(0) vec4f {
        return vec4f(1.0, 0.0, 0.0, 1.0);
      }
    `;

@injectable()
export class TriangleUseMatrix {
  constructor(@inject(Scene) readonly scene: Scene) {}

  public draw({
    rotate,
    scale,
    offset,
  }: {
    rotate: number;
    scale: [number, number];
    offset: { x: number; y: number };
  }) {
    const scene = this.scene;

    let matrix = mat3.identity();
    matrix = mat3.translate(matrix, [offset.x, offset.y]);
    matrix = mat3.rotate(matrix, (rotate * Math.PI) / 180);
    matrix = mat3.scale(matrix, scale);

    const defs = makeShaderDataDefinitions(CODE);
    const ourStruct = makeStructuredView(defs.uniforms.ourStruct);

    const uniformBuffer = scene.gpu.device.createBuffer({
      size: ourStruct.arrayBuffer.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    ourStruct.set({
      matrix: matrix,
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
      buffer: encoder.finish(),
    });
  }
}
