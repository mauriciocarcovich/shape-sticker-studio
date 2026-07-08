const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const boundsOf = (points) => {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
};

const ensureClosed = (points) => {
  if (points.length < 2) return points;
  const first = points[0];
  const last = points[points.length - 1];
  if (distance(first, last) < 0.001) return points;
  return [...points, first];
};

const removeNearDuplicates = (points, minDistance) => {
  const clean = [];
  points.forEach((point) => {
    const last = clean[clean.length - 1];
    if (!last || distance(point, last) >= minDistance) clean.push(point);
  });
  return clean;
};

const perpendicularDistance = (point, start, end) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return distance(point, start);
  return Math.abs(dy * point.x - dx * point.y + end.x * start.y - end.y * start.x) /
    Math.hypot(dx, dy);
};

const rdp = (points, epsilon) => {
  if (points.length <= 2) return points;

  let farthestIndex = 0;
  let farthestDistance = 0;

  for (let index = 1; index < points.length - 1; index += 1) {
    const currentDistance = perpendicularDistance(points[index], points[0], points[points.length - 1]);
    if (currentDistance > farthestDistance) {
      farthestDistance = currentDistance;
      farthestIndex = index;
    }
  }

  if (farthestDistance <= epsilon) return [points[0], points[points.length - 1]];

  const left = rdp(points.slice(0, farthestIndex + 1), epsilon);
  const right = rdp(points.slice(farthestIndex), epsilon);
  return [...left.slice(0, -1), ...right];
};

const chaikin = (points, iterations) => {
  let result = ensureClosed(points);

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const next = [];
    for (let index = 0; index < result.length - 1; index += 1) {
      const current = result[index];
      const following = result[index + 1];
      next.push({
        x: current.x * 0.75 + following.x * 0.25,
        y: current.y * 0.75 + following.y * 0.25,
      });
      next.push({
        x: current.x * 0.25 + following.x * 0.75,
        y: current.y * 0.25 + following.y * 0.75,
      });
    }
    result = ensureClosed(next);
  }

  return result;
};

const roundedRectPoints = (points, radiusRatio, segments = 8) => {
  const bounds = boundsOf(points);
  const width = Math.max(bounds.maxX - bounds.minX, 0.2);
  const height = Math.max(bounds.maxY - bounds.minY, 0.2);
  const maxRadius = Math.min(width, height) / 2;
  const radius = clamp(radiusRatio, 0.02, 0.48) * Math.min(width, height);
  const r = Math.min(radius, maxRadius);
  const corners = [
    { cx: bounds.maxX - r, cy: bounds.maxY - r, start: 0 },
    { cx: bounds.minX + r, cy: bounds.maxY - r, start: Math.PI / 2 },
    { cx: bounds.minX + r, cy: bounds.minY + r, start: Math.PI },
    { cx: bounds.maxX - r, cy: bounds.minY + r, start: (Math.PI * 3) / 2 },
  ];

  const refined = [];
  corners.forEach((corner) => {
    for (let index = 0; index <= segments; index += 1) {
      const angle = corner.start + (index / segments) * (Math.PI / 2);
      refined.push({
        x: corner.cx + Math.cos(angle) * r,
        y: corner.cy + Math.sin(angle) * r,
      });
    }
  });

  return ensureClosed(refined);
};

const makeSymmetric = (points) => {
  if (points.length < 4) return points;
  const bounds = boundsOf(points);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const left = points.filter((point) => point.x <= centerX);
  const side = left.length >= 3 ? left : points.slice(0, Math.ceil(points.length / 2));
  const mirrored = side
    .slice()
    .reverse()
    .map((point) => ({ x: centerX + (centerX - point.x), y: point.y }));
  return ensureClosed([...side, ...mirrored]);
};

export function refineDrawing(points, settings) {
  if (points.length < 4) return points;

  const {
    assist = 'freeform',
    smoothness = 0.35,
    simplify = 0.18,
    cornerRadius = 0.18,
  } = settings;

  if (assist === 'rounded' || assist === 'phone') {
    return roundedRectPoints(points, assist === 'phone' ? Math.max(cornerRadius, 0.18) : cornerRadius);
  }

  const deduped = removeNearDuplicates(points, 0.012);
  const epsilon = clamp(simplify, 0, 1) * 0.09;
  const simplified = assist === 'organic' ? deduped : rdp(deduped, epsilon);
  const symmetric = assist === 'symmetric' ? makeSymmetric(simplified) : ensureClosed(simplified);
  const iterations = assist === 'hard' ? 0 : Math.round(clamp(smoothness, 0, 1) * 4);
  const smoothed = chaikin(symmetric, iterations);

  return ensureClosed(removeNearDuplicates(smoothed, 0.004));
}

export function drawingBounds(points) {
  if (points.length < 1) return null;
  const bounds = boundsOf(points);
  return {
    ...bounds,
    width: bounds.maxX - bounds.minX,
    height: bounds.maxY - bounds.minY,
  };
}
