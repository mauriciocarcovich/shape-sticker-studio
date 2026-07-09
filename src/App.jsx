import { useControls } from 'leva';
import {
  Box,
  Circle,
  Download,
  Droplets,
  Hexagon,
  PenLine,
  Rotate3D,
  SlidersHorizontal,
  Sparkles,
  Smartphone,
  Sun,
  Trash2,
  Video,
  Waves,
} from 'lucide-react';
import { DrawOverlay } from './DrawOverlay.jsx';
import { StudioScene } from './StudioScene.jsx';
import { materialPresets, transparentLandscapeExport, useStudioStore } from './store.js';

const shapes = [
  { id: 'sphere', label: 'Sphere', icon: Circle },
  { id: 'cube', label: 'Cube', icon: Box },
  { id: 'star', label: 'Star', icon: Sparkles },
  { id: 'blob', label: 'Blob', icon: Waves },
  { id: 'capsule', label: 'Capsule', icon: Smartphone },
  { id: 'torus', label: 'Torus', icon: Circle },
  { id: 'cylinder', label: 'Cylinder', icon: Box },
  { id: 'cone', label: 'Cone', icon: Hexagon },
  { id: 'gem', label: 'Gem', icon: Sparkles },
  { id: 'heart', label: 'Heart', icon: Circle },
  { id: 'coin', label: 'Coin', icon: Circle },
];

const assistModes = [
  { id: 'freeform', label: 'Freeform' },
  { id: 'organic', label: 'Organic smooth' },
  { id: 'rounded', label: 'Rounded rectangle' },
  { id: 'symmetric', label: 'Symmetric' },
  { id: 'hard', label: 'Hard edge' },
  { id: 'phone', label: 'Phone slab' },
];

const depthProfiles = [
  { id: 'flat', label: 'Flat slab' },
  { id: 'puffy', label: 'Puffy sticker' },
  { id: 'domed', label: 'Soft dome' },
  { id: 'ridge', label: 'Ribbed depth' },
];

const drawingPlanes = [
  { id: 'xy', label: 'XY' },
  { id: 'xz', label: 'XZ' },
  { id: 'yz', label: 'YZ' },
];

const materialOptions = Object.entries(materialPresets).map(([id, preset]) => ({
  id,
  label: preset.label,
}));

function RangeControl({ label, value, min, max, step, onChange }) {
  return (
    <label className="control-row">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <output>{Number(value).toFixed(step < 0.1 ? 2 : 1)}</output>
    </label>
  );
}

