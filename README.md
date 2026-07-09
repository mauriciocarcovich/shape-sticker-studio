# Shape Sticker Studio

Shape Sticker Studio is a local-first web app for creating transparent 3D sticker-style shapes. It supports preset shapes, hand-drawn outlines, refined extrusion, material controls, lighting controls, transparent PNG export, and transparent WebM video export.

## Features

- Preset 3D shapes: sphere, cube, star, blob, capsule, torus, cylinder, cone, gem, heart, and coin
- Global shape tuning for depth, bevel, surface noise, and noise frequency
- Mouse orbit controls for rotating and inspecting the object
- Material controls for color, roughness, metalness, transmission, and opacity
- Lighting and shadow controls
- Transparent PNG export
- Standard 1920x1080 transparent landscape export
- 10-second rotating transparent WebM video export
- Draw mode for sketching a 2D outline and converting it into an extruded 3D mesh
- Drawing plane controls for XY, XZ, and YZ sketching
- Additive draw workflow for building up multiple committed sketches across different planes
- Drawing refinement modes: freeform, organic smooth, rounded rectangle, symmetric, hard edge, and phone slab
- Depth profile controls for drawn meshes: flat slab, puffy sticker, soft dome, and ribbed depth
- Material presets with procedural texture styles including clay, foam, wood, rubber, chrome, glass, and holographic
- Mobile-friendly layout with a sticky canvas preview above compact controls
- Local-first: no backend service required

## Tech Stack

- Vite
- React
- Three.js
- React Three Fiber
- Drei
- Leva
- Zustand

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

The PNG export renders a standard transparent 1920x1080 landscape frame.

The WebM export records the same transparent 1920x1080 landscape frame. WebM is used because browser MP4 export does not reliably preserve alpha transparency.

Some video players display transparent WebM over black because the player background is black. The file is still exported with an alpha-capable WebM path when the browser supports it.

## Privacy

Shape Sticker Studio runs locally in the browser. It does not require API keys, external services, or a backend.

## License

MIT
