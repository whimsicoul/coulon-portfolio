import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations, Html } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';

// ─── ISS ───────────────────────────────────────────────────────────────────

export function ISS() {
  const { scene } = useGLTF('/models/ISS.glb');
  const { cloned, issScale } = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          const mat = m as THREE.MeshStandardMaterial;
          mat.envMapIntensity = 0.4;
          mat.needsUpdate = true;
        });
      }
    });
    const box = new THREE.Box3().setFromObject(c);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    // Target ~3 world units for the ISS so it sits at a readable scale in the corner
    const scale = maxDim > 0 ? 15.0 / maxDim : 1;
    return { cloned: c, issScale: scale };
  }, [scene]);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    // Slow primary spin around Y so all sides become visible over ~30 s
    groupRef.current.rotation.y = t * 0.12;
    // Secondary axes give a lazy tumble — different frequencies keep it organic
    groupRef.current.rotation.x = Math.sin(t * 0.07) * 0.4;
    groupRef.current.rotation.z = Math.sin(t * 0.05 + 1.2) * 0.25;
  });

  return (
    <group ref={groupRef} scale={issScale} raycast={() => null}>
      <primitive object={cloned} />
    </group>
  );
}

// ─── ISSCorner ─────────────────────────────────────────────────────────────

export function ISSCorner() {
  const { camera, size } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const currentPos = useRef<THREE.Vector3 | null>(null);
  const arrived = useRef(false);

  const getTargetPos = () => {
    const cam = camera as THREE.PerspectiveCamera;
    const fovRad = (cam.fov * Math.PI) / 180;
    const targetZ = -40;
    const halfH = Math.tan(fovRad / 2) * (cam.position.z - targetZ);
    const halfW = halfH * (size.width / size.height);
    return new THREE.Vector3(halfW * 0.55, halfH * 0.62, targetZ);
  };

  const initialPos = useMemo(() => {
    const target = getTargetPos();
    // start lower-right in the background so the ISS floats upward and forward into the corner
    return new THREE.Vector3(target.x + 5, target.y - 15, target.z + 10);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_state, delta) => {
    if (!groupRef.current) return;
    const target = getTargetPos();

    if (!arrived.current) {
      if (currentPos.current === null) {
        currentPos.current = initialPos.clone();
      }
      const dx = target.x - currentPos.current.x;
      const dy = target.y - currentPos.current.y;
      const dz = target.z - currentPos.current.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < 0.3) {
        arrived.current = true;
        currentPos.current.copy(target);
      } else {
        const speed = 1.2 * delta;
        currentPos.current.x += (dx / dist) * Math.min(speed, dist);
        currentPos.current.y += (dy / dist) * Math.min(speed, dist);
        currentPos.current.z += (dz / dist) * Math.min(speed, dist);
      }
      groupRef.current.position.copy(currentPos.current);
    } else {
      groupRef.current.position.copy(target);
    }
  });

  return (
    <group ref={groupRef} position={initialPos.toArray() as [number, number, number]} raycast={() => null}>
      <ISS />
      <pointLight position={[0, 0.5, 0.5]} intensity={2} color="#ffffff" />
    </group>
  );
}

// ─── AnimatedAstronaut ─────────────────────────────────────────────────────
// SkeletonUtils.clone is required for skinned meshes — scene.clone() shares
// bones across instances, leaving all but one in bind pose.

export const ASTRONAUT_START: [number, number, number] = [-13, -6, 2];
const ASTRONAUT_TARGET: [number, number] = [8.5, 5.0];

interface AnimatedAstronautProps {
  position: [number, number, number];
  scale?: number;
  bobOffset?: number;
  bobSpeed?: number;
  drift?: boolean;
  driftSpeed?: number;
  appState?: 'hero' | 'selection' | 'transitioning' | 'exploded';
}

