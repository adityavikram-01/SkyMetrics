// Schematic positions aligned with the bundled India SVG's 420 × 470 viewBox.
export const airportPoints = {
  DEL: [139.2, 147.5], BOM: [88.4, 261.1], BLR: [146.5, 331.8],
  CCU: [275.4, 218.3], HYD: [155.1, 283.3], PNQ: [101, 267.2],
  AMD: [85.5, 213.3], MAA: [176, 334.3], PAT: [235.1, 183.1],
  GOI: [100, 305.6], COK: [129.5, 369], GAU: [322, 183],
  LKO: [192, 173], SXR: [116, 82],
};

export function routeCurve(from, to) {
  const start = airportPoints[from], end = airportPoints[to];
  if (!start || !end) return null;
  const dx = end[0] - start[0], dy = end[1] - start[1];
  const distance = Math.hypot(dx, dy) || 1;
  const bend = Math.min(26, distance * 0.16);
  return `M ${start[0]} ${start[1]} Q ${(start[0]+end[0])/2-dy/distance*bend} ${(start[1]+end[1])/2+dx/distance*bend} ${end[0]} ${end[1]}`;
}

export function networkPaths(routes) {
  return [...new Set(routes.map(route => route.split('-').sort().join('-')))]
    .map(route => ({ route, path: routeCurve(...route.split('-')) }))
    .filter(item => item.path);
}
