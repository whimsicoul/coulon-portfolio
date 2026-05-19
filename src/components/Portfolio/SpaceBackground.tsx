import { useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── StarField ─────────────────────────────────────────────────────────────────
// Two layers of stars:
//   Layer A — 400 faint static background stars
//   Layer B — 150 brighter mid-layer stars split into 3 groups for independent twinkle

function StarField() {
  // ── Layer A ──────────────────────────────────────────────────────────────────
  const layerA = useMemo(() => {
    const count = 400;
    const pos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Reject-sample to keep center region sparser
      let x: number, y: number;
      do {
        x = (Math.random() - 0.5) * 50;
        y = (Math.random() - 0.5) * 35;
      } while (Math.sqrt(x * x + y * y) / 20 < 0.25);

      pos[i * 3]     = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 14;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.025,
      color: '#a8c8e8',
      transparent: true,
      opacity: 0.2,
      sizeAttenuation: true,
      depthWrite: false,
    });

    return { geo, mat };
  }, []);

  // ── Layer B — 3 groups of 50 for independent twinkling ───────────────────────
  const layerB = useMemo(() => {
    const groupCount = 50;
    const configs = [
      { baseOpacity: 0.40, amp: 0.05, speed: 2.0 * Math.PI / 1.8 },
      { baseOpacity: 0.40, amp: 0.12, speed: 2.0 * Math.PI / 1.3 },
      { baseOpacity: 0.39, amp: 0.09, speed: 2.0 * Math.PI / 2.1 },
    ];

    return configs.map((cfg, gi) => {
      const pos = new Float32Array(groupCount * 3);
      for (let i = 0; i < groupCount; i++) {
        let x: number, y: number;
        do {
          x = (Math.random() - 0.5) * 44;
          y = (Math.random() - 0.5) * 30;
        } while (Math.sqrt(x * x + y * y) / 20 < 0.25);
        pos[i * 3]     = x;
        pos[i * 3 + 1] = y;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

      const mat = new THREE.PointsMaterial({
        size: 0.05,
        color: '#38bdf8',
        transparent: true,
        opacity: cfg.baseOpacity,
        sizeAttenuation: true,
        depthWrite: false,
      });

      // Phase offset per group so they don't all pulse in sync
      const phaseOffset = gi * (Math.PI * 2 / 3);

      return { geo, mat, baseOpacity: cfg.baseOpacity, amp: cfg.amp, speed: cfg.speed, phaseOffset };
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      layerA.geo.dispose();
      layerA.mat.dispose();
      layerB.forEach(g => { g.geo.dispose(); g.mat.dispose(); });
    };
  }, [layerA, layerB]);

  // Animation: Layer B twinkle only (Layer A is static)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    layerB.forEach(g => {
      g.mat.opacity = g.baseOpacity + g.amp * Math.sin(t * g.speed + g.phaseOffset);
    });
  });

  return (
    <>
      <points geometry={layerA.geo} material={layerA.mat} />
      {layerB.map((g, i) => (
        <points key={i} geometry={g.geo} material={g.mat} />
      ))}
    </>
  );
}

// ─── ShootingStars ──────────────────────────────────────────────────────────────
// Pool of 8 shooting star meshes. Each is a quad (4-vertex plane) whose position
// is mutated every frame. Hidden via scale=0 when inactive.

interface PoolSlot {
  active: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  velocityDir: THREE.Vector3;
  elapsed: number;
  lifetime: number;
  length: number;
  opacity: number;
  posArr: Float32Array;
  posAttr: THREE.BufferAttribute;
  geo: THREE.BufferGeometry;
  mat: THREE.MeshBasicMaterial;
  mesh: THREE.Mesh;
}

const POOL_SIZE = 8;
const HALF_WIDTH = 0.012;
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const _perp = new THREE.Vector3();
const _headPos = new THREE.Vector3();
const _tailPos = new THREE.Vector3();

function buildSlotGeometry(): { posArr: Float32Array; posAttr: THREE.BufferAttribute; geo: THREE.BufferGeometry } {
  // 4 vertices: [headTop, headBottom, tailTop, tailBottom]
  const posArr = new Float32Array(4 * 3);
  const posAttr = new THREE.BufferAttribute(posArr, 3);
  posAttr.setUsage(THREE.DynamicDrawUsage);

  // Colors: head = near-white cyan, tail = dimmer cyan
  const colors = new Float32Array([
    0.9, 0.97, 1.0,  // v0 head top
    0.9, 0.97, 1.0,  // v1 head bottom
    0.5, 0.80, 1.0,  // v2 tail top
    0.5, 0.80, 1.0,  // v3 tail bottom
  ]);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', posAttr);
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setIndex([0, 1, 2, 2, 1, 3]);
  // Bounding sphere so frustum culling doesn't hide it
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 50);

  return { posArr, posAttr, geo };
}

