import { Container } from "inversify";
import "./style.css";
import { DI_TOKENS } from "./shared/constants";
import { GpuService } from "./core/gpu";
import { Scene } from "./core/scene";
import { SampleHelloTriangle } from "./samples/1-hello-triangle";
import { InterStageTriangle } from "./samples/2-inter-stage-triangle";
import { UniformTriangle } from "./samples/3-uniform-triangle";
import { RepeatTriangle } from "./samples/4-repeat-triangle";
import { PrimitivePoints } from "./samples/5-primitive-points";
import { FastColor } from "@ant-design/fast-color";
import { randomInteger } from "./shared/random";
import { PrimitiveLine } from "./samples/6-primitive-line";
import { PrimitivePointsInstances } from "./samples/7-primitive-points-instances";
import { PrimitivePointsStorageBuffer } from "./samples/8-primitive-points-storage-buffer";

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

//hello triangle
wgpuAppEntrypoint().then(({ container }) => {
  container.bind(SampleHelloTriangle).toSelf();
  container.get<SampleHelloTriangle>(SampleHelloTriangle);
});

//inter stage
wgpuAppEntrypoint().then(({ container }) => {
  container.bind(InterStageTriangle).toSelf();
  container.get<InterStageTriangle>(InterStageTriangle);
});

//uniform
wgpuAppEntrypoint().then(({ container }) => {
  container.bind(UniformTriangle).toSelf();

  const triangle = container.get<UniformTriangle>(UniformTriangle);

  triangle.draw({
    color: "#5da53344",
    scale: 0.5,
    offset: { x: 0.5, y: -0.25 },
  });
});

//несколько треугольников
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
        color: "#a5333344",
        scale: 1,
        offset: { x: 0, y: -0.25 },
      },
      {
        color: "#5c05fc44",
        scale: 1,
        offset: { x: 0.2, y: 0.25 },
      },
      {
        color: "#00ffff6e",
        scale: 1,
        offset: { x: -0.2, y: 0.25 },
      },
    ],
  });
});

//примитивные точки
wgpuAppEntrypoint().then(({ container }) => {
  container.bind(PrimitivePoints).toSelf();

  const points = container.get<PrimitivePoints>(PrimitivePoints);

  points.draw({
    items: Array.from({ length: 10000 }).map(() => ({
      color: {
        r: randomInteger(0, 255),
        g: randomInteger(0, 255),
        b: randomInteger(0, 255),
      },
      position: [
        Math.random() * (Math.random() > 0.5 ? 1 : -1),
        Math.random() * (Math.random() > 0.5 ? 1 : -1),
      ],
    })),
  });
});

//примитивные линии
wgpuAppEntrypoint().then(({ container }) => {
  container.bind(PrimitiveLine).toSelf();

  const lines = container.get<PrimitiveLine>(PrimitiveLine);

  lines.draw({
    items: Array.from({ length: 100 }).map(() => ({
      color: {
        r: randomInteger(0, 255),
        g: randomInteger(0, 255),
        b: randomInteger(0, 255),
      },
      start: [
        Math.random() * (Math.random() > 0.5 ? 1 : -1),
        Math.random() * (Math.random() > 0.5 ? 1 : -1),
      ],
      end: [
        Math.random() * (Math.random() > 0.5 ? 1 : -1),
        Math.random() * (Math.random() > 0.5 ? 1 : -1),
      ],
    })),
  });
});

//примитивные точки с использованием инстансинга
wgpuAppEntrypoint().then(({ container }) => {
  container.bind(PrimitivePointsInstances).toSelf();

  const points = container.get<PrimitivePointsInstances>(
    PrimitivePointsInstances
  );

  points.draw({
    items: Array.from({ length: 10000 }).map(() => ({
      color: {
        r: randomInteger(0, 255),
        g: randomInteger(0, 255),
        b: randomInteger(0, 255),
      },
      position: [
        Math.random() * (Math.random() > 0.5 ? 1 : -1),
        Math.random() * (Math.random() > 0.5 ? 1 : -1),
      ],
    })),
  });
});

//примитивные точки с использованием storage buffer
wgpuAppEntrypoint().then(({ container }) => {
  container.bind(PrimitivePointsStorageBuffer).toSelf();

  const points = container.get<PrimitivePointsStorageBuffer>(
    PrimitivePointsStorageBuffer
  );

  points.draw({
    items: Array.from({ length: 10000 }).map(() => ({
      color: {
        r: randomInteger(0, 255),
        g: randomInteger(0, 255),
        b: randomInteger(0, 255),
      },
      position: [
        Math.random() * (Math.random() > 0.5 ? 1 : -1),
        Math.random() * (Math.random() > 0.5 ? 1 : -1),
      ],
    })),
  });
});
