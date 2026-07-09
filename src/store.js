import { create } from 'zustand';
import * as THREE from 'three';
import { refineDrawing } from './drawing.js';

export const transparentLandscapeExport = {
  id: 'transparent-landscape',
  label: 'Transparent landscape',
  width: 1920,
  height: 1080,
  fps: 60,
  duration: 10,
  bitrate: 18_000_000,
  transparent: true,
};

function buildOutline(drawPoints, drawRefine) {
  const points = refineDrawing(drawPoints, drawRefine);
  if (points.length < 4) return null;
  return points;
}

export const materialPresets = {
  mint: {
    label: 'Mint gel',
    material: { color: '#30d0a2', roughness: 0.34, metalness: 0.08, transmission: 0.16, opacity: 0.92, textureStyle: 'none' },
  },
  clay: {
    label: 'Soft clay',
    material: { color: '#e47b65', roughness: 0.82, metalness: 0.02, transmission: 0, opacity: 1, textureStyle: 'clay' },
  },
  foam: {
    label: 'Foam',
    material: { color: '#f6d965', roughness: 0.94, metalness: 0, transmission: 0, opacity: 1, textureStyle: 'foam' },
  },
  wood: {
    label: 'Wood',
    material: { color: '#b8783f', roughness: 0.68, metalness: 0.02, transmission: 0, opacity: 1, textureStyle: 'wood' },
  },
  chrome: {
    label: 'Chrome',
    material: { color: '#d7dde4', roughness: 0.16, metalness: 1, transmission: 0, opacity: 1, textureStyle: 'none' },
  },
  glass: {
    label: 'Glass',
    material: { color: '#bfefff', roughness: 0.04, metalness: 0, transmission: 0.72, opacity: 0.48, textureStyle: 'none' },
  },
  rubber: {
    label: 'Rubber',
    material: { color: '#222827', roughness: 0.74, metalness: 0, transmission: 0, opacity: 1, textureStyle: 'rubber' },
  },
  holographic: {
    label: 'Holographic',
    material: { color: '#b7f3ff', roughness: 0.22, metalness: 0.52, transmission: 0.1, opacity: 0.94, textureStyle: 'holo' },
  },
};

const withRenderSize = async (rendererContext, preset, render, afterRender) => {
  if (!rendererContext?.gl || !rendererContext.scene || !rendererContext.camera) return null;
  const { gl, scene, camera } = rendererContext;
  const oldSize = new THREE.Vector2();
  gl.getSize(oldSize);
  const oldPixelRatio = gl.getPixelRatio();
  const oldBackground = scene.background;
  const oldClearAlpha = gl.getClearAlpha();
  const oldClearColor = new THREE.Color();
  gl.getClearColor(oldClearColor);
  const oldAspect = camera.aspect;

  try {
    gl.setPixelRatio(1);
    gl.setSize(preset.width, preset.height, false);
    if (camera.isPerspectiveCamera) {
      camera.aspect = preset.width / preset.height;
      camera.updateProjectionMatrix();
    }
    if (preset.transparent) {
      scene.background = null;
      gl.setClearColor(0x000000, 0);
    } else {
      scene.background = new THREE.Color('#f4f2ea');
      gl.setClearColor(0xf4f2ea, 1);
    }

    const result = await render(gl, scene, camera);
    if (afterRender) await afterRender(result);
    return result;
  } finally {
    scene.background = oldBackground;
    gl.setClearColor(oldClearColor, oldClearAlpha);
    gl.setPixelRatio(oldPixelRatio);
    gl.setSize(oldSize.x, oldSize.y, false);
    if (camera.isPerspectiveCamera) {
      camera.aspect = oldAspect;
      camera.updateProjectionMatrix();
    }
    gl.render(scene, camera);
  }
};

const downloadCanvas = async (rendererContext, preset) => {
  if (!rendererContext?.gl) return;
  const link = document.createElement('a');
  link.download = `shape-sticker-${preset.id}-${preset.width}x${preset.height}-${new Date()
    .toISOString()
    .replace(/[:.]/g, '-')}.png`;
  link.href = await withRenderSize(rendererContext, preset, (gl, scene, camera) => {
    gl.render(scene, camera);
    return gl.domElement.toDataURL('image/png');
  });
  link.click();
};

