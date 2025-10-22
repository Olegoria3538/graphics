import { inject, injectable } from "inversify";
import { Scene } from "../../core/scene";
import { geometrySphere } from "../../shared/geometry-sphere";
import { RenderListener, RenderManager } from "./render-manager";
import { OrbitCameraController } from "./orbit-controller";
import { mat4 } from "wgpu-matrix";

const CODE = /* wgsl */ `
  struct Uniforms {
    modelViewProjection: mat4x4f,
  };

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;

  struct VertexInput {
    @location(0) position: vec3f,
    @location(1) normal: vec3f
  };

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec3f
  };

  @vertex
  fn vs(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.position = uniforms.modelViewProjection * vec4f(input.position, 1.0);
    
    // Используем нормаль как цвет
    output.color = input.normal * 0.5 + 0.5;
    
    return output;
  }

  @fragment
  fn fs(input: VertexOutput) -> @location(0) vec4f {
    return vec4f(input.color, 1.0);
  }
`;

@injectable()
export class Globe {
  public readonly sphere = geometrySphere();
  private uniformBuffer: GPUBuffer;
  private bindGroup: GPUBindGroup;
  private pipeline: GPURenderPipeline;
  private indicesBuffer: GPUBuffer;
  private vertexBuffer: GPUBuffer;

  constructor(
    @inject(Scene) public readonly scene: Scene,
    @inject(RenderManager) public readonly renderManager: RenderManager,
    @inject(OrbitCameraController)
    readonly cameraController: OrbitCameraController
  ) {
    // Создаем uniform buffer
    this.uniformBuffer = this.scene.gpu.device.createBuffer({
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: "Globe uniform buffer",
    });

    // Создаем bind group layout (один раз)
    const bindGroupLayout = this.scene.gpu.device.createBindGroupLayout({
      label: "Globe bind group layout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "uniform" },
        },
      ],
    });

    // Создаем bind group
    this.bindGroup = this.scene.gpu.device.createBindGroup({
      label: "Globe bind group",
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.uniformBuffer },
        },
      ],
    });

    // Создаем шейдерный модуль
    const module = this.scene.gpu.device.createShaderModule({
      label: "Globe shaders",
      code: CODE,
    });

    // Создаем рендер пайплайн
    this.pipeline = this.scene.gpu.device.createRenderPipeline({
      label: "Globe pipeline",
      layout: this.scene.gpu.device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout], // Используем тот же layout
      }),
      vertex: {
        module,
        buffers: [
          {
            arrayStride: 32, // 6 floats × 4 bytes
            attributes: [
              {
                format: "float32x3",
                offset: 0,
                shaderLocation: 0,
              },
              {
                format: "float32x3",
                offset: 12, // 3 floats × 4 bytes
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
            format: this.scene.gpu.presentationFormat,
          },
        ],
      },
      depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: true,
        depthCompare: "less",
      },
      primitive: {
        topology: "triangle-list",
        cullMode: "none",
      },
    });

    // Создаем vertex buffer
    this.vertexBuffer = this.scene.gpu.device.createBuffer({
      size: this.sphere.vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      label: "Globe vertex buffer",
    });

    this.scene.gpu.device.queue.writeBuffer(
      this.vertexBuffer,
      0,
      this.sphere.vertices
    );

    // Создаем index buffer
    this.indicesBuffer = this.scene.gpu.device.createBuffer({
      size: this.sphere.indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
      label: "Globe index buffer",
    });

    this.scene.gpu.device.queue.writeBuffer(
      this.indicesBuffer,
      0,
      this.sphere.indices
    );

    // Регистрируем слушатель рендера
    this.renderManager.addListener(
      new RenderListener({ order: 1, fn: this.draw.bind(this) })
    );
  }

  public draw({ passEncoder }: { passEncoder: GPURenderPassEncoder }) {
    try {
      this.updateTransformationMatrix();

      passEncoder.setPipeline(this.pipeline);
      passEncoder.setBindGroup(0, this.bindGroup);
      passEncoder.setVertexBuffer(0, this.vertexBuffer);
      passEncoder.setIndexBuffer(this.indicesBuffer, "uint16");
      passEncoder.drawIndexed(this.sphere.indexCount);
    } catch (error) {
      console.error("Error in Globe draw method:", error);
    }
  }

  private updateTransformationMatrix() {
    const aspect = this.scene.canvas.width / this.scene.canvas.height;

    const modelMatrix = mat4.identity();
    const viewMatrix = this.cameraController.getViewMatrix();

    const projectionMatrix = mat4.perspective(
      (45 * Math.PI) / 180,
      aspect,
      0.1,
      100
    );

    const modelViewMatrix = mat4.multiply(viewMatrix, modelMatrix);
    const modelViewProjectionMatrix = mat4.multiply(
      projectionMatrix,
      modelViewMatrix
    );

    this.scene.gpu.device.queue.writeBuffer(
      this.uniformBuffer,
      0,
      modelViewProjectionMatrix as Float32Array<ArrayBuffer>
    );
  }

  public destroy() {
    // Освобождение ресурсов при необходимости
    this.uniformBuffer?.destroy();
    this.vertexBuffer?.destroy();
    this.indicesBuffer?.destroy();
  }
}
