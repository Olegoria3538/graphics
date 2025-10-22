import { inject, injectable } from "inversify";
import { GpuService } from "./gpu";
import { FastColor, type ColorInput, type RGB } from "@ant-design/fast-color";
import { DI_TOKENS } from "../shared/constants";
import type { WgpuAppSettings } from "../shared/types";

@injectable()
export class Scene {
  public readonly canvas: HTMLCanvasElement;
  public readonly context: GPUCanvasContext;
  public readonly gpu: GpuService;
  public readonly container: HTMLDivElement;

  constructor(
    @inject(GpuService) gpu: GpuService,
    @inject(DI_TOKENS.GLOBAL_SETTINGS) settings: WgpuAppSettings
  ) {
    this.gpu = gpu;

    this.container = document.createElement("div");
    this.container.style.display = "flex";
    this.container.style.flexFlow = "column";

    this.container.innerHTML = `
      <span>${settings.title}</span>
      <canvas></canvas>
    `;

    settings.elementTarget.appendChild(this.container);

    this.canvas = this.container.querySelector("canvas")!;

    this.canvas.width = settings?.canvasWidth ?? 300;
    this.canvas.height = settings?.canvasHeight ?? 300;
    this.canvas.style.border = "1px dotted black";

    this.context = this.canvas.getContext("webgpu")!;

    this.context.configure({
      device: gpu.device,
      format: gpu.presentationFormat,
      alphaMode: settings.alphaMode,
    });
  }

  public render({
    buffer,
    clear,
  }: {
    buffer?: GPUCommandBuffer | GPUCommandBuffer[];
    clear?: {
      enabled: boolean;
      color: ColorInput;
    };
  }) {
    const buffers = [] as GPUCommandBuffer[];

    if (clear?.enabled) {
      const clearEncoder = this.gpu.device.createCommandEncoder();

      let color: RGB | null = null;

      if (clear.color) {
        color = new FastColor(clear.color).toRgb();
      }

      const pass = clearEncoder.beginRenderPass({
        colorAttachments: [
          {
            view: this.context.getCurrentTexture().createView(),
            clearValue: color
              ? [color.r / 255, color.g / 255, color.b / 255, color.a]
              : undefined,
            loadOp: "clear",
            storeOp: "store",
          },
        ],
      });

      pass.end();
      buffers.push(clearEncoder.finish());
    }

    if (buffer) {
      if (Array.isArray(buffer)) {
        buffers.push(...buffer);
      } else {
        buffers.push(buffer);
      }
    }

    this.gpu.device.queue.submit(buffers);
  }
}
