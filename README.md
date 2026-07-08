# Shape Sticker Studio

Shape Sticker Studio is a local-first web app for creating transparent 3D sticker-style shapes. It supports preset shapes, hand-drawn 2D outlines, refined extrusion, material controls, lighting controls, PNG export, WebM video export, and an iPhone-oriented MP4 export path when the browser supports H.264 WebCodecs.

## Features

- Preset 3D shapes: sphere, cube, star, and noise-deformed blob
- Mouse orbit controls for rotating and inspecting the object
- Material controls for color, roughness, metalness, transmission, and opacity
- Lighting and shadow controls
- Transparent PNG export
- 10-second rotating WebM video export
- iPhone MP4 export when the current browser supports H.264 WebCodecs
- Draw mode for sketching a 2D outline and converting it into an extruded 3D mesh
- Drawing refinement modes: freeform, organic smooth, rounded rectangle, symmetric, hard edge, and phone slab
- Local-first: no backend service required

## Tech Stack

- Vite
- React
- Three.js
- React Three Fiber
- Drei
- Leva
- Zustand
- mp4-muxer

## Getting Started

Install dependencies:

```bash
npm install
```

Run the local dev server:

```bash
npm run dev
```

Open the local URL printed by Vite, usually:

```text
http://127.0.0.1:5173/
```

Build for production:

```bash
npm run build
```

## Export Notes

The PNG export uses the transparent WebGL canvas.

The WebM export is the most broadly available browser recording path on desktop browsers, but iPhone may not open WebM files.

The iPhone MP4 export attempts to create an H.264 MP4 through WebCodecs. If the browser does not expose that encoder, the app will show a status message instead of producing an incompatible file. MP4 does not preserve transparency reliably, so the iPhone export uses a solid studio background.

## Privacy

Shape Sticker Studio runs locally in the browser. It does not require API keys, external services, or a backend.

## License

MIT
