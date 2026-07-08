import { create } from 'zustand';
import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import * as THREE from 'three';
import { refineDrawing } from './drawing.js';

export const exportPresets = [
  { id: 'sticker', label: 'Sticker PNG', width: 2048, height: 2048, fps: 60, duration: 10, bitrate: 12_000_000, transparent: true },
  { id: 'square', label: 'Square post', width: 1080, height: 1080, fps: 30, duration: 10, bitrate: 10_000_000, transparent: false },
  { id: 'story', label: 'Story/Reel', width: 1080, height: 1920, fps: 30, duration: 10, bitrate: 14_000_000, transparent: false },
  { id: 'landscape', label: 'Landscape', width: 1920, height: 1080, fps: 30, duration: 10, bitrate: 14_000_000, transparent: false },
];

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

const currentPreset = (id) => exportPresets.find((preset) => preset.id === id) ?? exportPresets[0];

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

  try {
    gl.setPixelRatio(1);
    gl.setSize(preset.width, preset.height, false);
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

const recordCanvas = (rendererContext, preset, set) =>
  new Promise((resolve, reject) => {
    const canvas = rendererContext?.gl?.domElement;
    if (!canvas?.captureStream || typeof MediaRecorder === 'undefined') {
      reject(new Error('This browser cannot record canvas video.'));
      return;
    }

    const candidates = [
      { mimeType: 'video/mp4;codecs=h264', extension: 'mp4' },
      { mimeType: 'video/mp4', extension: 'mp4' },
      { mimeType: 'video/webm;codecs=vp9', extension: 'webm' },
      { mimeType: 'video/webm;codecs=vp8', extension: 'webm' },
      { mimeType: 'video/webm', extension: 'webm' },
    ];
    const selected =
      candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate.mimeType)) ??
      candidates[candidates.length - 1];

    const oldSize = new THREE.Vector2();
    rendererContext.gl.getSize(oldSize);
    const oldPixelRatio = rendererContext.gl.getPixelRatio();
    rendererContext.gl.setPixelRatio(1);
    rendererContext.gl.setSize(preset.width, preset.height, false);

    const stream = canvas.captureStream(preset.fps);
    const recorder = new MediaRecorder(stream, {
      mimeType: selected.mimeType,
      videoBitsPerSecond: preset.bitrate,
    });
    const chunks = [];
    const restore = () => {
      rendererContext.gl.setPixelRatio(oldPixelRatio);
      rendererContext.gl.setSize(oldSize.x, oldSize.y, false);
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
          ? 'Recording MP4...'
          : 'Recording WebM; MP4 is not supported by this browser.',
    });
    recorder.start();
    window.setTimeout(() => recorder.stop(), preset.duration * 1000);
  });

const nextAnimationFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

const getSupportedAvcConfig = async (width, height, fps, bitrate) => {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') return null;

  const baseConfig = {
    width,
    height,
    framerate: fps,
    bitrate,
    avc: { format: 'avc' },
  };
  const codecCandidates = ['avc1.42E01E', 'avc1.42001E', 'avc1.4D401E'];

  for (const codec of codecCandidates) {
    const config = { ...baseConfig, codec };
    try {
      const support = await VideoEncoder.isConfigSupported(config);
      if (support.supported) return support.config;
    } catch {
      // Try the next H.264 profile.
    }
  }

  return null;
};

