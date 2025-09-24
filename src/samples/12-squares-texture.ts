import { inject, injectable } from "inversify";
import { Scene } from "../core/scene";
import {
  createTextureFromImage,
  makeShaderDataDefinitions,
  makeStructuredView,
} from "webgpu-utils";

const CODE = /* wgsl */ `
      struct OurStruct {
        scale: vec2f,
        offset: vec2f
      };


      struct VertexOutput {
          @builtin(position) position: vec4f,
          @location(0) texCoord: vec2f,
      };

      @group(0) @binding(0) var<uniform> ourStruct: OurStruct;
      @group(0) @binding(1) var mySampler: sampler;
      @group(0) @binding(2) var myTexture: texture_2d<f32>;
      
      @vertex 
      fn vs(
        @builtin(vertex_index) vertexIndex : u32
      ) -> VertexOutput {
        var output: VertexOutput;

        let pos = array(
          vec2f(-1, -1),
          vec2f( 1, -1),
          vec2f(-1,  1),
          vec2f(-1,  1),
          vec2f( 1, -1),
          vec2f( 1,  1),
        );

        let tex = array(
          vec2f(0.0, 0.0),
          vec2f(1.0, 0.0),
          vec2f(0.0, 1.0),
          vec2f(0.0, 1.0),
          vec2f(1.0, 0.0),
          vec2f(1.0, 1.0),
        );
        

        output.position = vec4f(pos[vertexIndex] * ourStruct.scale + ourStruct.offset, 0.0, 1.0);
        output.texCoord = tex[vertexIndex];

        return output;
      }



      @fragment 
      fn fs(input: VertexOutput) -> @location(0) vec4f {
        return textureSample(myTexture, mySampler, input.texCoord);
      }
    `;

@injectable()
export class SquaresTextures {
  private textures = new Map<string, GPUTexture>();

  constructor(@inject(Scene) readonly scene: Scene) {}

  public async draw({
    items: itemsProp,
  }: {
    items: {
      scale: number;
      offset: { x: number; y: number };
      textureUrl: string;
    }[];
  }) {
    const scene = this.scene;

    const defs = makeShaderDataDefinitions(CODE);
    const ourStruct = makeStructuredView(defs.uniforms.ourStruct);

    const module = scene.gpu.device.createShaderModule({
      label: "uniform triangle shaders",
      code: CODE,
    });

    const sampler = this.scene.gpu.device.createSampler({
      minFilter: "linear",
      magFilter: "linear",
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

    const itemsPromises = itemsProp.map(
      async ({ scale, offset, textureUrl }) => {
        const hasTexture = this.textures.has(textureUrl);

        const texture = hasTexture
          ? this.textures.get(textureUrl)!
          : await createTextureFromImage(this.scene.gpu.device, textureUrl, {
              mips: true,
              flipY: true,
            });

        if (!hasTexture) {
          this.textures.set(textureUrl, texture);
        }

        const uniformBuffer = scene.gpu.device.createBuffer({
          size: ourStruct.arrayBuffer.byteLength,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        ourStruct.set({ scale: [scale, scale], offset: [offset.x, offset.y] });

        scene.gpu.device.queue.writeBuffer(
          uniformBuffer,
          0,
          ourStruct.arrayBuffer
        );

        const bindGroup = scene.gpu.device.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: uniformBuffer } },
            { binding: 1, resource: sampler },
            { binding: 2, resource: texture.createView() },
          ],
        });

        return { uniformBuffer, bindGroup };
      }
    );

    const items = await Promise.all(itemsPromises);

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

    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);

    items.forEach(({ bindGroup }) => {
      pass.setBindGroup(0, bindGroup);
      pass.draw(6);
    });

    pass.end();

    scene.render({
      buffer: encoder.finish(),
    });
  }
}
