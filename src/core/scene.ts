import { inject, injectable } from "inversify";
import { GpuService } from "./gpu";

@injectable()
export class Scene {
  public readonly canvas: HTMLCanvasElement;
  public readonly context: GPUCanvasContext;
  public readonly gpu: GpuService;

  constructor(@inject(GpuService) gpu: GpuService) {
    this.gpu = gpu;

    this.canvas = document.createElement("canvas");

    this.canvas.width = 100;
    this.canvas.height = 100;

    document.body.appendChild(this.canvas);

    this.context = this.canvas.getContext("webgpu")!;

    this.context.configure({
      device: gpu.device,
      format: gpu.presentationFormat,
    });
  }

  public render({ encoder }: { encoder: GPUCommandEncoder }) {
    const commandBuffer = encoder.finish();
    this.gpu.device.queue.submit([commandBuffer]);
  }
}
