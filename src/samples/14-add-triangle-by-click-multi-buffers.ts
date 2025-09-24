import { inject, injectable } from "inversify";
import { Scene } from "../core/scene";
import { makeShaderDataDefinitions, makeStructuredView } from "webgpu-utils";
import { FastColor, type ColorInput } from "@ant-design/fast-color";
import { randomInteger } from "../shared/random";

const CODE = /* wgsl */ `
  struct OurStruct {
    color: vec4f,
    scale: vec2f,
    offset: vec2f
  };

  @group(0) @binding(0) var<uniform> ourStruct: OurStruct;

  @vertex 
  fn vs(
    @builtin(vertex_index) vertexIndex : u32
  ) -> @builtin(position) vec4f {
    let pos = array(
      vec2f( 0.0,  0.5),
      vec2f(-0.5, -0.5),
      vec2f( 0.5, -0.5)
    );
    return vec4f(pos[vertexIndex] * ourStruct.scale + ourStruct.offset, 0.0, 1.0);
  }

  @fragment 
  fn fs() -> @location(0) vec4f {
    return ourStruct.color;
  }
`;

@injectable()
export class AddTriangleByClick {
  private triangles: Array<{
    color: ColorInput;
    scale: number;
    offset: { x: number; y: number };
  }> = [];

  constructor(@inject(Scene) readonly scene: Scene) {
    scene.canvas.addEventListener("click", (e) => {
      const rect = scene.canvas.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;

      const x = (offsetX / scene.canvas.width) * 2 - 1;
      const y = 1 - (offsetY / scene.canvas.height) * 2;

      this.triangles.push({
        color: {
          r: randomInteger(0, 255),
          g: randomInteger(0, 255),
          b: randomInteger(0, 255),
          a: Math.random(),
        },
        scale: Math.random(),
        offset: { x, y },
      });

      this.renderAllTriangles();
    });
  }

  private renderAllTriangles() {
    const scene = this.scene;

    // Создаем текстуру один раз для всех буферов
    const texture = scene.context.getCurrentTexture();
    const textureView = texture.createView();

    const module = scene.gpu.device.createShaderModule({
      label: "triangle shaders",
      code: CODE,
    });

    const pipeline = scene.gpu.device.createRenderPipeline({
      label: "triangle pipeline",
      layout: "auto",
      vertex: { module },
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

    const commandBuffers: GPUCommandBuffer[] = [];

    // 2. Отдельный буфер для каждого треугольника
    this.triangles.forEach((triangle) => {
      const encoder = scene.gpu.device.createCommandEncoder();

      // Для каждого треугольника используем loadOp: "load"
      const renderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [
          {
            view: textureView,
            loadOp: "load",
            storeOp: "store",
          },
        ],
      };

      const pass = encoder.beginRenderPass(renderPassDescriptor);
      pass.setPipeline(pipeline);

      const defs = makeShaderDataDefinitions(CODE);
      const ourStruct = makeStructuredView(defs.uniforms.ourStruct);

      const uniformBuffer = scene.gpu.device.createBuffer({
        size: ourStruct.arrayBuffer.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      const _color = new FastColor(triangle.color);
      const { r, g, b, a } = _color.toRgb();
      const colorRgb = [r / 255, g / 255, b / 255, a];

      ourStruct.set({
        color: colorRgb,
        scale: [triangle.scale, triangle.scale],
        offset: [triangle.offset.x, triangle.offset.y],
      });

      scene.gpu.device.queue.writeBuffer(
        uniformBuffer,
        0,
        ourStruct.arrayBuffer
      );

      const bindGroup = scene.gpu.device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
      });

      pass.setBindGroup(0, bindGroup);
      pass.draw(3);
      pass.end();

      commandBuffers.push(encoder.finish());
    });

    // Отправляем ВСЕ буферы разом
    scene.render({
      buffer: commandBuffers,
      clear: { enabled: true, color: { r: 0, g: 0, b: 0, a: 0 } },
    });
  }

  public draw({
    color,
    scale,
    offset,
  }: {
    color: ColorInput;
    scale: number;
    offset: { x: number; y: number };
  }) {
    // Добавляем треугольник и перерисовываем все
    this.triangles.push({ color, scale, offset });
    this.renderAllTriangles();
  }
}
