import { injectable } from "inversify";
import { mat4 } from "wgpu-matrix";

@injectable()
export class OrbitCameraController {
  radius: number;
  rotation: { x: number; y: number };
  isDragging: boolean;
  lastMouse: { x: number; y: number };

  // Параметры проекции
  private fov: number;
  private near: number;
  private far: number;
  private aspectRatio: number;

  constructor(radius = 5) {
    this.radius = radius;
    this.rotation = { x: 0, y: 0 };
    this.isDragging = false;
    this.lastMouse = { x: 0, y: 0 };

    // Параметры проекции по умолчанию
    this.fov = (60 * Math.PI) / 180; // 60 градусов в радианах
    this.near = 0.1;
    this.far = 1000;
    this.aspectRatio = 1;
  }

  // Обновление соотношения сторон при изменении размера canvas
  updateAspectRatio(width: number, height: number) {
    this.aspectRatio = width / height;
  }

  // Обрабатывает начало перетаскивания (нажатие кнопки мыши)
  onMouseDown(event: MouseEvent) {
    this.isDragging = true;
    this.lastMouse.x = event.clientX;
    this.lastMouse.y = event.clientY;
  }

  // Обрабатывает конец перетаскивания (отпускание кнопки мыши)
  onMouseUp() {
    this.isDragging = false;
  }

  // Обрабатывает перемещение мыши
  onMouseMove(event: MouseEvent) {
    if (!this.isDragging) return;

    const deltaX = event.clientX - this.lastMouse.x;
    const deltaY = event.clientY - this.lastMouse.y;

    this.rotation.y += deltaX * 0.01; // Вращение по горизонтали
    this.rotation.x += deltaY * 0.01; // Вращение по вертикали

    // Ограничиваем вертикальное вращение чтобы не переворачивать камеру
    this.rotation.x = Math.max(
      -Math.PI / 2,
      Math.min(Math.PI / 2, this.rotation.x)
    );

    this.lastMouse.x = event.clientX;
    this.lastMouse.y = event.clientY;
  }

  // Обрабатывает колесо мыши для zoom
  onWheel(event: WheelEvent) {
    event.preventDefault();
    this.radius += event.deltaY * 0.01;
    this.radius = Math.max(0.1, Math.min(100, this.radius)); // Ограничиваем радиус
  }

  // Вычисляет и возвращает матрицу вида для шейдера
  getViewMatrix() {
    const viewMatrix = mat4.identity();

    // Поворачиваем камеру вокруг центра
    mat4.rotateX(viewMatrix, this.rotation.x, viewMatrix);
    mat4.rotateY(viewMatrix, this.rotation.y, viewMatrix);

    // Перемещаем камеру на нужное расстояние
    mat4.translate(viewMatrix, [0, 0, this.radius], viewMatrix);

    // Возвращаем инвертированную матрицу, так как мы "двигаем мир", а не саму камеру
    return mat4.invert(viewMatrix);
  }

  // Возвращает матрицу проекции
  getProjectionMatrix() {
    return mat4.perspective(this.fov, this.aspectRatio, this.near, this.far);
  }

  // Дополнительный метод для получения комбинированной матрицы вида-проекции
  getViewProjectionMatrix() {
    const viewMatrix = this.getViewMatrix();
    const projectionMatrix = this.getProjectionMatrix();
    return mat4.multiply(projectionMatrix, viewMatrix);
  }
}
