export function clampSidebarWidth(value) {
  const min = 180;
  const max = 480;
  const numeric = Number(value) || min;
  return Math.min(Math.max(numeric, min), max);
}
