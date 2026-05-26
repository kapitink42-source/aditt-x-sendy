import { Vector2D, Wall } from '../types';

export interface Intersection {
  x: number;
  y: number;
  param: number;
  angle: number;
}

// Find intersection of a ray starting at (px, py) in direction (dx, dy)
// with a wall segment (x1, y1) to (x2, y2)
export function getIntersection(
  px: number,
  py: number,
  dx: number,
  dy: number,
  wall: Wall
): Intersection | null {
  const sx = wall.x1;
  const sy = wall.y1;
  const ex = wall.x2;
  const ey = wall.y2;

  // Ray segment math:
  // r_px + r_dx * T1 = s_px + s_dx * T2
  // r_py + r_dy * T1 = s_py + s_dy * T2
  const r_dx = dx;
  const r_dy = dy;
  const s_dx = ex - sx;
  const s_dy = ey - sy;

  // Are they parallel?
  const r_mag = Math.sqrt(r_dx * r_dx + r_dy * r_dy);
  const s_mag = Math.sqrt(s_dx * s_dx + s_dy * s_dy);
  if (r_dx / r_mag === s_dx / s_mag && r_dy / r_mag === s_dy / s_mag) {
    return null; // parallel
  }

  // Solve for T1 (param along ray) and T2 (param along segment)
  const denominator = r_dx * s_dy - r_dy * s_dx;
  if (Math.abs(denominator) < 1e-9) return null;

  const T2 = (r_dx * (sy - py) + r_dy * (px - sx)) / denominator;
  const T1 = (sx + s_dx * T2 - px) / r_dx;

  // Must intersect within ray forward direction (T1 > 0)
  // and within the segment bounds (0 <= T2 <= 1)
  if (T1 < 0) return null;
  if (T2 < 0 || T2 > 1) return null;

  return {
    x: px + r_dx * T1,
    y: py + r_dy * T1,
    param: T1,
    angle: 0 // Will fill later
  };
}

// Generates the visibility polygon for player flashlight or ambient vision.
// Returns a sorted array of points forming the illuminated surface boundary.
export function calculateVisibility(
  px: number,
  py: number,
  walls: Wall[],
  maxRadius: number,
  lightAngle?: number, // direction in radians
  coneAngle?: number // width of light cone in radians (e.g. Math.PI/4)
): Vector2D[] {
  const points: number[] = [];

  // Add all wall endpoints as angles to cast rays
  for (const wall of walls) {
    const angles = [
      Math.atan2(wall.y1 - py, wall.x1 - px),
      Math.atan2(wall.y2 - py, wall.x2 - px)
    ];

    for (const angle of angles) {
      // Cast 3 rays per endpoint (direct, slightly left, slightly right) to prevent tearing at corners
      points.push(angle - 0.0001);
      points.push(angle);
      points.push(angle + 0.0001);
    }
  }

  // If we have a limited cone (flashlight), filter or constrain angles
  if (lightAngle !== undefined && coneAngle !== undefined) {
    // Add cone boundaries to angles list
    const halfCone = coneAngle / 2;
    points.push(lightAngle - halfCone);
    points.push(lightAngle);
    points.push(lightAngle + halfCone);
  } else {
    // Standard 360 degree ambient light padding
    points.push(0);
    points.push(Math.PI / 2);
    points.push(Math.PI);
    points.push(-Math.PI / 2);
  }

  const uniqueAngles = Array.from(new Set(points));
  const rayIntersections: Intersection[] = [];

  for (const angle of uniqueAngles) {
    // Check if within flashlight cone
    if (lightAngle !== undefined && coneAngle !== undefined) {
      let diff = angle - lightAngle;
      // Normalize diff to -PI to PI
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      if (Math.abs(diff) > coneAngle / 2) {
        continue; // skip angles outside flashlight cone
      }
    }

    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    let closestIntersection: Intersection | null = null;

    for (const wall of walls) {
      const intersect = getIntersection(px, py, dx, dy, wall);
      if (!intersect) continue;

      if (!closestIntersection || intersect.param < closestIntersection.param) {
        closestIntersection = intersect;
      }
    }

    // Capture ray intersection or default to maximum radius boundary
    if (closestIntersection && closestIntersection.param <= maxRadius) {
      closestIntersection.angle = angle;
      rayIntersections.push(closestIntersection);
    } else {
      rayIntersections.push({
        x: px + dx * maxRadius,
        y: py + dy * maxRadius,
        param: maxRadius,
        angle: angle
      });
    }
  }

  // Sort ray intersections by angle to form a consecutive polygon
  // For standard 360 degrees, sort is simple -PI to PI
  // For cone, let's normalize around lightAngle to prevent wrap-around bugs
  rayIntersections.sort((a, b) => {
    let angleA = a.angle;
    let angleB = b.angle;
    
    if (lightAngle !== undefined) {
      // Offset sorting to center on the flashlight beam direction
      angleA = (angleA - lightAngle + Math.PI * 2) % (Math.PI * 2);
      angleB = (angleB - lightAngle + Math.PI * 2) % (Math.PI * 2);
    }
    return angleA - angleB;
  });

  // If flashlight, we want to close the cone by including the player's position
  const result: Vector2D[] = [];
  if (lightAngle !== undefined && coneAngle !== undefined) {
    result.push({ x: px, y: py }); // Center of cone
  }

  for (const inter of rayIntersections) {
    result.push({ x: inter.x, y: inter.y });
  }

  if (lightAngle !== undefined && coneAngle !== undefined) {
    result.push({ x: px, y: py }); // Close the wedge back to the center
  }

  return result;
}

// Distance checking helper for light/sound intensity
export function distance(p1: Vector2D, p2: Vector2D): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

// Light intersection check for player detection
export function isPointVisible(
  observer: Vector2D,
  target: Vector2D,
  walls: Wall[],
  viewRange: number,
  lightAngle?: number,
  coneAngle?: number
): boolean {
  const dist = distance(observer, target);
  if (dist > viewRange) return false;

  // Check cone bounds
  if (lightAngle !== undefined && coneAngle !== undefined) {
    const angleToTarget = Math.atan2(target.y - observer.y, target.x - observer.x);
    let diff = angleToTarget - lightAngle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    if (Math.abs(diff) > coneAngle / 2) {
      return false; // Out of cone
    }
  }

  // Check if any wall blocks line of sight
  const dx = target.x - observer.x;
  const dy = target.y - observer.y;
  const mag = Math.sqrt(dx * dx + dy * dy);
  
  if (mag < 1e-6) return true;

  const ndx = dx / mag;
  const ndy = dy / mag;

  for (const wall of walls) {
    const intersect = getIntersection(observer.x, observer.y, ndx, ndy, wall);
    if (intersect && intersect.param < mag) {
      return false; // Obstantiated by a wall
    }
  }

  return true;
}
