import { Container } from "inversify";
import "./style.css";
import { DI_TOKENS } from "./shared/constants";
import { GpuService } from "./core/gpu";
import { Scene } from "./core/scene";
import { SampleHelloTriangle } from "./samples/hello-triangle";
import { InterStageTriangle } from "./samples/inter-stage-triangle";
import { UniformTriangle } from "./samples/uniform-triangle copy";
import { FastColor } from "@ant-design/fast-color";
import { RepeatTriangle } from "./samples/repeat-triangle";

async function wgpuAppEntrypoint() {
  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) {
    throw new Error("Not supported webgpu");
  }

  const container = new Container();

  container.bind(DI_TOKENS.GPU).toConstantValue(navigator.gpu);
  container.bind(DI_TOKENS.GPU_ADAPTER).toConstantValue(adapter);
  container.bind(DI_TOKENS.GPU_DEVICE).toConstantValue(device);

  container.bind(GpuService).toSelf().inSingletonScope();
  container.bind(Scene).toSelf().inSingletonScope();

  return { container };
}

wgpuAppEntrypoint().then(({ container }) => {
  container.bind(SampleHelloTriangle).toSelf();
  container.get<SampleHelloTriangle>(SampleHelloTriangle);
});

wgpuAppEntrypoint().then(({ container }) => {
  container.bind(InterStageTriangle).toSelf();
  container.get<InterStageTriangle>(InterStageTriangle);
});

wgpuAppEntrypoint().then(({ container }) => {
  container.bind(UniformTriangle).toSelf();

  const triangle = container.get<UniformTriangle>(UniformTriangle);

  triangle.draw({
    color: "#5da53344",
    scale: 0.5,
    offset: { x: 0.5, y: -0.25 },
  });
});

wgpuAppEntrypoint().then(({ container }) => {
  container.bind(RepeatTriangle).toSelf();

  const triangle = container.get<RepeatTriangle>(RepeatTriangle);

  triangle.draw({
    items: [
      {
        color: "#5da53344",
        scale: 0.5,
        offset: { x: 0, y: -0.25 },
      },
      {
        color: "#5da53344",
        scale: 1,
        offset: { x: 0, y: -0.25 },
      },
      {
        color: "#5da53344",
        scale: 1,
        offset: { x: 0.2, y: 0.25 },
      },
      {
        color: "#5da53344",
        scale: 1,
        offset: { x: -0.2, y: 0.25 },
      },
    ],
  });
});
