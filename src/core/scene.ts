import { inject, injectable } from "inversify";
import { GpuService } from "./gpu";
import { FastColor, type ColorInput } from "@ant-design/fast-color";
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

    this.canvas.width = 300;
    this.canvas.height = 300;
    this.canvas.style.border = "1px dotted black";

    this.context = this.canvas.getContext("webgpu")!;

    this.context.configure({
      device: gpu.device,
      format: gpu.presentationFormat,
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

    if (clear) {
      const clearEncoder = this.gpu.device.createCommandEncoder();

      const color = new FastColor(clear.color);
      const { r, g, b, a } = color.toRgb();

      const pass = clearEncoder.beginRenderPass({
        colorAttachments: [
          {
            view: this.context.getCurrentTexture().createView(),
            clearValue: [r / 255, g / 255, b / 255, a],
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
