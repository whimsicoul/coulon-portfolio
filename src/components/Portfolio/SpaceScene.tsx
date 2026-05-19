import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
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
}

export function AnimatedAstronaut({ position, scale = 0.9, bobOffset = 2.5, bobSpeed = 0.15, drift = false, driftSpeed = 0.8 }: AnimatedAstronautProps) {
  const { scene, animations } = useGLTF('/models/astronaut.glb');
  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const groupRef = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, cloned);
  const driftX = useRef<number>(position[0]);
  const driftY = useRef<number>(position[1]);
  const arrivedAt = useRef<number | null>(null);
  const currentTarget = useRef<[number, number]>([...ASTRONAUT_TARGET]);
  const tumble = useRef({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    actions['Animation']?.reset().play();
  }, [actions]);

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
// Loads the asteroid pack GLB once and renders the 2 largest asteroids.

interface PackedAsteroidConfig {
  name: string;
  position: [number, number, number];
  targetSize: number;
  tumbleSpeed: [number, number, number];
  velocity: [number, number, number];
  entranceFrom: [number, number, number];
  entranceDelay: number;
}

const ASTEROID_CONFIGS: PackedAsteroidConfig[] = [
  { name: 'Asteroid_no_1', position: [-18,  7, -55], targetSize: 4,   tumbleSpeed: [0.06, 0.10, 0.04], velocity: [-0.4,  0.15, 0], entranceFrom: [-65, -30, -55], entranceDelay: 0  },
  { name: 'Asteroid_no_8', position: [-24,  3, -65], targetSize: 4.5, tumbleSpeed: [0.03, 0.06, 0.02], velocity: [-0.10, 0.07, 0], entranceFrom: [ 35, -55, -65], entranceDelay: 10 },
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
