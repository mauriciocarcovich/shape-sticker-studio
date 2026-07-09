import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { drawingBounds, refineDrawing } from './drawing.js';
import { useStudioStore } from './store.js';

function pseudoNoise(x, y, z) {
  const a = Math.sin(x * 1.73 + y * 2.11 + z * 0.91);
  const b = Math.sin(x * 3.33 - y * 1.17 + z * 2.47);
  const c = Math.cos(x * 0.83 + y * 3.71 - z * 1.51);
  return (a + b + c) / 3;
}

function applySurfaceNoise(geometry, intensity, frequency) {
  if (intensity <= 0) {
    geometry.computeVertexNormals();
    return geometry;
  }

  const position = geometry.attributes.position;
  const normal = geometry.attributes.normal;
  const vertex = new THREE.Vector3();
  const normalVector = new THREE.Vector3();

  geometry.computeVertexNormals();

  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index);
    if (normal) normalVector.fromBufferAttribute(normal, index);
    else normalVector.copy(vertex).normalize();
    const noise = pseudoNoise(vertex.x * frequency, vertex.y * frequency, vertex.z * frequency);
    const ripple = Math.sin((vertex.x - vertex.y + vertex.z) * frequency * 1.7) * 0.24;
    vertex.addScaledVector(normalVector.normalize(), intensity * 0.22 * (noise + ripple));
    position.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function StarGeometry() {
  const blob = useStudioStore((state) => state.blob);
  const extrusionDepth = useStudioStore((state) => state.extrusionDepth);
  const bevelSize = useStudioStore((state) => state.bevelSize);
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const points = 10;
    for (let index = 0; index <= points; index += 1) {
      const radius = index % 2 === 0 ? 1.15 : 0.5;
      const angle = (index / points) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (index === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: extrusionDepth,
      bevelEnabled: true,
      bevelSegments: 6,
      bevelSize: Math.min(bevelSize, extrusionDepth * 0.2),
      bevelThickness: Math.min(bevelSize * 1.2, extrusionDepth * 0.24),
      curveSegments: 16,
    });
    geo.center();
    return applySurfaceNoise(geo, blob.intensity, blob.frequency);
  }, [bevelSize, blob.frequency, blob.intensity, extrusionDepth]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  return <primitive object={geometry} attach="geometry" />;
}

function HeartGeometry() {
  const blob = useStudioStore((state) => state.blob);
  const extrusionDepth = useStudioStore((state) => state.extrusionDepth);
  const bevelSize = useStudioStore((state) => state.bevelSize);
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.82);
    shape.bezierCurveTo(-1.15, -0.2, -1.18, 0.58, -0.55, 0.72);
    shape.bezierCurveTo(-0.2, 0.8, 0, 0.48, 0, 0.3);
    shape.bezierCurveTo(0, 0.48, 0.2, 0.8, 0.55, 0.72);
    shape.bezierCurveTo(1.18, 0.58, 1.15, -0.2, 0, -0.82);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: extrusionDepth,
      bevelEnabled: true,
      bevelSegments: 10,
      bevelSize: Math.min(bevelSize, extrusionDepth * 0.2),
      bevelThickness: Math.min(bevelSize * 1.2, extrusionDepth * 0.24),
      curveSegments: 32,
    });
    geo.center();
    return applySurfaceNoise(geo, blob.intensity, blob.frequency);
  }, [bevelSize, blob.frequency, blob.intensity, extrusionDepth]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  return <primitive object={geometry} attach="geometry" />;
}

function applyDepthProfile(geometry, profile, inflate) {
  if (profile === 'flat' || inflate <= 0) return;
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  const centerX = (bounds.min.x + bounds.max.x) / 2;
  const centerY = (bounds.min.y + bounds.max.y) / 2;
  const maxRadius = Math.max(
    0.01,
    Math.hypot(bounds.max.x - centerX, bounds.max.y - centerY),
  );
  const position = geometry.attributes.position;
  const vertex = new THREE.Vector3();

  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index);
    const radial = Math.min(1, Math.hypot(vertex.x - centerX, vertex.y - centerY) / maxRadius);
    const falloff = Math.max(0, 1 - radial * radial);
    const side = vertex.z >= 0 ? 1 : -1;
    let zOffset = 0;

    if (profile === 'puffy') zOffset = side * inflate * 0.34 * falloff;
    if (profile === 'domed') zOffset = side * inflate * 0.22 * Math.sqrt(falloff);
    if (profile === 'ridge') {
      const ridge = Math.abs(Math.sin((vertex.x + vertex.y) * 4.6));
      zOffset = side * inflate * 0.18 * falloff * ridge;
    }

    position.setXYZ(index, vertex.x, vertex.y, vertex.z + zOffset);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
}

