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
import { randomInteger } from "./shared/random";
import { PrimitiveLine } from "./samples/6-primitive-line";
import { PrimitivePointsInstances } from "./samples/7-primitive-points-instances";
import { PrimitivePointsStorageBuffer } from "./samples/8-primitive-points-storage-buffer";
import { AnimateRotationTriangle } from "./samples/9-animate-rotation-triangle";
import { SimpleTexture } from "./samples/10-simple-texture";
import { Squares } from "./samples/11-squares";
import { SquaresTextures } from "./samples/12-squares-texture";

let adapter: GPUAdapter | null;
let device: GPUDevice | undefined;

async function wgpuAppEntrypoint() {
  adapter = adapter ?? (await navigator.gpu?.requestAdapter());
  device = device ?? (await adapter?.requestDevice());
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

//анимация треугольника
wgpuAppEntrypoint().then(({ container }) => {
  container.bind(AnimateRotationTriangle).toSelf();

  const triangle = container.get<AnimateRotationTriangle>(
    AnimateRotationTriangle
  );
  let position = 0;

  let lastTime = 0;
  const animation = (time: number) => {
    const dt = time - lastTime;
    position += dt / 1000;

    triangle.draw({
      color: "#0084ffff",
      scale: 0.2,
      offset: { x: Math.sin(position), y: Math.sin(position) },
      rotation: position * 100,
    });
    lastTime = time;
    requestAnimationFrame(animation);
  };

  requestAnimationFrame(animation);
});

//простая текстура
wgpuAppEntrypoint().then(({ container }) => {
  container.bind(SimpleTexture).toSelf();

  const points = container.get<SimpleTexture>(SimpleTexture);

  points.draw();
});

//прямогульники
wgpuAppEntrypoint().then(({ container }) => {
  container.bind(Squares).toSelf();

  const squares = container.get<Squares>(Squares);

  squares.draw({
    items: Array.from({ length: 1000 }).map(() => ({
      color: {
        r: randomInteger(0, 255),
        g: randomInteger(0, 255),
        b: randomInteger(0, 255),
        a: Math.random(),
      },
      scale: Math.random() * 0.1,
      offset: {
        x: Math.random() * (Math.random() > 0.5 ? 1 : -1),
        y: Math.random() * (Math.random() > 0.5 ? 1 : -1),
      },
    })),
  });
});

//прямогульники с текстурой
wgpuAppEntrypoint().then(({ container }) => {
  container.bind(SquaresTextures).toSelf();

  const squares = container.get<SquaresTextures>(SquaresTextures);

  squares.draw({
    items: Array.from({ length: 100 }).map((_, i) => ({
      textureUrl:
        i % 2 ? "/luna-noch-ozera-pejzazh-priroda-50020.jpeg" : "person.png",
      scale: Math.random() * 0.1,
      offset: {
        x: Math.random() * (Math.random() > 0.5 ? 1 : -1),
        y: Math.random() * (Math.random() > 0.5 ? 1 : -1),
      },
    })),
  });
});
