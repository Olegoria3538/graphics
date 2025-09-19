import { inject, injectable } from "inversify";
import { DI_TOKENS } from "../shared/constants";

@injectable()
export class GpuService {
  public readonly gpu: GPU;
  public readonly adapter: GPUAdapter;
  public readonly device: GPUDevice;
  public readonly presentationFormat: GPUTextureFormat;

  constructor(
    @inject(DI_TOKENS.GPU) GPU: GPU,
    @inject(DI_TOKENS.GPU_ADAPTER) GPU_ADAPTER: GPUAdapter,
    @inject(DI_TOKENS.GPU_DEVICE) GPU_DEVICE: GPUDevice
  ) {
    this.gpu = GPU;
    this.adapter = GPU_ADAPTER;
    this.device = GPU_DEVICE;
    this.presentationFormat = this.gpu.getPreferredCanvasFormat();
  }
}
