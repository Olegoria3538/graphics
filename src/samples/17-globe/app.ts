import { inject, injectable } from "inversify";
import { Globe } from "./globe";
import { Scene } from "../../core/scene";
import { RenderManager } from "./render-manager";
import { OrbitCameraController } from "./orbit-controller";
import { Triangle } from "./triangle";

@injectable()
export class GlobeApp {
  constructor(
    @inject(Scene) readonly scene: Scene,
    @inject(Globe) readonly globe: Globe,
    @inject(RenderManager) readonly renderManager: RenderManager,
    @inject(OrbitCameraController)
    readonly cameraController: OrbitCameraController,
    @inject(Triangle) readonly triangle: Triangle
  ) {
    this.scene.gpu.device.addEventListener("uncapturederror", (event) => {
      console.error("WebGPU Error:", event.error);
    });

    this.scene.canvas.addEventListener("mousedown", (event) =>
      this.cameraController.onMouseDown(event)
    );
    this.scene.canvas.addEventListener("mouseup", () =>
      this.cameraController.onMouseUp()
    );
    this.scene.canvas.addEventListener("mousemove", (event) => {
      this.cameraController.onMouseMove(event);
      this.renderManager.trigger();
    });

    // Обработка колесика мыши для масштабирования (зума)
    this.scene.canvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      this.cameraController.radius += event.deltaY * 0.01;
      this.cameraController.radius = Math.max(1, this.cameraController.radius); // Защита от слишком близкого приближения

      this.renderManager.trigger();
    });
  }

  public start() {
    this.renderManager.trigger();
  }
}
