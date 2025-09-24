import { inject, injectable } from "inversify";
import { Scene } from "../core/scene";

//inter stage переменные это переменные внутри шейдера
//нужны для того, чтобы передавать данные из одного шейдера в другой, например данные из вершинного шейдера в фрагментный

@injectable()
export class InterStageTriangle {
  public readonly scene: Scene;

  constructor(@inject(Scene) scene: Scene) {
    this.scene = scene;

    const module = scene.gpu.device.createShaderModule({
      label: "inter stage triangle shaders",
      code: /* wgsl */ `
      struct OurVertexShaderOutput {
        @builtin(position) position: vec4f,
        @location(0) color: vec4f,
      };

      @vertex 
      fn vs(
        @builtin(vertex_index) vertexIndex : u32
      ) -> OurVertexShaderOutput {
        var vsOutput: OurVertexShaderOutput;

        let pos = array(
          vec2f( 0.0,  0.5),  // top center
          vec2f(-0.5, -0.5),  // bottom left
          vec2f( 0.5, -0.5)   // bottom right
        );

        var color = array(
          vec4f(1, 0, 0, 1), // red
          vec4f(0, 1, 0, 1), // green
          vec4f(0, 0, 1, 1), // blue
        );

        vsOutput.position = vec4f(pos[vertexIndex], 0.0, 1.0);
        vsOutput.color = color[vertexIndex];

        return vsOutput;
      }

      @fragment 
      fn fs(@location(0) color: vec4f) -> @location(0) vec4f {
        return color;
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
