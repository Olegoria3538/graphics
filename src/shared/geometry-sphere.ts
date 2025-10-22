export interface SphereGeometryResult {
  vertices: Float32Array<ArrayBuffer>;
  indices: Uint16Array<ArrayBuffer>;
  vertexCount: number;
  indexCount: number;
}

export const geometrySphere = (
  radius = 1.0,
  widthSegments = 32,
  heightSegments = 16
): SphereGeometryResult => {
  const vertices: number[] = [];
  const indices: number[] = [];

  // Северный полюс (одна вершина)
  vertices.push(0, radius, 0); // позиция
  vertices.push(0, 1, 0); // нормаль
  vertices.push(0.5, 1); // UV

  // Генерируем вершины для средних слоев (исключая полюса)
  for (let y = 1; y < heightSegments; y++) {
    const v = y / heightSegments;
    const phi = v * Math.PI; // от 0 до π

    for (let x = 0; x <= widthSegments; x++) {
      const u = x / widthSegments;
      const theta = u * Math.PI * 2; // от 0 до 2π

      // Сферические координаты в декартовы
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      const px = radius * sinPhi * cosTheta;
      const py = radius * cosPhi;
      const pz = radius * sinPhi * sinTheta;

      // Позиция вершины
      vertices.push(px, py, pz);

      // Нормаль (для сферы нормаль = нормализованная позиция)
      vertices.push(px / radius, py / radius, pz / radius);

      // UV координаты для текстур
      vertices.push(u, 1 - v);
    }
  }

  // Южный полюс (одна вершина)
  vertices.push(0, -radius, 0); // позиция
  vertices.push(0, -1, 0); // нормаль
  vertices.push(0.5, 0); // UV

  const southPoleIndex = 1 + (heightSegments - 1) * (widthSegments + 1);

  // Генерируем индексы
  // Треугольники для северного полюса
  for (let x = 0; x < widthSegments; x++) {
    const a = 1 + x; // первый ряд вершин
    const b = 1 + x + 1;
    indices.push(0, b, a); // северный полюс в центре
  }

  // Треугольники для средних слоев
  for (let y = 1; y < heightSegments - 1; y++) {
    for (let x = 0; x < widthSegments; x++) {
      const a = 1 + (y - 1) * (widthSegments + 1) + x;
      const b = 1 + y * (widthSegments + 1) + x;
      const c = a + 1;
      const d = b + 1;

      // Два треугольника на каждый квад
      indices.push(a, b, c);
      indices.push(c, b, d);
    }
  }

  // Треугольники для южного полюса
  for (let x = 0; x < widthSegments; x++) {
    const a = 1 + (heightSegments - 2) * (widthSegments + 1) + x;
    const b = a + 1;
    indices.push(southPoleIndex, a, b); // южный полюс в центре
  }

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint16Array(indices),
    vertexCount: vertices.length / 8, // 8 компонентов на вершину (pos3 + normal3 + uv2)
    indexCount: indices.length,
  };
};