const downloadBlob = (blob, extension) => {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.download = `shape-sticker-rotation-${new Date().toISOString().replace(/[:.]/g, '-')}.${extension}`;
  link.href = url;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
};

const mediaRecorderCandidates = {
  mp4: [
    { mimeType: 'video/mp4;codecs=h264', extension: 'mp4' },
    { mimeType: 'video/mp4;codecs=avc1', extension: 'mp4' },
    { mimeType: 'video/mp4', extension: 'mp4' },
  ],
  webm: [
    { mimeType: 'video/webm;codecs=vp9', extension: 'webm' },
    { mimeType: 'video/webm;codecs=vp8', extension: 'webm' },
    { mimeType: 'video/webm', extension: 'webm' },
  ],
};

const recordCanvas = (rendererContext, preset, set, format = 'mp4') =>
  new Promise((resolve, reject) => {
    const canvas = rendererContext?.gl?.domElement;
    if (!canvas?.captureStream || typeof MediaRecorder === 'undefined') {
      reject(new Error('This browser cannot record canvas video.'));
      return;
    }

    const candidates = mediaRecorderCandidates[format] ?? mediaRecorderCandidates.mp4;
    const selected =
      candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate.mimeType)) ?? null;

    if (!selected) {
      reject(new Error(`${format.toUpperCase()} recording is not supported by this browser.`));
      return;
    }

    const oldSize = new THREE.Vector2();
    rendererContext.gl.getSize(oldSize);
    const oldPixelRatio = rendererContext.gl.getPixelRatio();
    const oldBackground = rendererContext.scene.background;
    const oldClearAlpha = rendererContext.gl.getClearAlpha();
    const oldClearColor = new THREE.Color();
    rendererContext.gl.getClearColor(oldClearColor);
    const oldAspect = rendererContext.camera.aspect;
    rendererContext.gl.setPixelRatio(1);
    rendererContext.gl.setSize(preset.width, preset.height, false);
    rendererContext.scene.background = null;
    rendererContext.gl.setClearColor(0x000000, 0);
    if (rendererContext.camera.isPerspectiveCamera) {
      rendererContext.camera.aspect = preset.width / preset.height;
      rendererContext.camera.updateProjectionMatrix();
    }

    const stream = canvas.captureStream(preset.fps);
    const recorder = new MediaRecorder(stream, {
      mimeType: selected.mimeType,
      videoBitsPerSecond: preset.bitrate,
    });
    const chunks = [];
    const restore = () => {
      rendererContext.scene.background = oldBackground;
      rendererContext.gl.setClearColor(oldClearColor, oldClearAlpha);
      rendererContext.gl.setPixelRatio(oldPixelRatio);
      rendererContext.gl.setSize(oldSize.x, oldSize.y, false);
      if (rendererContext.camera.isPerspectiveCamera) {
        rendererContext.camera.aspect = oldAspect;
        rendererContext.camera.updateProjectionMatrix();
      }
      rendererContext.gl.render(rendererContext.scene, rendererContext.camera);
    };

    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    });

    recorder.addEventListener('stop', () => {
      stream.getTracks().forEach((track) => track.stop());
      restore();
      const blob = new Blob(chunks, { type: selected.mimeType });
      downloadBlob(blob, selected.extension);
      resolve(selected.extension.toUpperCase());
    });

    recorder.addEventListener('error', () => {
      stream.getTracks().forEach((track) => track.stop());
      restore();
      reject(new Error('Video recording failed.'));
    });

    set({
      recording: true,
      videoStatus:
        selected.extension === 'mp4'
          ? 'Recording MPEG-4 from transparent canvas...'
          : 'Recording transparent WebM...',
    });
    recorder.start();
    window.setTimeout(() => recorder.stop(), preset.duration * 1000);
  });

