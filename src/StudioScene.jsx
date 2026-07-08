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

function StarGeometry() {
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
      depth: 0.42,
      bevelEnabled: true,
      bevelSegments: 6,
      bevelSize: 0.055,
      bevelThickness: 0.08,
      curveSegments: 16,
    });
    geo.center();
    return geo;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);
  return <primitive object={geometry} attach="geometry" />;
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

function OutlineGeometry({ points, depth, bevelSize }) {
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
    return geo;
  }, [points, depth, bevelSize]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  return <primitive object={geometry} attach="geometry" />;
}

function ShapeGeometry() {
  const mode = useStudioStore((state) => state.mode);
  const shape = useStudioStore((state) => state.shape);
  const blob = useStudioStore((state) => state.blob);
  const drawPoints = useStudioStore((state) => state.drawPoints);
  const drawRefine = useStudioStore((state) => state.drawRefine);
  const outlinePoints = useStudioStore((state) => state.outlinePoints);
  const extrusionDepth = useStudioStore((state) => state.extrusionDepth);
  const bevelSize = useStudioStore((state) => state.bevelSize);

  if (mode === 'draw' && outlinePoints.length >= 4) {
    return <OutlineGeometry points={outlinePoints} depth={extrusionDepth} bevelSize={bevelSize} />;
  }

  if (mode === 'draw' && drawPoints.length >= 4) {
    return (
      <OutlineGeometry
        points={refineDrawing(drawPoints, drawRefine)}
        depth={extrusionDepth}
        bevelSize={bevelSize}
      />
    );
  }

  if (shape === 'cube') return <boxGeometry args={[1.75, 1.75, 1.75]} />;
  if (shape === 'star') return <StarGeometry />;
  if (shape === 'blob') {
    return <BlobGeometry intensity={blob.intensity} frequency={blob.frequency} />;
  }
  return <sphereGeometry args={[1.12, 96, 64]} />;
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

function StickerMesh() {
  const material = useStudioStore((state) => state.material);
  const autoRotate = useStudioStore((state) => state.autoRotate);
  const recording = useStudioStore((state) => state.recording);
  const meshRef = useRef(null);

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

  return (
    <mesh ref={meshRef} castShadow receiveShadow rotation={[0.12, -0.36, 0]} scale={1.18}>
      <ShapeGeometry />
      <meshPhysicalMaterial
        color={material.color}
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
      <PhoneFaceDetails />
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
  return (
    <>
      <Environment preset="studio" />
      <Lights />
      <StickerMesh />
      <ShadowPlane />
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
  const setRendererCanvas = useStudioStore((state) => state.setRendererCanvas);

  return (
    <Canvas
      shadows
      camera={{ position: [0, 0.6, 4.5], fov: 42 }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      onCreated={({ gl, scene }) => {
        gl.setClearAlpha(0);
        gl.setClearColor(0x000000, 0);
        scene.background = null;
        setRendererCanvas(gl.domElement);
      }}
    >
      <SceneContent />
    </Canvas>
  );
}