function SelectControl({ label, value, options, onChange }) {
  return (
    <label className="select-row">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleControl({ label, checked, onChange }) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

function AdvancedControls() {
  const autoRotate = useStudioStore((state) => state.autoRotate);
  const blob = useStudioStore((state) => state.blob);
  const extrusionDepth = useStudioStore((state) => state.extrusionDepth);
  const bevelSize = useStudioStore((state) => state.bevelSize);
  const drawRefine = useStudioStore((state) => state.drawRefine);
  const setAutoRotate = useStudioStore((state) => state.setAutoRotate);
  const setBlob = useStudioStore((state) => state.setBlob);
  const setExtrusionDepth = useStudioStore((state) => state.setExtrusionDepth);
  const setBevelSize = useStudioStore((state) => state.setBevelSize);
  const setDrawRefine = useStudioStore((state) => state.setDrawRefine);

  useControls(
    'Fine tune',
    {
      autoRotate: {
        value: autoRotate,
        label: 'Auto rotate',
        onChange: setAutoRotate,
      },
      blobNoise: {
        value: blob.intensity,
        min: 0,
        max: 0.55,
        step: 0.01,
        label: 'Surface noise',
        onChange: (value) => setBlob('intensity', value),
      },
      blobFrequency: {
        value: blob.frequency,
        min: 0.8,
        max: 6,
        step: 0.1,
        label: 'Noise freq',
        onChange: (value) => setBlob('frequency', value),
      },
      extrusionDepth: {
        value: extrusionDepth,
        min: 0.12,
        max: 1.5,
        step: 0.01,
        label: 'Extrude',
        onChange: setExtrusionDepth,
      },
      bevelSize: {
        value: bevelSize,
        min: 0,
        max: 0.22,
        step: 0.01,
        label: 'Bevel',
        onChange: setBevelSize,
      },
      sketchSmooth: {
        value: drawRefine.smoothness,
        min: 0,
        max: 1,
        step: 0.01,
        label: 'Sketch smooth',
        onChange: (value) => setDrawRefine('smoothness', value),
      },
      sketchInflate: {
        value: drawRefine.inflate,
        min: 0,
        max: 1,
        step: 0.01,
        label: 'Inflate',
        onChange: (value) => setDrawRefine('inflate', value),
      },
    },
    [
      autoRotate,
      blob.intensity,
      blob.frequency,
      extrusionDepth,
      bevelSize,
      drawRefine.smoothness,
      drawRefine.inflate,
    ],
  );

  return null;
}

function ControlPanel() {
  const mode = useStudioStore((state) => state.mode);
  const shape = useStudioStore((state) => state.shape);
  const materialPreset = useStudioStore((state) => state.materialPreset);
  const material = useStudioStore((state) => state.material);
  const lighting = useStudioStore((state) => state.lighting);
  const blob = useStudioStore((state) => state.blob);
  const extrusionDepth = useStudioStore((state) => state.extrusionDepth);
  const bevelSize = useStudioStore((state) => state.bevelSize);
  const drawRefine = useStudioStore((state) => state.drawRefine);
  const drawPoints = useStudioStore((state) => state.drawPoints);
  const committedDrawings = useStudioStore((state) => state.committedDrawings);
  const autoRotate = useStudioStore((state) => state.autoRotate);
  const recording = useStudioStore((state) => state.recording);
  const videoStatus = useStudioStore((state) => state.videoStatus);
  const setMode = useStudioStore((state) => state.setMode);
  const setShape = useStudioStore((state) => state.setShape);
  const setMaterial = useStudioStore((state) => state.setMaterial);
  const setLighting = useStudioStore((state) => state.setLighting);
  const setBlob = useStudioStore((state) => state.setBlob);
  const setExtrusionDepth = useStudioStore((state) => state.setExtrusionDepth);
  const setBevelSize = useStudioStore((state) => state.setBevelSize);
  const setDrawRefine = useStudioStore((state) => state.setDrawRefine);
  const setDrawPlane = useStudioStore((state) => state.setDrawPlane);
  const setAutoRotate = useStudioStore((state) => state.setAutoRotate);
  const applyMaterialPreset = useStudioStore((state) => state.applyMaterialPreset);
  const convertDrawToMesh = useStudioStore((state) => state.convertDrawToMesh);
  const clearDrawing = useStudioStore((state) => state.clearDrawing);
  const editDrawing = useStudioStore((state) => state.editDrawing);
  const exportPng = useStudioStore((state) => state.exportPng);
  const exportVideo = useStudioStore((state) => state.exportVideo);

  const hasDrawing = drawPoints.length >= 4;
  const hasMesh = committedDrawings.length > 0;

  return (
    <aside className="control-panel" aria-label="Shape controls">
      <div className="brand-block">
        <Hexagon aria-hidden="true" />
        <div>
          <h1>Shape Sticker Studio</h1>
          <p>Transparent 3D sticker exports</p>
        </div>
      </div>

      <section className="panel-section">
        <div className="segmented" aria-label="Studio mode">
          <button className={mode === 'preset' ? 'active' : ''} onClick={() => setMode('preset')}>
            <Box size={16} aria-hidden="true" />
            Preset
          </button>
          <button className={mode === 'draw' ? 'active' : ''} onClick={() => setMode('draw')}>
            <PenLine size={16} aria-hidden="true" />
            Draw
          </button>
        </div>
      </section>

      {mode === 'preset' ? (
        <section className="panel-section">
          <h2>Shape</h2>
          <div className="shape-grid">
            {shapes.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={shape === id ? 'shape-button active' : 'shape-button'}
                onClick={() => setShape(id)}
                title={label}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div className="sub-controls">
            <RangeControl
              label="Depth"
              min={0.12}
              max={1.5}
              step={0.01}
              value={extrusionDepth}
              onChange={setExtrusionDepth}
            />
            <RangeControl
              label="Bevel"
              min={0}
              max={0.22}
              step={0.01}
              value={bevelSize}
              onChange={setBevelSize}
            />
            <RangeControl
              label="Noise"
              min={0}
              max={0.55}
              step={0.01}
              value={blob.intensity}
              onChange={(value) => setBlob('intensity', value)}
            />
            <RangeControl
              label="Frequency"
              min={0.8}
              max={6}
              step={0.1}
              value={blob.frequency}
              onChange={(value) => setBlob('frequency', value)}
            />
          </div>
        </section>
      ) : (
        <section className="panel-section">
          <h2>Outline</h2>
          <div className="action-grid">
            <button className="primary-action" disabled={!hasDrawing} onClick={convertDrawToMesh}>
              <Droplets size={16} aria-hidden="true" />
              Add
            </button>
            <button onClick={hasMesh ? editDrawing : clearDrawing}>
              <PenLine size={16} aria-hidden="true" />
              {hasMesh ? 'Undo' : 'Reset'}
            </button>
            <button onClick={clearDrawing}>
              <Trash2 size={16} aria-hidden="true" />
              Clear
            </button>
          </div>
          <div className="plane-switch" aria-label="Drawing plane">
            {drawingPlanes.map((plane) => (
              <button
                key={plane.id}
                className={drawRefine.plane === plane.id ? 'active' : ''}
                onClick={() => setDrawPlane(plane.id)}
              >
                {plane.label}
              </button>
            ))}
          </div>
          <RangeControl
            label="Depth"
            min={0.12}
            max={1.5}
            step={0.01}
            value={extrusionDepth}
            onChange={setExtrusionDepth}
          />
          <RangeControl
            label="Bevel"
            min={0}
            max={0.22}
            step={0.01}
            value={bevelSize}
            onChange={setBevelSize}
          />
          <SelectControl
            label="Assist"
            value={drawRefine.assist}
            options={assistModes}
            onChange={(value) => setDrawRefine('assist', value)}
          />
          <RangeControl
            label="Smooth"
            min={0}
            max={1}
            step={0.01}
            value={drawRefine.smoothness}
            onChange={(value) => setDrawRefine('smoothness', value)}
          />
          <RangeControl
            label="Simplify"
            min={0}
            max={1}
            step={0.01}
            value={drawRefine.simplify}
            onChange={(value) => setDrawRefine('simplify', value)}
          />
          <RangeControl
            label="Corners"
            min={0.02}
            max={0.48}
            step={0.01}
            value={drawRefine.cornerRadius}
            onChange={(value) => setDrawRefine('cornerRadius', value)}
          />
          <SelectControl
            label="Depth type"
            value={drawRefine.depthProfile}
            options={depthProfiles}
            onChange={(value) => setDrawRefine('depthProfile', value)}
          />
          <RangeControl
            label="Inflate"
            min={0}
            max={1}
            step={0.01}
            value={drawRefine.inflate}
            onChange={(value) => setDrawRefine('inflate', value)}
          />
        </section>
      )}

      <section className="panel-section">
        <h2>Material</h2>
        <SelectControl
          label="Preset"
          value={materialPreset}
          options={[{ id: 'custom', label: 'Custom' }, ...materialOptions]}
          onChange={(value) => {
            if (value !== 'custom') applyMaterialPreset(value);
          }}
        />
        <label className="color-row">
          <span>Color</span>
          <input
            type="color"
            value={material.color}
            onChange={(event) => setMaterial('color', event.target.value)}
          />
        </label>
        <RangeControl
          label="Roughness"
          min={0}
          max={1}
          step={0.01}
          value={material.roughness}
          onChange={(value) => setMaterial('roughness', value)}
        />
        <RangeControl
          label="Metalness"
          min={0}
          max={1}
          step={0.01}
          value={material.metalness}
          onChange={(value) => setMaterial('metalness', value)}
        />
        <RangeControl
          label="Transmission"
          min={0}
          max={1}
          step={0.01}
          value={material.transmission}
          onChange={(value) => setMaterial('transmission', value)}
        />
        <RangeControl
          label="Opacity"
          min={0.08}
          max={1}
          step={0.01}
          value={material.opacity}
          onChange={(value) => setMaterial('opacity', value)}
        />
      </section>

      <section className="panel-section">
        <h2>Lighting</h2>
        <RangeControl
          label="Ambient"
          min={0}
          max={2}
          step={0.01}
          value={lighting.ambient}
          onChange={(value) => setLighting('ambient', value)}
        />
        <RangeControl
          label="Key"
          min={0}
          max={5}
          step={0.01}
          value={lighting.key}
          onChange={(value) => setLighting('key', value)}
        />
        <RangeControl
          label="Fill"
          min={0}
          max={3}
          step={0.01}
          value={lighting.fill}
          onChange={(value) => setLighting('fill', value)}
        />
        <RangeControl
          label="Shadow"
          min={0}
          max={0.8}
          step={0.01}
          value={lighting.shadowOpacity}
          onChange={(value) => setLighting('shadowOpacity', value)}
        />
        <ToggleControl
          label="Shadows"
          checked={lighting.shadows}
          onChange={(value) => setLighting('shadows', value)}
        />
        <ToggleControl label="Auto rotate" checked={autoRotate} onChange={setAutoRotate} />
      </section>

      <div className="export-stack">
        <section className="panel-section export-options">
          <h2>Export</h2>
          <p className="export-meta">
            {transparentLandscapeExport.width}x{transparentLandscapeExport.height} transparent
          </p>
        </section>
        <button className="export-button" onClick={exportPng}>
          <Download size={18} aria-hidden="true" />
          Export PNG
        </button>
        <button className="export-button secondary-export" disabled={recording} onClick={exportVideo}>
          <Video size={18} aria-hidden="true" />
          {recording ? 'Recording 10s...' : 'Export transparent WebM'}
        </button>
        {videoStatus ? <p className="export-status">{videoStatus}</p> : null}
      </div>
    </aside>
  );
}

export default function App() {
  return (
    <main className="app-shell">
      <AdvancedControls />
      <ControlPanel />
      <section className="studio-stage" aria-label="3D canvas">
        <div className="stage-toolbar">
          <div>
            <span className="status-dot" />
            <span>Transparent canvas</span>
          </div>
          <div>
            <Rotate3D size={16} aria-hidden="true" />
            <span>Orbit controls</span>
          </div>
          <div>
            <Sun size={16} aria-hidden="true" />
            <span>Live lighting</span>
          </div>
          <div>
            <SlidersHorizontal size={16} aria-hidden="true" />
            <span>Refined mesh</span>
          </div>
          <div>
            <Smartphone size={16} aria-hidden="true" />
            <span>Object assist</span>
          </div>
        </div>
        <div className="canvas-frame">
          <StudioScene />
          <DrawOverlay />
        </div>
      </section>
    </main>
  );
}