const recordAppleMp4 = async (rendererContext, preset, set) => {
  if (!rendererContext?.gl) throw new Error('The canvas is not ready yet.');

  const fps = preset.fps;
  const width = Math.max(2, Math.floor(preset.width / 2) * 2);
  const height = Math.max(2, Math.floor(preset.height / 2) * 2);
  const config = await getSupportedAvcConfig(width, height, fps, preset.bitrate);

  if (!config) {
    throw new Error('This browser cannot encode iPhone-compatible MP4. Try Chrome or Edge on desktop.');
  }

  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: {
      codec: 'avc',
      width,
      height,
      frameRate: fps,
    },
    fastStart: 'in-memory',
  });
  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = width;
  frameCanvas.height = height;
  const frameContext = frameCanvas.getContext('2d', { alpha: false });
  const totalFrames = preset.duration * fps;

  let encoderError;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (error) => {
      encoderError = error;
    },
  });

  encoder.configure(config);
  set({ recording: true, videoStatus: 'Recording iPhone MP4...' });

  const { gl, scene, camera } = rendererContext;
  const oldSize = new THREE.Vector2();
  gl.getSize(oldSize);
  const oldPixelRatio = gl.getPixelRatio();
  const oldBackground = scene.background;
  const oldClearAlpha = gl.getClearAlpha();
  const oldClearColor = new THREE.Color();
  gl.getClearColor(oldClearColor);

  gl.setPixelRatio(1);
  gl.setSize(width, height, false);
  scene.background = new THREE.Color('#f4f2ea');
  gl.setClearColor(0xf4f2ea, 1);

  try {
    for (let index = 0; index < totalFrames; index += 1) {
      await nextAnimationFrame();
      gl.render(scene, camera);
      if (encoderError) throw encoderError;

      frameContext.fillStyle = '#f4f2ea';
      frameContext.fillRect(0, 0, width, height);
      frameContext.drawImage(gl.domElement, 0, 0, width, height);

      const frame = new VideoFrame(frameCanvas, {
        timestamp: Math.round((index * 1_000_000) / fps),
        duration: Math.round(1_000_000 / fps),
      });

      encoder.encode(frame, { keyFrame: index % fps === 0 });
      frame.close();
    }

    await encoder.flush();
    muxer.finalize();
    downloadBlob(new Blob([target.buffer], { type: 'video/mp4' }), 'mp4');
    return 'MP4';
  } finally {
    scene.background = oldBackground;
    gl.setClearColor(oldClearColor, oldClearAlpha);
    gl.setPixelRatio(oldPixelRatio);
    gl.setSize(oldSize.x, oldSize.y, false);
    gl.render(scene, camera);
    encoder.close();
  }
};

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
  exportPreset: 'sticker',
  autoRotate: false,
  recording: false,
  videoStatus: '',
  drawPoints: [],
  outlinePoints: [],
  rendererContext: null,
  setMode: (mode) => set({ mode }),
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
      const last = state.drawPoints[state.drawPoints.length - 1];
      if (last) {
        const distance = Math.hypot(point.x - last.x, point.y - last.y);
        if (distance < 0.025) return state;
      }
      return { drawPoints: [...state.drawPoints, point] };
    }),
  convertDrawToMesh: () => {
    const { drawPoints, drawRefine } = get();
    const points = refineDrawing(drawPoints, drawRefine);
    if (points.length < 4) return;
    set({ outlinePoints: points, mode: 'draw' });
  },
  clearDrawing: () => set({ drawPoints: [], outlinePoints: [] }),
  editDrawing: () => set({ outlinePoints: [] }),
  setExportPreset: (exportPreset) => set({ exportPreset }),
  setRendererContext: (rendererContext) => set({ rendererContext }),
  exportPng: () => downloadCanvas(get().rendererContext, currentPreset(get().exportPreset)),
  exportVideo: async () => {
    const { rendererContext, recording, exportPreset } = get();
    if (recording) return;
    try {
      const format = await recordCanvas(rendererContext, currentPreset(exportPreset), set);
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
  exportAppleVideo: async () => {
    const { rendererContext, recording, exportPreset } = get();
    if (recording) return;
    try {
      const format = await recordAppleMp4(rendererContext, currentPreset(exportPreset), set);
      set({
        recording: false,
        videoStatus: `${format} export ready for iPhone.`,
      });
      window.setTimeout(() => {
        if (!get().recording) set({ videoStatus: '' });
      }, 4200);
    } catch (error) {
      set({
        recording: false,
        videoStatus: error.message,
      });
    }
  },
}));