function spawnSlot(slot: PoolSlot) {
  // Pick a random spawn zone from 4 edge areas
  const zone = Math.floor(Math.random() * 4);
  let sx: number, sy: number;
  if (zone === 0) {       // top-left
    sx = -25 + Math.random() * 20;
    sy =   8 + Math.random() * 10;
  } else if (zone === 1) { // top-right
    sx =   5 + Math.random() * 20;
    sy =   8 + Math.random() * 10;
  } else if (zone === 2) { // left edge
    sx = -25 + Math.random() * 15;
    sy =  -8 + Math.random() * 16;
  } else {                 // right edge
    sx =  10 + Math.random() * 15;
    sy =  -8 + Math.random() * 16;
  }

  slot.position.set(sx, sy, -3);

  // Velocity: toward center + downward with random spread
  const toCenter = new THREE.Vector3(-sx * 0.4, -Math.abs(sy) * 0.3 - 0.5, 0).normalize();
  const speed = 3 + Math.random() * 5;
  slot.velocity.copy(toCenter).multiplyScalar(speed);
  slot.velocityDir.copy(toCenter);

  slot.elapsed   = 0;
  slot.lifetime  = 1.5 + Math.random() * 1.5;
  slot.length    = 0.8 + Math.random() * 1.7;
  slot.opacity   = 0.6 + Math.random() * 0.4;
  slot.active    = true;
  slot.mesh.scale.setScalar(1);
}

function updateSlotMesh(slot: PoolSlot) {
  const trailLen = slot.length * Math.min(slot.elapsed / 0.3, 1.0);

  _headPos.copy(slot.position);
  _tailPos.copy(slot.position).addScaledVector(slot.velocityDir, -trailLen);

  // Perpendicular to velocity in the XY plane
  _perp.crossVectors(slot.velocityDir, Z_AXIS).normalize().multiplyScalar(HALF_WIDTH);

  const p = slot.posArr;
  // v0 head top
  p[0] = _headPos.x + _perp.x;
  p[1] = _headPos.y + _perp.y;
  p[2] = _headPos.z;
  // v1 head bottom
  p[3] = _headPos.x - _perp.x;
  p[4] = _headPos.y - _perp.y;
  p[5] = _headPos.z;
  // v2 tail top
  p[6] = _tailPos.x + _perp.x;
  p[7] = _tailPos.y + _perp.y;
  p[8] = _tailPos.z;
  // v3 tail bottom
  p[9]  = _tailPos.x - _perp.x;
  p[10] = _tailPos.y - _perp.y;
  p[11] = _tailPos.z;

  slot.posAttr.needsUpdate = true;
}

function ShootingStars() {
  const pool = useMemo<PoolSlot[]>(() => {
    return Array.from({ length: POOL_SIZE }, () => {
      const { posArr, posAttr, geo } = buildSlotGeometry();
      const mat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.scale.setScalar(0); // hidden by default
      mesh.frustumCulled = false;

      return {
        active: false,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        velocityDir: new THREE.Vector3(),
        elapsed: 0,
        lifetime: 2,
        length: 1,
        opacity: 0.8,
        posArr,
        posAttr,
        geo,
        mat,
        mesh,
      };
    });
  }, []);

  useEffect(() => {
    return () => {
      pool.forEach(s => { s.geo.dispose(); s.mat.dispose(); });
    };
  }, [pool]);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const safeDelta = Math.min(delta, 0.1);
    let activeCount = 0;

    for (const slot of pool) {
      if (!slot.active) continue;

      slot.elapsed += safeDelta;
      const progress = slot.elapsed / slot.lifetime;

      if (progress >= 1.0) {
        slot.active = false;
        slot.mesh.scale.setScalar(0);
        slot.mat.opacity = 0;
        continue;
      }

      // Advance position
      slot.position.addScaledVector(slot.velocity, safeDelta);

      // Fade envelope: ramp 0→0.1, hold 0.1→0.7, fade 0.7→1.0
      let fade: number;
      if (progress < 0.1) {
        fade = progress / 0.1;
      } else if (progress > 0.7) {
        fade = 1.0 - (progress - 0.7) / 0.3;
      } else {
        fade = 1.0;
      }

      slot.mat.opacity = slot.opacity * fade;
      updateSlotMesh(slot);
      activeCount++;
    }

    // Compute target active count
    const base = 1 + Math.floor(Math.sin(t * 0.07) * 0.5);
    const burst = t % 80 < 5 ? 1 : 0;
    const targetActive = Math.min(base + burst, POOL_SIZE);

    // Spawn new stars
    if (activeCount < targetActive && Math.random() < 0.004) {
      const inactive = pool.find(s => !s.active);
      if (inactive) spawnSlot(inactive);
    }
  });

  return (
    <>
      {pool.map((slot, i) => (
        <primitive key={i} object={slot.mesh} />
      ))}
    </>
  );
}

// ─── SpaceBackground ────────────────────────────────────────────────────────────

export default function SpaceBackground() {
  return (
    <>
      <StarField />
      <ShootingStars />
    </>
  );
}
