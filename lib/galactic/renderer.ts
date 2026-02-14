// CURSOR: Drawing functions for canvas
// Renders objects, dependencies, glow effects

import type { CanvasObject, Dependency } from './types';

// Draw a planet/satellite/moon
export function drawObject(
  ctx: CanvasRenderingContext2D,
  obj: CanvasObject,
  isHovered: boolean = false,
  isSelected: boolean = false
) {
  const { position, radius, color } = obj;

  ctx.save();

  // Glow effect on hover
  if (isHovered || isSelected) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
  }

  // Draw circle
  ctx.beginPath();
  ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // Border
  ctx.strokeStyle = isSelected ? '#ffffff' : color;
  ctx.lineWidth = isSelected ? 3 : 1;
  ctx.stroke();

  // Progress ring (if available)
  if (obj.progress !== undefined && obj.progress > 0) {
    const progressAngle = (obj.progress / 100) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(
      position.x,
      position.y,
      radius + 5,
      -Math.PI / 2,
      -Math.PI / 2 + progressAngle
    );
    ctx.strokeStyle = '#00d9ff';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  ctx.restore();

  // Label (for larger objects)
  if (radius > 15) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.min(radius / 3, 14)}px "Space Grotesk", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const maxWidth = radius * 1.8;
    const text = obj.name.length > 20 ? obj.name.substring(0, 17) + '...' : obj.name;
    
    ctx.fillText(text, position.x, position.y + radius + 15, maxWidth);
    ctx.restore();
  }
}

// Draw Bezier curve for dependency
export function drawDependency(
  ctx: CanvasRenderingContext2D,
  dep: Dependency
) {
  if (!dep.fromPos || !dep.toPos) return;

  const { fromPos, toPos } = dep;

  // Calculate control points for smooth curve
  const dx = toPos.x - fromPos.x;
  const dy = toPos.y - fromPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  const control1 = {
    x: fromPos.x + dx * 0.3 - dy * 0.2,
    y: fromPos.y + dy * 0.3 + dx * 0.2,
  };
  const control2 = {
    x: toPos.x - dx * 0.3 + dy * 0.2,
    y: toPos.y - dy * 0.3 - dx * 0.2,
  };

  ctx.save();

  // Draw curve
  ctx.beginPath();
  ctx.moveTo(fromPos.x, fromPos.y);
  ctx.bezierCurveTo(
    control1.x,
    control1.y,
    control2.x,
    control2.y,
    toPos.x,
    toPos.y
  );

  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.5;
  ctx.stroke();

  // Arrow head at destination
  const arrowSize = 8;
  const angle = Math.atan2(toPos.y - control2.y, toPos.x - control2.x);

  ctx.beginPath();
  ctx.moveTo(toPos.x, toPos.y);
  ctx.lineTo(
    toPos.x - arrowSize * Math.cos(angle - Math.PI / 6),
    toPos.y - arrowSize * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    toPos.x - arrowSize * Math.cos(angle + Math.PI / 6),
    toPos.y - arrowSize * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();

  ctx.fillStyle = '#a855f7';
  ctx.fill();

  ctx.restore();
}

// Draw background stars
export function drawStarfield(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  starCount: number = 200
) {
  ctx.save();
  ctx.fillStyle = '#ffffff';

  for (let i = 0; i < starCount; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() * 2;

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// Clear canvas
export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  ctx.fillStyle = '#0a0e1a'; // Deep space background
  ctx.fillRect(0, 0, width, height);
}
