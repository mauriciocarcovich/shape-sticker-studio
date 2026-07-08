# Shape Sticker Studio

Shape Sticker Studio is a local-first web app for creating transparent 3D sticker-style shapes. It supports preset shapes, hand-drawn 2D outlines, refined extrusion, material controls, lighting controls, PNG export, WebM video export, and an iPhone-oriented MP4 export path when the browser supports H.264 WebCodecs.

## Features

- Preset 3D shapes: sphere, cube, star, blob, capsule, torus, cylinder, cone, gem, heart, and coin
- Mouse orbit controls for rotating and inspecting the object
- Material controls for color, roughness, metalness, transmission, and opacity
- Lighting and shadow controls
- Transparent PNG export
- Export presets for transparent sticker PNG, square posts, story/reel video, and landscape output
- 10-second rotating WebM video export with preset-based resolution and bitrate
- iPhone MP4 export when the current browser supports H.264 WebCodecs
- Draw mode for sketching a 2D outline and converting it into an extruded 3D mesh
- Drawing refinement modes: freeform, organic smooth, rounded rectangle, symmetric, hard edge, and phone slab
- Depth profile controls for drawn meshes: flat slab, puffy sticker, soft dome, and ribbed depth
- Material presets with procedural texture styles including clay, foam, wood, rubber, chrome, glass, and holographic
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

The PNG export can render higher-resolution output than the editing preview. Use the export preset menu for transparent sticker, square post, story/reel, or landscape dimensions.

The WebM export is the most broadly available browser recording path on desktop browsers, but iPhone may not open WebM files. WebM export uses the selected export preset's resolution, frame rate, and bitrate.

The iPhone MP4 export attempts to create an H.264 MP4 through WebCodecs. If the browser does not expose that encoder, the app will show a status message instead of producing an incompatible file. MP4 does not preserve transparency reliably, so the iPhone export uses a solid studio background.

## Privacy

Shape Sticker Studio runs locally in the browser. It does not require API keys, external services, or a backend.

## License

MIT
