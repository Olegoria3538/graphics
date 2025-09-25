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
import { AddTriangleByClickMultiBuffers } from "./samples/13-add-triangle-by-click";
import { AddTriangleByClick } from "./samples/14-add-triangle-by-click-multi-buffers";
import type { WgpuAppSettings } from "./shared/types";
import { TriangleUseMatrix } from "./samples/15-triangle-use-matrix";
import { Cube } from "./samples/16-cube";
import { animate } from "./shared/animate";

const elementContainer = document.createElement("div");
elementContainer.style.display = "flex";
elementContainer.style.flexFlow = "wrap";
elementContainer.style.gap = "16px";
elementContainer.style.padding = "4px";
document.body.appendChild(elementContainer);

let adapter: GPUAdapter | null;
let device: GPUDevice | undefined;

async function wgpuAppEntrypoint({
  title,
  alphaMode,
}: {
  title: string;
  alphaMode?: GPUCanvasAlphaMode;
}) {
  adapter = adapter ?? (await navigator.gpu?.requestAdapter());
  device = device ?? (await adapter?.requestDevice());
  if (!device) {
    throw new Error("Not supported webgpu");
  }

  const container = new Container();

  const settings: WgpuAppSettings = {
    title,
    elementTarget: elementContainer,
    alphaMode,
  };

  container.bind(DI_TOKENS.GLOBAL_SETTINGS).toConstantValue(settings);
  container.bind(DI_TOKENS.GPU).toConstantValue(navigator.gpu);
  container.bind(DI_TOKENS.GPU_ADAPTER).toConstantValue(adapter);
  container.bind(DI_TOKENS.GPU_DEVICE).toConstantValue(device);

  container.bind(GpuService).toSelf().inSingletonScope();
  container.bind(Scene).toSelf().inSingletonScope();

  return { container };
}

//hello triangle
wgpuAppEntrypoint({ title: "hello triangle" }).then(({ container }) => {
  container.bind(SampleHelloTriangle).toSelf();
  container.get<SampleHelloTriangle>(SampleHelloTriangle);
});

//inter stage
wgpuAppEntrypoint({ title: "inter stage" }).then(({ container }) => {
  container.bind(InterStageTriangle).toSelf();
  container.get<InterStageTriangle>(InterStageTriangle);
});

//uniform
wgpuAppEntrypoint({ title: "uniform" }).then(({ container }) => {
  container.bind(UniformTriangle).toSelf();

  const triangle = container.get<UniformTriangle>(UniformTriangle);

  triangle.draw({
    color: "#5da53344",
    scale: 0.5,
    offset: { x: 0.5, y: -0.25 },
  });
});

//несколько треугольников
wgpuAppEntrypoint({ title: "repeat triangle" }).then(({ container }) => {
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
wgpuAppEntrypoint({ title: "primitive points" }).then(({ container }) => {
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
wgpuAppEntrypoint({ title: "primitive lines" }).then(({ container }) => {
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
wgpuAppEntrypoint({ title: "primitive points instances" }).then(
  ({ container }) => {
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
  }
);

//примитивные точки с использованием storage buffer
wgpuAppEntrypoint({ title: "primitive points storage buffer" }).then(
  ({ container }) => {
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
  }
);

//анимация треугольника
wgpuAppEntrypoint({ title: "animate rotation triangle" }).then(
  ({ container }) => {
    container.bind(AnimateRotationTriangle).toSelf();

    const triangle = container.get<AnimateRotationTriangle>(
      AnimateRotationTriangle
    );

    animate(({ d }) => {
      triangle.draw({
        color: "#0084ffff",
        scale: 0.2,
        offset: { x: Math.sin(d / 1000), y: Math.sin(d / 1000) },
        rotation: d / 10,
      });
    });
  }
);

//простая текстура
wgpuAppEntrypoint({ title: "simple texture" }).then(({ container }) => {
  container.bind(SimpleTexture).toSelf();

  const points = container.get<SimpleTexture>(SimpleTexture);

  points.draw();
});

//прямогульники
wgpuAppEntrypoint({ title: "squares" }).then(({ container }) => {
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
wgpuAppEntrypoint({ title: "squares textures" }).then(({ container }) => {
  container.bind(SquaresTextures).toSelf();

  const squares = container.get<SquaresTextures>(SquaresTextures);

  squares.draw({
    items: Array.from({ length: 1000 }).map(() => ({
      textureUrl: "person.png",
      scale: Math.random() * 0.1,
      offset: {
        x: Math.random() * (Math.random() > 0.5 ? 1 : -1),
        y: Math.random() * (Math.random() > 0.5 ? 1 : -1),
      },
    })),
  });
});

//добавление треугольника по клику
wgpuAppEntrypoint({ title: "добавление треугольника по клику" }).then(
  ({ container }) => {
    container.bind(AddTriangleByClickMultiBuffers).toSelf();

    const triangles = container.get<AddTriangleByClickMultiBuffers>(
      AddTriangleByClickMultiBuffers
    );

    animate(({ d }) => {
      triangles.rotate = d / 100;
      triangles.reDraw();
    });
  }
);

//добавление треугольника по клику (multi buffers)
wgpuAppEntrypoint({
  title: "добавление по клику (multi buffers)",
  alphaMode: "premultiplied",
}).then(({ container }) => {
  container.bind(AddTriangleByClick).toSelf();

  container.get<AddTriangleByClick>(AddTriangleByClick);
});

//матричные преобразования
wgpuAppEntrypoint({
  title: "матричные преобразования",
}).then(({ container }) => {
  container.bind(TriangleUseMatrix).toSelf();

  const triangleUseMatrix = container.get<TriangleUseMatrix>(TriangleUseMatrix);

  animate(({ d }) => {
    triangleUseMatrix.draw({
      rotate: d / 10,
      scale: [Math.sin(d / 1000) / 10, Math.sin(d / 1000) / 10],
      offset: { x: Math.sin(d / 1000), y: Math.sin(d / 1000) },
    });
  });
});

//куб
wgpuAppEntrypoint({
  title: "матричные преобразования",
  alphaMode: "premultiplied",
}).then(({ container }) => {
  container.bind(Cube).toSelf();

  const сube = container.get<Cube>(Cube);

  animate((x) => {
    сube.draw({ rotate: x.d / 10, scale: [0.3, 0.3, 0.3], offset: [0, 0, 0] });
  });
});
