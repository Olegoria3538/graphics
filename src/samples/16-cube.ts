import { inject, injectable } from "inversify";
import { Scene } from "../core/scene";
import { mat4, vec3 } from "wgpu-matrix";
import { makeShaderDataDefinitions, makeStructuredView } from "webgpu-utils";

const CODE = /* wgsl */ `
      struct VertexInput {
        @location(0) position: vec3f,
        @location(1) color: vec3f
      };

      struct VertexOutput {
        @builtin(position) position: vec4f,
        @location(0) color: vec3f
      };

      struct OurStruct {
        matrix: mat4x4<f32>,
      };

      @group(0) @binding(0) var<uniform> ourStruct: OurStruct;

      @vertex
      fn vs(input: VertexInput) -> VertexOutput {
        var output: VertexOutput;
        output.position = ourStruct.matrix * vec4f(input.position, 1.0);
        output.color = input.color;
        return output;
      }

      @fragment
      fn fs(input: VertexOutput) -> @location(0) vec4f {
        return vec4f(input.color, 1.0);
      }
    `;

@injectable()
export class Cube {
  constructor(@inject(Scene) readonly scene: Scene) {}

  public draw({
    rotate,
    scale,
    offset,
  }: {
    rotate: number;
    scale: [number, number, number];
    offset: [number, number, number];
  }) {
    const scene = this.scene;

    const projection = mat4.perspective(
      (60 * Math.PI) / 180, // поле зрения 60 градусов
      1, // соотношение сторон
      0.1, // ближняя плоскость
      100 // дальняя плоскость
    );

    // Камера смотрит на куб с расстояния 5 единиц
    const view = mat4.lookAt(
      [0, 0, 2], // позиция камеры
      [0, 0, 0], // точка, на которую смотрим
      [0, 1, 0] // вектор "вверх"
    );

    let model = mat4.identity();
    model = mat4.scale(model, scale);
    model = mat4.rotate(model, vec3.create(1, 1, 1), (rotate * Math.PI) / 180);
    model = mat4.translate(model, offset);

    //проекция * вид * модель
    let matrix = mat4.multiply(projection, view);
    matrix = mat4.multiply(matrix, model);

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

    // Создаем текстуру для глубины
    const depthTexture = scene.gpu.device.createTexture({
      size: [scene.canvas.width, scene.canvas.height],
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const pipeline = scene.gpu.device.createRenderPipeline({
      label: "our hardcoded red triangle pipeline",
      layout: "auto",
      vertex: {
        module,
        buffers: [
          {
            arrayStride: 24, // 6 * 4 байта (общий размер одной вершины)
            attributes: [
              {
                format: "float32x3", // Позиция (3 float)
                offset: 0,
                shaderLocation: 0,
              },
              {
                format: "float32x3", // Цвет (3 float)
                offset: 12, // 3 * 4 байта
                shaderLocation: 1,
              },
            ],
          },
        ],
      },
      fragment: {
        module,
        targets: [
          {
            format: scene.gpu.presentationFormat,
          },
        ],
      },
      // Добавляем конфигурацию глубины
      depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: true,
        depthCompare: "less",
      },
    });

    const bindGroup = scene.gpu.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
    });

    const vertexBuffer = this.scene.gpu.device.createBuffer({
      size: CUBE_VERTICES.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.scene.gpu.device.queue.writeBuffer(vertexBuffer, 0, CUBE_VERTICES);

    const renderPassDescriptor: GPURenderPassDescriptor = {
      label: "cube",
      colorAttachments: [
        {
          view: scene.context.getCurrentTexture().createView(),
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        view: depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    };

    const encoder = scene.gpu.device.createCommandEncoder({
      label: "our encoder",
    });

    const pass = encoder.beginRenderPass(renderPassDescriptor);
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.setVertexBuffer(0, vertexBuffer);
    pass.draw(36);
    pass.end();

    scene.render({
      buffer: encoder.finish(),
    });
  }
}

var CUBE_VERTICES = new Float32Array([
  // Передняя грань (красный)
  -1,
  -1,
  1,
  1,
  0,
  0, // 0
  1,
  -1,
  1,
  1,
  0,
  0, // 1
  1,
  1,
  1,
  1,
  0,
  0, // 2
  -1,
  -1,
  1,
  1,
  0,
  0, // 0
  1,
  1,
  1,
  1,
  0,
  0, // 2
  -1,
  1,
  1,
  1,
  0,
  0, // 3

  // Задняя грань (зеленый)
  1,
  -1,
  -1,
  0,
  1,
  0, // 5
  -1,
  -1,
  -1,
  0,
  1,
  0, // 4
  -1,
  1,
  -1,
  0,
  1,
  0, // 7
  1,
  -1,
  -1,
  0,
  1,
  0, // 5
  -1,
  1,
  -1,
  0,
  1,
  0, // 7
  1,
  1,
  -1,
  0,
  1,
  0, // 6

  // Правая грань (синий)
  1,
  -1,
  1,
  0,
  0,
  1, // 1
  1,
  -1,
  -1,
  0,
  0,
  1, // 5
  1,
  1,
  -1,
  0,
  0,
  1, // 6
  1,
  -1,
  1,
  0,
  0,
  1, // 1
  1,
  1,
  -1,
  0,
  0,
  1, // 6
  1,
  1,
  1,
  0,
  0,
  1, // 2

  // Левая грань (желтый)
  -1,
  -1,
  -1,
  1,
  1,
  0, // 4
  -1,
  -1,
  1,
  1,
  1,
  0, // 0
  -1,
  1,
  1,
  1,
  1,
  0, // 3
  -1,
  -1,
  -1,
  1,
  1,
  0, // 4
  -1,
  1,
  1,
  1,
  1,
  0, // 3
  -1,
  1,
  -1,
  1,
  1,
  0, // 7

  // Верхняя грань (пурпурный)
  -1,
  1,
  1,
  1,
  0,
  1, // 3
  1,
  1,
  1,
  1,
  0,
  1, // 2
  1,
  1,
  -1,
  1,
  0,
  1, // 6
  -1,
  1,
  1,
  1,
  0,
  1, // 3
  1,
  1,
  -1,
  1,
  0,
  1, // 6
  -1,
  1,
  -1,
  1,
  0,
  1, // 7

  // Нижняя грань (голубой)
  -1,
  -1,
  -1,
  0,
  1,
  1, // 4
  1,
  -1,
  -1,
  0,
  1,
  1, // 5
  1,
  -1,
  1,
  0,
  1,
  1, // 1
  -1,
  -1,
  -1,
  0,
  1,
  1, // 4
  1,
  -1,
  1,
  0,
  1,
  1, // 1
  -1,
  -1,
  1,
  0,
  1,
  1, // 0
]);
