import { inject, injectable } from "inversify";
import { Scene } from "../core/scene";
import { createTextureFromImage } from "webgpu-utils";

const CODE = /* wgsl */ `
    struct VertexInput {
        @location(0) position: vec2f,
        @location(1) texCoord: vec2f,
    };

    struct VertexOutput {
        @builtin(position) position: vec4f,
        @location(0) texCoord: vec2f,
    };

    @vertex
    fn vs_main(input: VertexInput) -> VertexOutput {
        var output: VertexOutput;
        output.position = vec4f(input.position, 0.0, 1.0);
        output.texCoord = input.texCoord;
        return output;
    }

    @group(0) @binding(0) var mySampler: sampler;
    @group(0) @binding(1) var myTexture: texture_2d<f32>;

    @fragment
    fn fs_main(input: VertexOutput) -> @location(0) vec4f {
        return textureSample(myTexture, mySampler, input.texCoord);
    }
`;

@injectable()
export class SimpleTexture {
  constructor(@inject(Scene) readonly scene: Scene) {}

  public async draw() {
    const texture = await createTextureFromImage(
      this.scene.gpu.device,
      "/luna-noch-ozera-pejzazh-priroda-50020.jpeg",
      {
        mips: true,
        flipY: true,
      }
    );

    const sampler = this.scene.gpu.device.createSampler({
      minFilter: "linear",
      magFilter: "linear",
    });

    const pipeline = this.scene.gpu.device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: this.scene.gpu.device.createShaderModule({ code: CODE }),
        entryPoint: "vs_main",
        buffers: [
          {
            arrayStride: 4 * 4,
            attributes: [
              { format: "float32x2", offset: 0, shaderLocation: 0 },
              { format: "float32x2", offset: 8, shaderLocation: 1 },
            ],
          },
        ],
      },
      fragment: {
        module: this.scene.gpu.device.createShaderModule({ code: CODE }),
        entryPoint: "fs_main",
        targets: [{ format: this.scene.gpu.presentationFormat }],
      },
      primitive: { topology: "triangle-list" },
    });

    const bindGroup = this.scene.gpu.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: sampler },
        { binding: 1, resource: texture.createView() },
      ],
    });

    const vertices = new Float32Array([
      -1,
      -1,
      0,
      0, // левый нижний
      1,
      -1,
      1,
      0, // правый нижний
      1,
      1,
      1,
      1, // правый верхний
      -1,
      -1,
      0,
      0, // левый нижний
      1,
      1,
      1,
      1, // правый верхний
      -1,
      1,
      0,
      1, // левый верхний
    ]);

    const vertexBuffer = this.scene.gpu.device.createBuffer({
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.scene.gpu.device.queue.writeBuffer(vertexBuffer, 0, vertices);

    const renderPassDescriptor: GPURenderPassDescriptor = {
      label: "our basic canvas renderPass",
      colorAttachments: [
        {
          view: this.scene.context.getCurrentTexture().createView(),
          clearValue: [1, 1, 1, 1],
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    };

    const encoder = this.scene.gpu.device.createCommandEncoder();
    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.setBindGroup(0, bindGroup);
    pass.draw(6, 1, 0, 0);
    pass.end();

    this.scene.render({ encoder });
  }
}
