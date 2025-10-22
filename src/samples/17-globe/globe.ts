import { inject, injectable } from "inversify";
import { Scene } from "../../core/scene";
import { geometrySphere } from "../../shared/geometry-sphere";
import { RenderListener, RenderManager } from "./render-manager";
import { OrbitCameraController } from "./orbit-controller";
import { mat4 } from "wgpu-matrix";
import { createTextureFromImages, createTextureFromSource } from "webgpu-utils";

const CODE = /* wgsl */ `
  struct Uniforms {
    modelViewProjection: mat4x4f,
  };

  @group(0) @binding(0) var<uniform> uniforms: Uniforms;
  @group(0) @binding(1) var mySampler: sampler;
  @group(0) @binding(2) var myTexture: texture_2d<f32>;

  struct VertexInput {
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f,
  };

  struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) normal: vec3f,
  };

  @vertex
  fn vs(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.position = uniforms.modelViewProjection * vec4f(input.position, 1.0);
    output.uv = input.uv;
    output.normal = input.normal;
    return output;
  }

  @fragment
  fn fs(input: VertexOutput) -> @location(0) vec4f {
    let textureColor = textureSample(myTexture, mySampler, input.uv);
    return vec4f(textureColor.rgb, textureColor.a);
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
  private texture: GPUTexture;
  private sampler: GPUSampler;

  constructor(
    @inject(Scene) public readonly scene: Scene,
    @inject(RenderManager) public readonly renderManager: RenderManager,
    @inject(OrbitCameraController)
    readonly cameraController: OrbitCameraController
  ) {
    this.uniformBuffer = this.scene.gpu.device.createBuffer({
      size: 64,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      label: "Globe uniform buffer",
    });

    // Временная текстура
    this.texture = createTextureFromSource(
      scene.gpu.device,
      [255, 255, 255, 255]
    );

    // Создаем семплер
    this.sampler = this.scene.gpu.device.createSampler({
      label: "Globe sampler",
      magFilter: "linear",
      minFilter: "linear",
    });

    // Bind group layout
    const bindGroupLayout = this.scene.gpu.device.createBindGroupLayout({
      label: "Globe bind group layout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "uniform" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {},
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: "float" },
        },
      ],
    });

    // Bind group
    this.bindGroup = this.scene.gpu.device.createBindGroup({
      label: "Globe bind group",
      layout: bindGroupLayout,
      entries: [
        {
          binding: 0,
          resource: { buffer: this.uniformBuffer },
        },
        {
          binding: 1,
          resource: this.sampler,
        },
        {
          binding: 2,
          resource: this.texture.createView(),
        },
      ],
    });

    // Шейдерный модуль
    const module = this.scene.gpu.device.createShaderModule({
      label: "Globe shaders",
      code: CODE,
    });

    // Pipeline layout
    const pipelineLayout = this.scene.gpu.device.createPipelineLayout({
      label: "Globe pipeline layout",
      bindGroupLayouts: [bindGroupLayout],
    });

    // Рендер пайплайн
    this.pipeline = this.scene.gpu.device.createRenderPipeline({
      label: "Globe pipeline",
      layout: pipelineLayout,
      vertex: {
        module,
        buffers: [
          {
            arrayStride: 32, // 8 floats * 4 bytes = 32 bytes
            attributes: [
              {
                format: "float32x3",
                offset: 0,
                shaderLocation: 0, // position
              },
              {
                format: "float32x3",
                offset: 12, // 3 floats * 4 bytes = 12
                shaderLocation: 1, // normal
              },
              {
                format: "float32x2",
                offset: 24, // 6 floats * 4 bytes = 24
                shaderLocation: 2, // uv
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
        cullMode: "back",
        frontFace: "ccw",
      },
    });

    // Vertex buffer - используем готовые вершины из geometrySphere
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

    // Index buffer
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

    // Регистрируем слушатель
    this.renderManager.addListener(
      new RenderListener({ order: 1, fn: this.draw.bind(this) })
    );

    // Загружаем OSM текстуру
    createTextureFromImages(
      scene.gpu.device,
      ["https://tile.openstreetmap.org/0/0/0.png"],
      {
        flipY: true,
      }
    ).then((texture) => {
      this.texture = texture;

      // Обновляем bind group с новой текстурой
      this.bindGroup = this.scene.gpu.device.createBindGroup({
        label: "Globe bind group updated",
        layout: bindGroupLayout,
        entries: [
          {
            binding: 0,
            resource: { buffer: this.uniformBuffer },
          },
          {
            binding: 1,
            resource: this.sampler,
          },
          {
            binding: 2,
            resource: this.texture.createView(),
          },
        ],
      });

      this.renderManager.trigger();
    });
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
    this.uniformBuffer?.destroy();
    this.vertexBuffer?.destroy();
    this.indicesBuffer?.destroy();
    this.texture?.destroy();
  }
}
