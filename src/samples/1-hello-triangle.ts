import { inject, injectable } from "inversify";
import { Scene } from "../core/scene";

@injectable()
export class SampleHelloTriangle {
  public readonly scene: Scene;

  constructor(@inject(Scene) scene: Scene) {
    this.scene = scene;

    const module = scene.gpu.device.createShaderModule({
      label: "our hardcoded red triangle shaders",
      code: /* wgsl */ `
      @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32
      ) -> @builtin(position) vec4f {
        let pos = array(
          vec2f( 0.0,  0.5),  // top center
          vec2f(-0.5, -0.5),  // bottom left
          vec2f( 0.5, -0.5)   // bottom right
        );

        return vec4f(pos[vertexIndex], 0.0, 1.0);
      }

      @fragment fn fs() -> @location(0) vec4f {
        return vec4f(1, 0, 0, 1);
      }
    `,
    });

    const pipeline = scene.gpu.device.createRenderPipeline({
      label: "our hardcoded red triangle pipeline",
      layout: "auto",
      vertex: {
        module,
      },
      fragment: {
        module,
        targets: [{ format: scene.gpu.presentationFormat }],
      },
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
    pass.draw(3); // call our vertex shader 3 times.
    pass.end();

    scene.render({
      buffer: encoder.finish(),
    });
  }
}