function BlobGeometry({ intensity, frequency }) {
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(1.12, 96, 64);
    const position = geo.attributes.position;
    const vertex = new THREE.Vector3();

    for (let index = 0; index < position.count; index += 1) {
      vertex.fromBufferAttribute(position, index);
      const normal = vertex.clone().normalize();
      const noise = pseudoNoise(
        normal.x * frequency,
        normal.y * frequency,
        normal.z * frequency,
      );
      const ripple = Math.sin((normal.x + normal.y - normal.z) * frequency * 2.4) * 0.28;
      const scale = 1 + intensity * (noise + ripple);
      vertex.multiplyScalar(scale);
      position.setXYZ(index, vertex.x, vertex.y, vertex.z);
    }

    position.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [intensity, frequency]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  return <primitive object={geometry} attach="geometry" />;
}

function PresetGeometry({ shape }) {
  const blob = useStudioStore((state) => state.blob);
  const extrusionDepth = useStudioStore((state) => state.extrusionDepth);
  const bevelSize = useStudioStore((state) => state.bevelSize);

  const geometry = useMemo(() => {
    const depthScale = Math.max(0.2, extrusionDepth);
    let geo;

    if (shape === 'cube') {
      const boxShape = new THREE.Shape();
      const size = 0.92;
      const radius = Math.min(bevelSize * 1.8, 0.28);
      boxShape.moveTo(-size + radius, -size);
      boxShape.lineTo(size - radius, -size);
      boxShape.quadraticCurveTo(size, -size, size, -size + radius);
      boxShape.lineTo(size, size - radius);
      boxShape.quadraticCurveTo(size, size, size - radius, size);
      boxShape.lineTo(-size + radius, size);
      boxShape.quadraticCurveTo(-size, size, -size, size - radius);
      boxShape.lineTo(-size, -size + radius);
      boxShape.quadraticCurveTo(-size, -size, -size + radius, -size);
      geo = new THREE.ExtrudeGeometry(boxShape, {
        depth: depthScale,
        bevelEnabled: true,
        bevelSegments: 8,
        bevelSize: Math.min(bevelSize, depthScale * 0.18),
        bevelThickness: Math.min(bevelSize * 1.1, depthScale * 0.22),
        curveSegments: 18,
      });
      geo.center();
    }

    if (shape === 'capsule') geo = new THREE.CapsuleGeometry(0.64, 0.65 + depthScale * 0.45, 32, 64);
    if (shape === 'torus') geo = new THREE.TorusGeometry(0.7 + depthScale * 0.05, 0.18 + depthScale * 0.12, 48, 128);
    if (shape === 'cylinder') geo = new THREE.CylinderGeometry(0.9, 0.9, 0.7 + depthScale, 96, 12);
    if (shape === 'cone') geo = new THREE.ConeGeometry(1, 0.8 + depthScale, 96, 12);
    if (shape === 'gem') geo = new THREE.CylinderGeometry(0.32 + bevelSize, 1.05, 0.8 + depthScale, 6, 8);
    if (shape === 'coin') geo = new THREE.CylinderGeometry(1.1, 1.1, 0.12 + depthScale * 0.45, 96, 8);
    if (!geo) geo = new THREE.SphereGeometry(1.12, 96, 64);

    geo.center();
    return applySurfaceNoise(geo, blob.intensity, blob.frequency);
  }, [bevelSize, blob.frequency, blob.intensity, extrusionDepth, shape]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  return <primitive object={geometry} attach="geometry" />;
}

function OutlineGeometry({ points, depth, bevelSize, depthProfile, inflate }) {
  const geometry = useMemo(() => {
    if (points.length < 4) return new THREE.BoxGeometry(0.01, 0.01, 0.01);
    const shape = new THREE.Shape();
    points.forEach((point, index) => {
      if (index === 0) shape.moveTo(point.x, point.y);
      else shape.lineTo(point.x, point.y);
    });
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSegments: 8,
      bevelSize: Math.min(depth * 0.2, bevelSize),
      bevelThickness: Math.min(depth * 0.24, bevelSize * 1.2),
      curveSegments: 24,
    });
    geo.center();
    applyDepthProfile(geo, depthProfile, inflate);
    return geo;
  }, [points, depth, bevelSize, depthProfile, inflate]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  return <primitive object={geometry} attach="geometry" />;
}

