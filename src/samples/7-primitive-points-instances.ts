import { inject, injectable } from "inversify";
import { Scene } from "../core/scene";
import { FastColor, type ColorInput } from "@ant-design/fast-color";

//использование инстансинга

const CODE = /* wgsl */ `
    struct VertexOutput {
        @builtin(position) position: vec4f,
        @location(0) color: vec4f,
    };

    @vertex 
    fn vs(
        @builtin(vertex_index) vertexIndex: u32,
        @location(0) instanceColor: vec4f,
        @location(1) instancePos: vec2f
    ) -> VertexOutput {
        var output: VertexOutput;
        output.position = vec4f(instancePos, 0.0, 1.0);
        output.color = instanceColor;
        return output;
    }

    @fragment 
    fn fs(input: VertexOutput) -> @location(0) vec4f {
        return input.color;
    }
`;

@injectable()
export class PrimitivePointsInstances {
  private pipeline: GPURenderPipeline;

  constructor(@inject(Scene) readonly scene: Scene) {
    const module = scene.gpu.device.createShaderModule({
      label: "instancing shaders",
      code: CODE,
    });

    this.pipeline = scene.gpu.device.createRenderPipeline({
      label: "instancing pipeline",
      layout: "auto",
      vertex: {
        module,
        entryPoint: "vs",
        buffers: [
          // Первый буфер - данные инстансов (цвет)
          {
            arrayStride: 4 * 4, // 4 float32 (RGBA)
            stepMode: "instance",
            attributes: [
              {
                shaderLocation: 0,
                offset: 0,
                format: "float32x4",
              },
            ],
          },
          // Второй буфер - данные инстансов (позиция)
          {
            arrayStride: 2 * 4, // 2 float32 (XY)
            stepMode: "instance",
            attributes: [
              {
                shaderLocation: 1,
                offset: 0,
                format: "float32x2",
              },
            ],
          },
        ],
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

    // Подготовка данных для инстансов
    const colors = new Float32Array(itemsProp.length * 4);
    const positions = new Float32Array(itemsProp.length * 2);

    itemsProp.forEach((item, index) => {
      const color = new FastColor(item.color);
      const { r, g, b, a } = color.toRgb();

      // Цвет (RGBA)
      colors[index * 4] = r / 255;
      colors[index * 4 + 1] = g / 255;
      colors[index * 4 + 2] = b / 255;
      colors[index * 4 + 3] = a;

      // Позиция (XY)
      positions[index * 2] = item.position[0];
      positions[index * 2 + 1] = item.position[1];
    });

    // Создание буферов для инстансов
    const colorBuffer = device.createBuffer({
      size: colors.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(colorBuffer, 0, colors);

    const positionBuffer = device.createBuffer({
      size: positions.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(positionBuffer, 0, positions);

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

    pass.setVertexBuffer(0, colorBuffer);
    pass.setVertexBuffer(1, positionBuffer);

    pass.draw(1, itemsProp.length); // Рисуем 1 вершину на каждый инстанс
    pass.end();

    scene.render({ encoder });
  }
}
