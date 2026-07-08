import { create } from 'zustand';
import { ArrayBufferTarget, Muxer } from 'mp4-muxer';
import { refineDrawing } from './drawing.js';

const downloadCanvas = (canvas) => {
  if (!canvas) return;
  const link = document.createElement('a');
  link.download = `shape-sticker-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
  link.href = canvas.toDataURL('image/png');
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

const recordCanvas = (canvas, seconds, set) =>
  new Promise((resolve, reject) => {
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

    const stream = canvas.captureStream(60);
    const recorder = new MediaRecorder(stream, { mimeType: selected.mimeType });
    const chunks = [];

    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    });

    recorder.addEventListener('stop', () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunks, { type: selected.mimeType });
      downloadBlob(blob, selected.extension);
      resolve(selected.extension.toUpperCase());
    });

    recorder.addEventListener('error', () => {
      stream.getTracks().forEach((track) => track.stop());
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
    window.setTimeout(() => recorder.stop(), seconds * 1000);
  });

const nextAnimationFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

const getSupportedAvcConfig = async (width, height, fps) => {
  if (typeof VideoEncoder === 'undefined' || typeof VideoFrame === 'undefined') return null;

  const baseConfig = {
    width,
    height,
    framerate: fps,
    bitrate: 6_000_000,
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

const recordAppleMp4 = async (canvas, seconds, set) => {
  if (!canvas) throw new Error('The canvas is not ready yet.');

  const fps = 30;
  const width = Math.max(2, Math.floor(canvas.width / 2) * 2);
  const height = Math.max(2, Math.floor(canvas.height / 2) * 2);
  const config = await getSupportedAvcConfig(width, height, fps);

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
  const totalFrames = seconds * fps;

  let encoderError;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (error) => {
      encoderError = error;
    },
  });

  encoder.configure(config);
  set({ recording: true, videoStatus: 'Recording iPhone MP4...' });

  try {
    for (let index = 0; index < totalFrames; index += 1) {
      await nextAnimationFrame();
      if (encoderError) throw encoderError;

      frameContext.fillStyle = '#f4f2ea';
      frameContext.fillRect(0, 0, width, height);
      frameContext.drawImage(canvas, 0, 0, width, height);

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
    encoder.close();
  }
};

export const useStudioStore = create((set, get) => ({
  mode: 'preset',
  shape: 'sphere',
  material: {
    color: '#30d0a2',
    roughness: 0.34,
    metalness: 0.08,
    transmission: 0.16,
    opacity: 0.92,
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
    smoothness: 0.42,
    simplify: 0.18,
    cornerRadius: 0.22,
  },
  autoRotate: false,
  recording: false,
  videoStatus: '',
  drawPoints: [],
  outlinePoints: [],
  rendererCanvas: null,
  setMode: (mode) => set({ mode }),
  setShape: (shape) => set({ shape, mode: 'preset' }),
  setMaterial: (key, value) =>
    set((state) => ({ material: { ...state.material, [key]: value } })),
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
  setRendererCanvas: (rendererCanvas) => set({ rendererCanvas }),
  exportPng: () => downloadCanvas(get().rendererCanvas),
  exportVideo: async () => {
    const { rendererCanvas, recording } = get();
    if (recording) return;
    try {
      const format = await recordCanvas(rendererCanvas, 10, set);
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
    const { rendererCanvas, recording } = get();
    if (recording) return;
    try {
      const format = await recordAppleMp4(rendererCanvas, 10, set);
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
