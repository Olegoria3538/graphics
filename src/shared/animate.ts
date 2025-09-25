export const animate = (
  callback: (x: { time: number; dt: number; d: number }) => void
) => {
  let lastTime = 0;
  let d = 0;

  const fn = (time: number) => {
    const dt = time - lastTime;
    lastTime = time;
    d += dt;
    callback({ time, dt, d });
    requestAnimationFrame(fn);
  };

  requestAnimationFrame(fn);
};
