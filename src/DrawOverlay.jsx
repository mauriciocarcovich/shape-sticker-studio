import { useEffect, useMemo, useRef, useState } from 'react';
import { refineDrawing } from './drawing.js';
import { useStudioStore } from './store.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function eventToPoint(event, element) {
  const bounds = element.getBoundingClientRect();
  const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 3.4;
  const y = -(((event.clientY - bounds.top) / bounds.height - 0.5) * 2.55);
  return {
    x: clamp(x, -1.7, 1.7),
    y: clamp(y, -1.275, 1.275),
  };
}

function pointToSvg(point, width, height) {
  return {
    x: (point.x / 3.4 + 0.5) * width,
    y: (-point.y / 2.55 + 0.5) * height,
  };
}

export function DrawOverlay() {
  const ref = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const mode = useStudioStore((state) => state.mode);
  const drawingActive = useStudioStore((state) => state.drawingActive);
  const drawPoints = useStudioStore((state) => state.drawPoints);
  const drawRefine = useStudioStore((state) => state.drawRefine);
  const extrusionDepth = useStudioStore((state) => state.extrusionDepth);
  const setDrawPoints = useStudioStore((state) => state.setDrawPoints);
  const appendDrawPoint = useStudioStore((state) => state.appendDrawPoint);
  const refinedPoints = useMemo(
    () => refineDrawing(drawPoints, drawRefine),
    [drawPoints, drawRefine],
  );

  const visible = mode === 'draw' && drawingActive;

  const updateSize = () => {
    const bounds = ref.current?.getBoundingClientRect();
    if (bounds) setSize({ width: bounds.width, height: bounds.height });
  };

  useEffect(() => {
    if (!visible || !ref.current) return undefined;
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible]);

  if (!visible) return null;

  const startDrawing = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    updateSize();
    setDrawing(true);
    setDrawPoints([eventToPoint(event, event.currentTarget)]);
  };

  const continueDrawing = (event) => {
    if (!drawing) return;
    appendDrawPoint(eventToPoint(event, event.currentTarget));
  };

  const stopDrawing = (event) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDrawing(false);
  };

  const rawSvgPoints = drawPoints
    .map((point) => pointToSvg(point, size.width, size.height))
    .map((point) => `${point.x},${point.y}`)
    .join(' ');
  const refinedSvgPoints = refinedPoints
    .map((point) => pointToSvg(point, size.width, size.height))
    .map((point) => `${point.x},${point.y}`)
    .join(' ');
  const miniPoints = refinedPoints
    .map((point) => pointToSvg(point, 148, 104))
    .map((point) => `${point.x},${point.y}`)
    .join(' ');
  const miniOffset = 8 + extrusionDepth * 10;

  return (
    <div
      ref={ref}
      className="draw-overlay"
      onPointerDown={startDrawing}
      onPointerMove={continueDrawing}
      onPointerUp={stopDrawing}
      onPointerCancel={stopDrawing}
      role="presentation"
    >
      <svg viewBox={`0 0 ${size.width} ${size.height}`} preserveAspectRatio="none">
        <defs>
          <pattern id="draw-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(43,47,43,0.12)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#draw-grid)" />
        {drawPoints.length > 1 ? (
          <>
            <polyline
              points={rawSvgPoints}
              fill="none"
              stroke="rgba(22,24,22,0.44)"
              strokeWidth="4"
            />
            <polygon points={refinedSvgPoints} fill="rgba(48,208,162,0.18)" stroke="none" />
            <polyline
              points={refinedSvgPoints}
              fill="none"
              stroke="rgba(12,101,74,0.84)"
              strokeWidth="4"
            />
          </>
        ) : null}
      </svg>
      <div className="draw-badge">Outline sketch</div>
      {refinedPoints.length > 3 ? (
        <div className="thickness-preview" aria-hidden="true">
          <svg viewBox="0 0 176 130">
            <polygon
              points={miniPoints}
              transform={`translate(${miniOffset} ${miniOffset})`}
              fill="rgba(20,128,96,0.22)"
              stroke="rgba(20,128,96,0.34)"
              strokeWidth="2"
            />
            <polygon
              points={miniPoints}
              fill="rgba(48,208,162,0.42)"
              stroke="rgba(12,101,74,0.86)"
              strokeWidth="3"
            />
            <line
              x1="22"
              y1="109"
              x2={22 + miniOffset}
              y2={109 + miniOffset}
              stroke="rgba(30,33,31,0.36)"
              strokeWidth="2"
            />
            <line
              x1="154"
              y1="22"
              x2={154 + miniOffset}
              y2={22 + miniOffset}
              stroke="rgba(30,33,31,0.36)"
              strokeWidth="2"
            />
          </svg>
        </div>
      ) : null}
    </div>
  );
}
