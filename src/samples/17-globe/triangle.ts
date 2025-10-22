import { inject, injectable } from "inversify";
import { Scene } from "../../core/scene";
import { mat4, quat, vec3, type Vec3Arg } from "wgpu-matrix";
import { OrbitCameraController } from "./orbit-controller";
import { makeShaderDataDefinitions, makeStructuredView } from "webgpu-utils";
import { RenderListener, RenderManager } from "./render-manager";
import { Globe } from "./globe";

const CODE = /* wgsl */ `
  struct OurStruct {
    matrix: mat4x4<f32>,
  };

  struct VertexInput {
    @location(0) position: vec3f,
  };

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f,
  };

  @group(0) @binding(0) var<uniform> ourStruct: OurStruct;

  @vertex
  fn vs(
    @location(0) position: vec3f,
  ) -> VertexOutput {
    var out: VertexOutput;
    out.position = ourStruct.matrix * vec4f(position, 1.0);
    out.color = vec4f(1, 0, 0, 1);
    return out;
  }

  @fragment 
  fn fs(in: VertexOutput) -> @location(0) vec4f {
    return in.color;
  }
`;

@injectable()
export class Triangle {
  private pipeline!: GPURenderPipeline;
  private bindGroup!: GPUBindGroup;
  private uniformBuffer!: GPUBuffer;
  private vertexBuffer!: GPUBuffer;
  private ourStruct: any;
  private sphereRadius: number = 1;

  constructor(
    @inject(Scene) readonly scene: Scene,
    @inject(OrbitCameraController)
    readonly cameraController: OrbitCameraController,
    @inject(RenderManager) readonly renderManager: RenderManager,
    @inject(Globe) readonly globe: Globe
  ) {
    this.init();
    renderManager.addListener(
      new RenderListener({ order: 2, fn: this.draw.bind(this) })
    );
  }

  private init() {
    const scene = this.scene;
    const device = scene.gpu.device;

    const triangleVertices = new Float32Array([
      0, 0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 0,
    ]);

    this.vertexBuffer = device.createBuffer({
      size: triangleVertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    });
    new Float32Array(this.vertexBuffer.getMappedRange()).set(triangleVertices);
    this.vertexBuffer.unmap();

    // Uniform буфер
    const defs = makeShaderDataDefinitions(CODE);
    this.ourStruct = makeStructuredView(defs.uniforms.ourStruct);
    this.uniformBuffer = device.createBuffer({
      size: this.ourStruct.arrayBuffer.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    // Шейдерный модуль и пайплайн
    const module = device.createShaderModule({
      label: "triangle shaders",
      code: CODE,
    });

    this.pipeline = device.createRenderPipeline({
      label: "triangle pipeline",
      layout: "auto",
      vertex: {
        module,
        entryPoint: "vs",
        buffers: [
          {
            arrayStride: 3 * 4,
            attributes: [{ shaderLocation: 0, offset: 0, format: "float32x3" }],
          },
        ],
      },
      fragment: {
        module,
        entryPoint: "fs",
        targets: [
          {
            format: scene.gpu.presentationFormat,
          },
        ],
      },
      primitive: {
        topology: "triangle-list",
        cullMode: "front",
      },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: "less",
        format: "depth24plus",
      },
    });

    this.bindGroup = device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: this.uniformBuffer },
        },
      ],
    });
  }

  public draw({ passEncoder }: { passEncoder: GPURenderPassEncoder }) {
    const scene = this.scene;
    const device = scene.gpu.device;

    const canvas = scene.context.canvas;
    this.cameraController.updateAspectRatio(canvas.width, canvas.height);

    const viewProjectionMatrix =
      this.cameraController.getViewProjectionMatrix();

    const modelMatrix = this.getTriangleModelMatrix(vec3.fromValues(1, 0, 0));

    const finalMatrix = mat4.multiply(viewProjectionMatrix, modelMatrix);

    this.ourStruct.set({
      matrix: finalMatrix,
    });
    device.queue.writeBuffer(this.uniformBuffer, 0, this.ourStruct.arrayBuffer);

    const pass = passEncoder;
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.setVertexBuffer(0, this.vertexBuffer);
    pass.draw(3);
  }

  private getTriangleModelMatrix(positionOnSphere: Vec3Arg) {
    const modelMatrix = mat4.identity();

    // Нормализуем позицию на сфере
    const normalizedPosition = vec3.normalize(positionOnSphere);

    // Позиция треугольника на поверхности сферы
    const position = vec3.scale(normalizedPosition, this.sphereRadius);

    // Создаем матрицу "lookAt" для ориентации треугольника
    // Треугольник "смотрит" вдоль нормали сферы
    const target = vec3.add(position, normalizedPosition); // Смотрим вдоль нормали
    const up = vec3.fromValues(0, 1, 0); // Вектор "вверх"

    // Создаем матрицу вида и инвертируем ее, чтобы получить модельную матрицу
    const viewMatrix = mat4.lookAt(position, target, up);
    mat4.invert(viewMatrix, modelMatrix);

    return modelMatrix;
  }
}
