import { inject, injectable } from "inversify";
import { Scene } from "../../core/scene";
import { isPromise } from "../../shared/is";

export type RenderManagerStatus = "init" | "pending" | "done" | "fail";
export type RenderManagerListenerTrigger = (x: {
  renderPassDescriptor: GPURenderPassDescriptor;
  passEncoder: GPURenderPassEncoder;
}) => void | Promise<void>;

@injectable()
export class RenderManager {
  private status: RenderManagerStatus = "init";
  private listenersTrigger = new Set<RenderListener>();
  private depthTexture: GPUTexture | null = null;
  private isInitialized = false;

  constructor(@inject(Scene) readonly scene: Scene) {}

  private ensureDepthTexture(): GPUTexture {
    if (
      !this.depthTexture ||
      this.depthTexture.width !== this.scene.canvas.width ||
      this.depthTexture.height !== this.scene.canvas.height
    ) {
      this.depthTexture?.destroy();

      this.depthTexture = this.scene.gpu.device.createTexture({
        size: [this.scene.canvas.width, this.scene.canvas.height],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
      });
    }
    return this.depthTexture;
  }

  public async trigger() {
    if (this.status === "pending") {
      console.warn("Render already in progress");
      return { status: this.status } as const;
    }

    this.status = "pending";

    try {
      return await new Promise<{ status: RenderManagerStatus }>(
        (resolve, reject) => {
          requestAnimationFrame(async () => {
            try {
              const depthTexture = this.ensureDepthTexture();

              const renderPassDescriptor: GPURenderPassDescriptor = {
                label: "globe",
                colorAttachments: [
                  {
                    view: this.scene.context.getCurrentTexture().createView(),
                    loadOp: "clear",
                    clearValue: { r: 1, g: 1, b: 1, a: 1 },
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

              const encoder = this.scene.gpu.device.createCommandEncoder({
                label: "globe encoder",
              });

              const passEncoder = encoder.beginRenderPass(renderPassDescriptor);

              // Сортируем слушатели по порядку один раз
              const sortedListeners = Array.from(this.listenersTrigger).sort(
                (a, b) => a.order - b.order
              );

              for (const listener of sortedListeners) {
                try {
                  const response = listener.fn({
                    renderPassDescriptor,
                    passEncoder,
                  });
                  if (isPromise(response)) {
                    await response;
                  }
                } catch (listenerError) {
                  console.error(`Error in render listener:`, listenerError);
                }
              }

              passEncoder.end();

              this.scene.render({ buffer: encoder.finish() });

              this.status = "done";
              resolve({ status: this.status });
            } catch (error) {
              this.status = "fail";
              console.error("Render frame failed:", error);
              reject(error);
            }
          });
        }
      );
    } catch (error) {
      this.status = "fail";
      throw error;
    }
  }

  public addListener(listener: RenderListener) {
    this.listenersTrigger.add(listener);
  }

  public removeListener(listener: RenderListener) {
    this.listenersTrigger.delete(listener);
  }

  public destroy() {
    this.depthTexture?.destroy();
    this.listenersTrigger.clear();
  }
}

export class RenderListener {
  public readonly order: number;
  public readonly fn: RenderManagerListenerTrigger;

  constructor({
    fn,
    order,
  }: {
    fn: RenderManagerListenerTrigger;
    order: number;
  }) {
    this.fn = fn;
    this.order = order;
  }
}
