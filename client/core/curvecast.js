import { Vector3 } from './three.js';

const maxSteps = 5;

const gravity = new Vector3(0, -1, 0);
const next = new Vector3();
const restore = {
  direction: new Vector3(),
  origin: new Vector3(),
};
const steps = [...Array(maxSteps + 1)].map(() => new Vector3());

// Performs a "curved" raycast

export default function CurveCast({
  intersects,
  raycaster,
}) {
  const { far: distance, ray: { direction, origin } } = raycaster;
  const points = [];
  let stride = 0.5;
  let hit = false;
  restore.direction.copy(direction);
  restore.origin.copy(origin);
  next.copy(origin);
  for (let i = 0; i < maxSteps; i += 1) {
    stride *= 2;
    origin.copy(next);
    points.push(steps[i].copy(origin));
    next
      .copy(origin)
      .addScaledVector(direction, stride)
      .addScaledVector(gravity, (stride * stride) * 0.05);
    direction
      .subVectors(next, origin);
    raycaster.far = i === maxSteps - 1 ? distance : direction.length();
    direction.normalize();
    hit = raycaster.intersectObjects(intersects)[0] || false;
    if (hit) {
      points.push(steps[maxSteps].copy(hit.point));
      break;
    }
  }
  direction.copy(restore.direction);
  origin.copy(restore.origin);
  raycaster.far = distance;
  return { hit, points };
}