export function AnimatedAstronaut({ position, scale = 0.9, bobOffset = 2.5, bobSpeed = 0.15, drift = false, driftSpeed = 0.8, appState = 'hero' }: AnimatedAstronautProps) {
  const { scene, animations } = useGLTF('/models/astronaut.glb');
  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const groupRef = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, cloned);
  const driftX = useRef<number>(position[0]);
  const driftY = useRef<number>(position[1]);
  const arrivedAt = useRef<number | null>(null);
  const currentTarget = useRef<[number, number]>([...ASTRONAUT_TARGET]);
  const tumble = useRef({ x: 0, y: 0, z: 0 });
  const isSettledRef = useRef(false);
  const [isSettled, setIsSettled] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const bubbleDismissed = useRef(false);

  useEffect(() => {
    actions['Animation']?.reset().play();
  }, [actions]);

  useEffect(() => {
    const id = 'astronaut-bubble-keyframes';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      @keyframes bubbleFadeIn {
        from { opacity: 0; transform: translate(-50%, -110%) scale(0.9); }
        to   { opacity: 1; transform: translate(-50%, -100%) scale(1); }
      }
    `;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    if (!isSettled || appState !== 'selection' || bubbleDismissed.current) return;
    const t = setTimeout(() => {
      if (!bubbleDismissed.current) setShowBubble(true);
    }, 400);
    return () => clearTimeout(t);
  }, [isSettled, appState]);

  useEffect(() => {
    if (!showBubble) return;
    const t = setTimeout(() => {
      setShowBubble(false);
      bubbleDismissed.current = true;
    }, 5000);
    return () => clearTimeout(t);
  }, [showBubble]);

  useEffect(() => {
    if (appState !== 'selection' && showBubble) {
      setShowBubble(false);
      bubbleDismissed.current = true;
    }
  }, [appState, showBubble]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    if (drift) {
      tumble.current.x += 0.00055;
      tumble.current.y += 0.0018;
      tumble.current.z += 0.00035;
      groupRef.current.rotation.set(tumble.current.x, tumble.current.y, tumble.current.z);

      if (arrivedAt.current !== null) {
        if (t - arrivedAt.current > 5) {
          const midX = (Math.random() - 0.5) * 16;
          const midY = (Math.random() - 0.5) * 10;
          const toMidX = midX - driftX.current;
          const toMidY = midY - driftY.current;
          const toMidDist = Math.sqrt(toMidX * toMidX + toMidY * toMidY);
          const overshoot = toMidDist + 16;
          currentTarget.current = [
            driftX.current + (toMidX / toMidDist) * overshoot,
            driftY.current + (toMidY / toMidDist) * overshoot,
          ];
          arrivedAt.current = null;
        }
      } else {
        const dx = currentTarget.current[0] - driftX.current;
        const dy = currentTarget.current[1] - driftY.current;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.5) {
          arrivedAt.current = t;
          if (!isSettledRef.current) {
            isSettledRef.current = true;
            setIsSettled(true);
          }
        } else {
          const speed = driftSpeed * delta;
          driftX.current += (dx / dist) * speed;
          driftY.current += (dy / dist) * speed;
        }
      }

      const bobY = driftY.current + Math.sin(t * bobSpeed + bobOffset) * 0.35;
      groupRef.current.position.set(driftX.current, bobY, position[2]);
    } else {
      groupRef.current.position.y = position[1] + Math.sin(t * bobSpeed + bobOffset) * 0.35;
      groupRef.current.rotation.y = Math.sin(t * 0.08 + bobOffset) * 0.2;
    }
  });

  return (
    <group ref={groupRef} position={position} scale={scale} raycast={() => null}>
      <primitive object={cloned} />
      {showBubble && (
        <Html position={[1.2, 2.8, 0]} style={{ pointerEvents: 'none', zIndex: 10 }}>
          <div style={{
            position: 'relative',
            maxWidth: '220px',
            background: 'hsla(230, 20%, 8%, 0.92)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(148, 200, 255, 0.25)',
            borderRadius: '14px',
            padding: '10px 14px',
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '12px',
            lineHeight: 1.5,
            color: 'hsl(210, 25%, 92%)',
            boxShadow: '0 0 24px rgba(100, 180, 255, 0.15), 0 4px 20px rgba(0, 0, 0, 0.7)',
            transform: 'translate(-50%, -100%)',
            whiteSpace: 'normal',
            textAlign: 'center',
            animation: 'bubbleFadeIn 0.4s ease forwards',
          }}>
            Hey, click on the cherry blossom or chess king to see a breakdown of my projects.
            <div style={{
              position: 'absolute',
              bottom: '-10px',
              left: '22px',
              width: 0,
              height: 0,
              borderLeft: '10px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '10px solid hsla(230, 20%, 8%, 0.92)',
            }} />
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── Asteroid ──────────────────────────────────────────────────────────────

interface AsteroidProps {
  modelPath: string;
  position: [number, number, number];
  entranceFrom?: [number, number, number];
  entranceSpeed?: number;
  scale: number;
  tumbleSpeed: [number, number, number];
  driftAmplitude?: number;
  driftSpeed?: number;
  targetSize?: number;
}

export function Asteroid({ modelPath, position, entranceFrom, entranceSpeed = 1.2, scale, tumbleSpeed, driftAmplitude = 0.3, driftSpeed = 0.12, targetSize = 3 }: AsteroidProps) {
  const { scene } = useGLTF(modelPath);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    const box = new THREE.Box3().setFromObject(c);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const s = maxDim > 0 ? targetSize / maxDim : 1;
    c.scale.setScalar(s);
    return c;
  }, [scene, targetSize]);

  const groupRef = useRef<THREE.Group>(null);
  const currentX = useRef(entranceFrom ? entranceFrom[0] : position[0]);
  const currentY = useRef(entranceFrom ? entranceFrom[1] : position[1]);
  const currentZ = useRef(entranceFrom ? entranceFrom[2] : position[2]);
  const arrived = useRef(!entranceFrom);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;

    if (!arrived.current) {
      const dx = position[0] - currentX.current;
      const dy = position[1] - currentY.current;
      const dz = position[2] - currentZ.current;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < 0.5) {
        arrived.current = true;
        currentX.current = position[0];
        currentY.current = position[1];
        currentZ.current = position[2];
      } else {
        const speed = entranceSpeed * delta;
        currentX.current += (dx / dist) * Math.min(speed, dist);
        currentY.current += (dy / dist) * Math.min(speed, dist);
        currentZ.current += (dz / dist) * Math.min(speed, dist);
      }
      groupRef.current.position.set(currentX.current, currentY.current, currentZ.current);
    } else {
      groupRef.current.position.y = position[1] + Math.sin(t * driftSpeed + driftSpeed * 13.7) * driftAmplitude;
      groupRef.current.position.x = position[0] + Math.sin(t * driftSpeed * 0.61 + driftSpeed * 7.3) * driftAmplitude * 0.6;
    }

    groupRef.current.rotation.x += tumbleSpeed[0] * 0.01;
    groupRef.current.rotation.y += tumbleSpeed[1] * 0.01;
    groupRef.current.rotation.z += tumbleSpeed[2] * 0.01;
  });

  const startPos = entranceFrom ?? position;

  return (
    <group ref={groupRef} position={startPos} scale={scale} raycast={() => null}>
      <primitive object={cloned} />
    </group>
  );
}

// ─── AsteroidPack ──────────────────────────────────────────────────────────
// Loads the asteroid pack GLB once and renders 20 asteroids total:
//   • 10 animated (entrance + drift) from ASTEROID_CONFIGS
//   • 10 static deep-background from BACKGROUND_ASTEROID_CONFIGS (reuse same meshes)

interface PackedAsteroidConfig {
  name: string;
  position: [number, number, number];
  targetSize: number;
  tumbleSpeed: [number, number, number];
  velocity: [number, number, number];
  entranceFrom: [number, number, number];
  entranceDelay: number;
}

// Avoided directions:
//   top-right (+x, +y)  → ISS enters from there
//   left-mid  (-x, ~0y) → astronaut drifts in from that side
// 20 total: first 10 at z -35 to -65 (foreground band), next 10 at z -75 to -100 (deep background).
// Delays staggered one per second across 0–19s so at most one entrance animation runs at a time.
const ASTEROID_CONFIGS: PackedAsteroidConfig[] = [
  // ── foreground band ──
  { name: 'Asteroid_no_1',  position: [-18,  7,  -55], targetSize: 4,   tumbleSpeed: [0.06, 0.10, 0.04], velocity: [-0.4,  0.15, 0],   entranceFrom: [-65, -30, -55], entranceDelay: 0  },
  { name: 'Asteroid_no_2',  position: [ 20, -6,  -45], targetSize: 2.5, tumbleSpeed: [0.10, 0.07, 0.13], velocity: [ 0.3, -0.10, 0],   entranceFrom: [ 65, -25, -45], entranceDelay: 2  },
  { name: 'Asteroid_no_3',  position: [-22, -9,  -40], targetSize: 1.8, tumbleSpeed: [0.13, 0.18, 0.07], velocity: [-0.2, -0.18, 0],   entranceFrom: [-10, -55, -40], entranceDelay: 4  },
  { name: 'Asteroid_no_4',  position: [ 14, 10,  -50], targetSize: 1.5, tumbleSpeed: [0.16, 0.11, 0.08], velocity: [ 0.25, 0.12, 0],   entranceFrom: [ 50, -45, -50], entranceDelay: 3  },
  { name: 'Asteroid_no_5',  position: [-10, 14,  -48], targetSize: 3,   tumbleSpeed: [0.07, 0.05, 0.10], velocity: [-0.15, 0.20, 0],   entranceFrom: [-55, -40, -48], entranceDelay: 6  },
  { name: 'Asteroid_no_6',  position: [ 24,  5,  -60], targetSize: 3.5, tumbleSpeed: [0.04, 0.10, 0.06], velocity: [ 0.35,-0.08, 0],   entranceFrom: [ 20, -60, -60], entranceDelay: 8  },
  { name: 'Asteroid_no_7',  position: [ -6, -14, -38], targetSize: 1.2, tumbleSpeed: [0.18, 0.14, 0.22], velocity: [-0.30,-0.22, 0],   entranceFrom: [ 55, -50, -38], entranceDelay: 5  },
  { name: 'Asteroid_no_8',  position: [-24,  3,  -65], targetSize: 4.5, tumbleSpeed: [0.03, 0.06, 0.02], velocity: [-0.10, 0.07, 0],   entranceFrom: [ 35, -55, -65], entranceDelay: 10 },
  { name: 'Asteroid_no_9',  position: [ 11, -10, -42], targetSize: 1.3, tumbleSpeed: [0.14, 0.08, 0.17], velocity: [ 0.20,-0.15, 0],   entranceFrom: [-50, -48, -42], entranceDelay: 7  },
  { name: 'Asteroid_no_10', position: [-13,  8,  -35], targetSize: 1.1, tumbleSpeed: [0.20, 0.12, 0.09], velocity: [-0.18, 0.25, 0],   entranceFrom: [ 60,  12, -35], entranceDelay: 9  },
  // ── deep background band (z -75 to -100) — smaller, slower tumble, gently drift ──
  { name: 'Asteroid_no_1',  position: [-30,  18, -85], targetSize: 2.0, tumbleSpeed: [0.05, 0.08, 0.03], velocity: [-0.05, 0.03, 0],   entranceFrom: [-80, -60, -85], entranceDelay: 11 },
  { name: 'Asteroid_no_2',  position: [ 32, -18, -92], targetSize: 1.4, tumbleSpeed: [0.09, 0.06, 0.11], velocity: [ 0.04,-0.02, 0],   entranceFrom: [ 80, -60, -92], entranceDelay: 12 },
  { name: 'Asteroid_no_3',  position: [-16, -22, -78], targetSize: 2.5, tumbleSpeed: [0.11, 0.15, 0.06], velocity: [-0.03,-0.04, 0],   entranceFrom: [-15, -80, -78], entranceDelay: 13 },
  { name: 'Asteroid_no_4',  position: [ -4,  25, -95], targetSize: 1.0, tumbleSpeed: [0.14, 0.09, 0.07], velocity: [ 0.02, 0.05, 0],   entranceFrom: [-75,  60, -95], entranceDelay: 14 },
  { name: 'Asteroid_no_5',  position: [ 26, -28, -88], targetSize: 1.8, tumbleSpeed: [0.06, 0.04, 0.09], velocity: [ 0.06,-0.03, 0],   entranceFrom: [ 75, -65, -88], entranceDelay: 15 },
  { name: 'Asteroid_no_6',  position: [-38, -12,-100], targetSize: 2.2, tumbleSpeed: [0.03, 0.07, 0.05], velocity: [-0.04, 0.02, 0],   entranceFrom: [-80, -70,-100], entranceDelay: 16 },
  { name: 'Asteroid_no_7',  position: [ 18,  20, -75], targetSize: 0.9, tumbleSpeed: [0.16, 0.12, 0.18], velocity: [ 0.03, 0.04, 0],   entranceFrom: [ 70,  65, -75], entranceDelay: 17 },
  { name: 'Asteroid_no_8',  position: [-26, -30, -90], targetSize: 1.6, tumbleSpeed: [0.02, 0.05, 0.02], velocity: [-0.02,-0.03, 0],   entranceFrom: [ 40, -75, -90], entranceDelay: 18 },
  { name: 'Asteroid_no_9',  position: [ -8,  30, -82], targetSize: 1.1, tumbleSpeed: [0.12, 0.07, 0.14], velocity: [-0.03, 0.05, 0],   entranceFrom: [-70,  70, -82], entranceDelay: 19 },
  { name: 'Asteroid_no_10', position: [ 36,  10, -97], targetSize: 0.8, tumbleSpeed: [0.17, 0.10, 0.08], velocity: [ 0.05, 0.02, 0],   entranceFrom: [ 80,  55, -97], entranceDelay: 20 },
];

interface SinglePackAsteroidProps {
  node: THREE.Object3D;
  config: PackedAsteroidConfig;
}

function SinglePackAsteroid({ node, config }: SinglePackAsteroidProps) {
  const groupRef = useRef<THREE.Group>(null);
  const pos = useRef(new THREE.Vector3(...config.entranceFrom));
  const arrived = useRef(false);
  const started = useRef(false);

  const scaled = useMemo(() => {
    const c = node.clone(true);
    const box = new THREE.Box3().setFromObject(c);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const s = maxDim > 0 ? config.targetSize / maxDim : 1;
    c.scale.setScalar(s);
    return c;
  }, [node, config.targetSize]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Hold off-screen until delay has elapsed
    if (!started.current) {
      if (state.clock.elapsedTime < config.entranceDelay) return;
      started.current = true;
      groupRef.current.visible = true;
    }

    const [tx, ty, tz] = config.position;

    if (!arrived.current) {
      // Very slow eased lerp matching post-arrival drift speed
      pos.current.x += (tx - pos.current.x) * (1 - Math.exp(-0.35 * delta));
      pos.current.y += (ty - pos.current.y) * (1 - Math.exp(-0.35 * delta));
      pos.current.z += (tz - pos.current.z) * (1 - Math.exp(-0.35 * delta));

      const dist = pos.current.distanceTo(new THREE.Vector3(tx, ty, tz));
      if (dist < 0.5) {
        arrived.current = true;
        pos.current.set(tx, ty, tz);
      }
      groupRef.current.position.copy(pos.current);
    } else {
      pos.current.x += config.velocity[0] * delta;
      pos.current.y += config.velocity[1] * delta;
      pos.current.z += config.velocity[2] * delta;
      groupRef.current.position.copy(pos.current);
    }

    groupRef.current.rotation.x += config.tumbleSpeed[0] * 0.01;
    groupRef.current.rotation.y += config.tumbleSpeed[1] * 0.01;
    groupRef.current.rotation.z += config.tumbleSpeed[2] * 0.01;
  });

  return (
    <group ref={groupRef} position={config.entranceFrom} visible={false} raycast={() => null}>
      <primitive object={scaled} />
    </group>
  );
}

export function AsteroidPack() {
  const { scene } = useGLTF('/models/asteroids.glb');

  const asteroidNodes = useMemo(() => {
    const map = new Map<string, THREE.Object3D>();
    scene.traverse((obj) => {
      if (ASTEROID_CONFIGS.some(c => c.name === obj.name)) {
        map.set(obj.name, obj);
      }
    });
    return map;
  }, [scene]);

  return (
    <>
      {ASTEROID_CONFIGS.map((config, i) => {
        const node = asteroidNodes.get(config.name);
        if (!node) return null;
        return <SinglePackAsteroid key={i} node={node} config={config} />;
      })}
    </>
  );
}

// ─── SpaceScene ────────────────────────────────────────────────────────────

export default function SpaceScene() {
  return (
    <>
      <ISSCorner />
      <AnimatedAstronaut position={ASTRONAUT_START} scale={0.9} bobOffset={2.5} bobSpeed={0.15} drift={true} driftSpeed={0.8} />
      <AsteroidPack />
    </>
  );
}

useGLTF.preload('/models/ISS.glb');
useGLTF.preload('/models/astronaut.glb');
useGLTF.preload('/models/asteroids.glb');