export const useStudioStore = create((set, get) => ({
  mode: 'preset',
  shape: 'sphere',
  materialPreset: 'mint',
  material: {
    color: '#30d0a2',
    roughness: 0.34,
    metalness: 0.08,
    transmission: 0.16,
    opacity: 0.92,
    textureStyle: 'none',
  },
  lighting: {
    ambient: 0.62,
    key: 2.35,
    fill: 0.78,
    shadows: true,
    shadowOpacity: 0.32,
  },
  blob: {
    intensity: 0.22,
    frequency: 2.6,
  },
  extrusionDepth: 0.55,
  bevelSize: 0.08,
  drawRefine: {
    assist: 'freeform',
    depthProfile: 'flat',
    inflate: 0.28,
    smoothness: 0.42,
    simplify: 0.18,
    cornerRadius: 0.22,
  },
  autoRotate: false,
  recording: false,
  videoStatus: '',
  drawPoints: [],
  drawingActive: true,
  outlinePoints: [],
  rendererContext: null,
  setMode: (mode) =>
    set((state) => ({
      mode,
      drawingActive: mode === 'draw' && state.outlinePoints.length === 0 ? true : state.drawingActive,
    })),
  setShape: (shape) => set({ shape, mode: 'preset' }),
  applyMaterialPreset: (presetId) =>
    set((state) => ({
      materialPreset: presetId,
      material: {
        ...state.material,
        ...(materialPresets[presetId]?.material ?? materialPresets.mint.material),
      },
    })),
  setMaterial: (key, value) =>
    set((state) => ({ materialPreset: 'custom', material: { ...state.material, [key]: value } })),
  setLighting: (key, value) =>
    set((state) => ({ lighting: { ...state.lighting, [key]: value } })),
  setBlob: (key, value) => set((state) => ({ blob: { ...state.blob, [key]: value } })),
  setExtrusionDepth: (extrusionDepth) => set({ extrusionDepth }),
  setBevelSize: (bevelSize) => set({ bevelSize }),
  setDrawRefine: (key, value) =>
    set((state) => ({ drawRefine: { ...state.drawRefine, [key]: value } })),
  setAutoRotate: (autoRotate) => set({ autoRotate }),
  setDrawPoints: (drawPoints) => set({ drawPoints }),
  appendDrawPoint: (point) =>
    set((state) => {
      if (!state.drawingActive) return state;
      const last = state.drawPoints[state.drawPoints.length - 1];
      if (last) {
        const distance = Math.hypot(point.x - last.x, point.y - last.y);
        if (distance < 0.025) return state;
      }
      return { drawPoints: [...state.drawPoints, point] };
    }),
  convertDrawToMesh: () => {
    const { drawPoints, drawRefine } = get();
    const outlinePoints = buildOutline(drawPoints, drawRefine);
    if (!outlinePoints) return;
    set({
      outlinePoints,
      drawPoints: [],
      mode: 'draw',
      drawingActive: true,
    });
  },
  finishDrawing: () => {
    const { drawPoints, drawRefine } = get();
    const outlinePoints = buildOutline(drawPoints, drawRefine);
    if (!outlinePoints) {
      set({ drawPoints: [], mode: 'draw', drawingActive: false });
      return;
    }
    set({
      outlinePoints,
      drawPoints: [],
      mode: 'draw',
      drawingActive: false,
    });
  },
  resumeDrawing: () => set({ mode: 'draw', drawingActive: true }),
  clearDrawing: () =>
    set({
      drawPoints: [],
      drawingActive: true,
      outlinePoints: [],
    }),
  editDrawing: () => set({ drawPoints: [], drawingActive: true }),
  setRendererContext: (rendererContext) => set({ rendererContext }),
  exportPng: () => downloadCanvas(get().rendererContext, transparentLandscapeExport),
  exportVideo: async () => {
    const { rendererContext, recording } = get();
    if (recording) return;
    try {
      const format = await recordCanvas(rendererContext, transparentLandscapeExport, set, 'mp4');
      set({
        recording: false,
        videoStatus: `${format} export ready.`,
      });
      window.setTimeout(() => {
        if (!get().recording) set({ videoStatus: '' });
      }, 3600);
    } catch (error) {
      set({
        recording: false,
        videoStatus: error.message,
      });
    }
  },
  exportTransparentWebm: async () => {
    const { rendererContext, recording } = get();
    if (recording) return;
    try {
      const format = await recordCanvas(rendererContext, transparentLandscapeExport, set, 'webm');
      set({
        recording: false,
        videoStatus: `${format} export ready with alpha-capable transparency.`,
      });
      window.setTimeout(() => {
        if (!get().recording) set({ videoStatus: '' });
      }, 3600);
    } catch (error) {
      set({
        recording: false,
        videoStatus: error.message,
      });
    }
  },
}));