function ShapeGeometry() {
  const shape = useStudioStore((state) => state.shape);
  const blob = useStudioStore((state) => state.blob);

  if (shape === 'star') return <StarGeometry />;
  if (shape === 'heart') return <HeartGeometry />;
  if (shape === 'blob') {
    return <BlobGeometry intensity={blob.intensity} frequency={blob.frequency} />;
  }
  return <PresetGeometry shape={shape} />;
}

function createTexture(style) {
  if (style === 'none') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (style === 'wood') {
    for (let y = 0; y < canvas.height; y += 1) {
      const wave = Math.sin(y * 0.05) * 18 + Math.sin(y * 0.013) * 34;
      ctx.fillStyle = `rgba(${150 + wave}, ${92 + wave * 0.35}, ${42 + wave * 0.12}, 0.55)`;
      ctx.fillRect(0, y, canvas.width, 1);
    }
  }

  if (style === 'foam' || style === 'clay' || style === 'rubber') {
    const density = style === 'foam' ? 1800 : 900;
    for (let index = 0; index < density; index += 1) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const alpha = style === 'rubber' ? 0.08 : 0.13;
      ctx.fillStyle = `rgba(30, 33, 31, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, Math.random() * 1.8 + 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (style === 'holo') {
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#ff91c8');
    gradient.addColorStop(0.25, '#89f7fe');
    gradient.addColorStop(0.5, '#fdf06f');
    gradient.addColorStop(0.75, '#a8ff78');
    gradient.addColorStop(1, '#8f8cff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(style === 'wood' ? 1.4 : 2.6, style === 'wood' ? 1.8 : 2.6);
  return texture;
}

function PhoneFaceDetails() {
  const mode = useStudioStore((state) => state.mode);
  const drawRefine = useStudioStore((state) => state.drawRefine);
  const outlinePoints = useStudioStore((state) => state.outlinePoints);
  const extrusionDepth = useStudioStore((state) => state.extrusionDepth);
  const bounds = useMemo(() => drawingBounds(outlinePoints), [outlinePoints]);

  if (mode !== 'draw' || drawRefine.assist !== 'phone' || !bounds) return null;

  const width = Math.max(bounds.width * 0.72, 0.2);
  const height = Math.max(bounds.height * 0.76, 0.2);

  return (
    <>
      <mesh position={[0, -bounds.height * 0.03, extrusionDepth / 2 + 0.018]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="#111614" transparent opacity={0.34} depthWrite={false} />
      </mesh>
      <mesh position={[0, bounds.height * 0.38, extrusionDepth / 2 + 0.022]}>
        <circleGeometry args={[Math.min(bounds.width, bounds.height) * 0.035, 32]} />
        <meshBasicMaterial color="#eef8f2" transparent opacity={0.72} depthWrite={false} />
      </mesh>
    </>
  );
}

function StickerMaterial({ material, texture }) {
  return (
    <meshPhysicalMaterial
      color={material.color}
      map={texture}
      bumpMap={texture}
      bumpScale={material.textureStyle === 'none' ? 0 : 0.045}
      roughness={material.roughness}
      metalness={material.metalness}
      transmission={material.transmission}
      opacity={material.opacity}
      transparent={material.opacity < 1 || material.transmission > 0}
      thickness={0.85}
      ior={1.45}
      clearcoat={0.24}
      clearcoatRoughness={0.18}
      side={THREE.DoubleSide}
    />
  );
}

function DrawingModel({ material, texture }) {
  const outlinePoints = useStudioStore((state) => state.outlinePoints);
  const drawPoints = useStudioStore((state) => state.drawPoints);
  const drawRefine = useStudioStore((state) => state.drawRefine);
  const extrusionDepth = useStudioStore((state) => state.extrusionDepth);
  const bevelSize = useStudioStore((state) => state.bevelSize);
  const depthProfile = useStudioStore((state) => state.drawRefine.depthProfile);
  const inflate = useStudioStore((state) => state.drawRefine.inflate);
  const previewPoints = useMemo(
    () => (drawPoints.length >= 4 ? refineDrawing(drawPoints, drawRefine) : []),
    [drawPoints, drawRefine],
  );

  return (
    <>
      {outlinePoints.length >= 4 ? (
        <mesh castShadow receiveShadow>
          <OutlineGeometry
            points={outlinePoints}
            depth={extrusionDepth}
            bevelSize={bevelSize}
            depthProfile={depthProfile}
            inflate={inflate}
          />
          <StickerMaterial material={material} texture={texture} />
        </mesh>
      ) : null}
      {previewPoints.length >= 4 ? (
        <mesh castShadow receiveShadow>
          <OutlineGeometry
            points={previewPoints}
            depth={extrusionDepth}
            bevelSize={bevelSize}
            depthProfile={depthProfile}
            inflate={inflate}
          />
          <StickerMaterial material={material} texture={texture} />
        </mesh>
      ) : null}
      <PhoneFaceDetails />
    </>
  );
}

function StickerMesh() {
  const mode = useStudioStore((state) => state.mode);
  const material = useStudioStore((state) => state.material);
  const autoRotate = useStudioStore((state) => state.autoRotate);
  const recording = useStudioStore((state) => state.recording);
  const meshRef = useRef(null);
  const texture = useMemo(
    () => createTexture(material.textureStyle),
    [material.textureStyle],
  );

  useEffect(() => () => texture?.dispose(), [texture]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    if (recording) {
      meshRef.current.rotation.y += ((Math.PI * 2) / 10) * delta;
      meshRef.current.rotation.x = 0.12 + Math.sin(state.clock.elapsedTime * 1.6) * 0.05;
      return;
    }
    if (!autoRotate) return;
    meshRef.current.rotation.y += 0.45 * delta;
    meshRef.current.rotation.x += 0.1 * delta;
  });

  if (mode === 'draw') {
    return (
      <group ref={meshRef} rotation={[0.12, -0.36, 0]} scale={1.18}>
        <DrawingModel material={material} texture={texture} />
      </group>
    );
  }

  return (
    <mesh ref={meshRef} castShadow receiveShadow rotation={[0.12, -0.36, 0]} scale={1.18}>
      <ShapeGeometry />
      <StickerMaterial material={material} texture={texture} />
    </mesh>
  );
}

function Lights() {
  const lighting = useStudioStore((state) => state.lighting);

  return (
    <>
      <ambientLight intensity={lighting.ambient} />
      <directionalLight
        castShadow={lighting.shadows}
        color="#fff5df"
        intensity={lighting.key}
        position={[3.8, 4.4, 4.8]}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0002}
      />
      <pointLight color="#85c8ff" intensity={lighting.fill} position={[-3.5, 1.2, 2.5]} />
    </>
  );
}

function ShadowPlane() {
  const lighting = useStudioStore((state) => state.lighting);

  if (!lighting.shadows) return null;

  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.52, 0]}>
      <planeGeometry args={[7, 7]} />
      <shadowMaterial transparent opacity={lighting.shadowOpacity} />
    </mesh>
  );
}

function SceneContent() {
  const mode = useStudioStore((state) => state.mode);

  return (
    <>
      <Environment preset="studio" />
      <Lights />
      <StickerMesh />
      <ShadowPlane />
      {mode === 'draw' ? <axesHelper args={[2.4]} /> : null}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={2.6}
        maxDistance={7}
      />
    </>
  );
}

export function StudioScene() {
  const setRendererContext = useStudioStore((state) => state.setRendererContext);

  return (
    <Canvas
      shadows
      dpr={[1, 2.5]}
      camera={{ position: [0, 0.6, 4.5], fov: 42 }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' }}
      onCreated={({ gl, scene, camera }) => {
        gl.setClearAlpha(0);
        gl.setClearColor(0x000000, 0);
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.08;
        scene.background = null;
        setRendererContext({ gl, scene, camera });
      }}
    >
      <SceneContent />
    </Canvas>
  );
}
