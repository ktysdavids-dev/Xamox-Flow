import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, RoundedBox, ContactShadows, useTexture } from '@react-three/drei';
import { EffectComposer, Bloom, SSAO, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

/* ═══════════════════════════════════════════
   CONFIG
   ═══════════════════════════════════════════ */

const TILE_STYLES = {
  payday:      { color: '#D4A843', emissive: '#8B6F22', icon: 'star' },
  investment:  { color: '#3A9E6B', emissive: '#1E5E3A', icon: 'chart' },
  real_estate: { color: '#C46B3A', emissive: '#7A3F1E', icon: 'house' },
  event:       { color: '#CCA832', emissive: '#886E1A', icon: 'bolt' },
  trivia:      { color: '#8B5CA0', emissive: '#553268', icon: 'brain' },
  market:      { color: '#3878A8', emissive: '#1E4A70', icon: 'bars' },
  opportunity: { color: '#D8943A', emissive: '#8A5A1A', icon: 'star' },
  tax:         { color: '#B84040', emissive: '#702424', icon: 'bank' },
};

const TILE_COUNT_FALLBACK = 24;
const BOARD_RADIUS = 10.8;
const BOARD_SURFACE_Y = 0.65;

const FACE_GRID = {
  1: [[0, 0]],
  2: [[-0.45, -0.45], [0.45, 0.45]],
  3: [[-0.45, -0.45], [0, 0], [0.45, 0.45]],
  4: [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]],
  5: [[-0.45, -0.45], [0.45, -0.45], [0, 0], [-0.45, 0.45], [0.45, 0.45]],
  6: [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0], [0.45, 0], [-0.45, 0.45], [0.45, 0.45]],
};

const ROTATION_BY_TOP = {
  1: [0, 0, 0],
  2: [-Math.PI / 2, 0, 0],
  3: [0, 0, Math.PI / 2],
  4: [0, 0, -Math.PI / 2],
  5: [Math.PI / 2, 0, 0],
  6: [Math.PI, 0, 0],
};

const toXZ = (index, total, radius) => {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
  return new THREE.Vector3(
    radius * Math.cos(angle),
    BOARD_SURFACE_Y + 0.62,
    radius * Math.sin(angle),
  );
};

/* ═══════════════════════════════════════════
   ACTIVE TILE GLOW + ASCENDING PARTICLES
   ═══════════════════════════════════════════ */

function ActiveTileGlow() {
  const ringRef = useRef();
  const particlesRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const pCount = 14;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ringRef.current) {
      ringRef.current.scale.setScalar(1 + Math.sin(t * 3) * 0.12);
      ringRef.current.material.opacity = 0.55 + Math.sin(t * 3) * 0.2;
    }
    if (particlesRef.current) {
      for (let i = 0; i < pCount; i++) {
        const angle = (i / pCount) * Math.PI * 2 + t * 0.5;
        const yOff = ((t * 0.7 + i * 0.25) % 2.5) * 1.2;
        dummy.position.set(Math.cos(angle) * 0.7, yOff, Math.sin(angle) * 0.7);
        dummy.scale.setScalar(0.05 * Math.max(0.1, 1 - yOff / 3));
        dummy.updateMatrix();
        particlesRef.current.setMatrixAt(i, dummy.matrix);
      }
      particlesRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.25, 0]}>
        <ringGeometry args={[0.9, 1.35, 32]} />
        <meshBasicMaterial color="#44ccff" transparent opacity={0.6} />
      </mesh>
      <instancedMesh ref={particlesRef} args={[null, null, pCount]}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial color="#66ddff" transparent opacity={0.5} />
      </instancedMesh>
    </group>
  );
}

/* ═══════════════════════════════════════════
   BOARD GEOMETRY — GOLD / BRONZE PREMIUM
   ═══════════════════════════════════════════ */

function BoardBase() {
  return (
    <group>
      {/* Outer rim — dark varnished wood */}
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <cylinderGeometry args={[13.2, 13.6, 0.5, 72]} />
        <meshPhysicalMaterial color="#2a1a0e" roughness={0.35} metalness={0.25} clearcoat={0.7} clearcoatRoughness={0.1} />
      </mesh>
      {/* Board edge — mahogany wood */}
      <mesh position={[0, 0.48, 0]} receiveShadow>
        <cylinderGeometry args={[12.8, 13.0, 0.6, 72]} />
        <meshPhysicalMaterial color="#5a3018" roughness={0.3} metalness={0.2} clearcoat={0.8} clearcoatRoughness={0.08} />
      </mesh>
      {/* Tile track — dark green felt like poker table */}
      <mesh position={[0, BOARD_SURFACE_Y + 0.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[BOARD_RADIUS - 0.3, BOARD_RADIUS + 1.4, 72]} />
        <meshPhysicalMaterial color="#2a5038" roughness={0.75} metalness={0.05} />
      </mesh>
      {/* Inner surface — dark green felt */}
      <mesh position={[0, BOARD_SURFACE_Y, 0]} receiveShadow>
        <cylinderGeometry args={[9.2, 9.2, 0.35, 72]} />
        <meshPhysicalMaterial color="#1a3828" roughness={0.7} metalness={0.05} clearcoat={0.15} />
      </mesh>
      {/* Inner brass inlay */}
      <mesh position={[0, BOARD_SURFACE_Y + 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[9.0, 9.4, 72]} />
        <meshPhysicalMaterial color="#a08838" roughness={0.18} metalness={0.8} clearcoat={0.7} clearcoatRoughness={0.06} emissive="#706020" emissiveIntensity={0.2} />
      </mesh>
      {/* Outer brass inlay */}
      <mesh position={[0, BOARD_SURFACE_Y + 0.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[11.8, 12.2, 72]} />
        <meshPhysicalMaterial color="#a08838" roughness={0.2} metalness={0.75} clearcoat={0.6} clearcoatRoughness={0.08} emissive="#706020" emissiveIntensity={0.15} />
      </mesh>
    </group>
  );
}

function CenterMedallion() {
  const logoTex = useTexture('/xamox-logo.png');
  return (
    <group position={[0, BOARD_SURFACE_Y + 0.22, 0]}>
      {/* Brass medallion ring */}
      <mesh castShadow>
        <cylinderGeometry args={[2.5, 2.5, 0.32, 48]} />
        <meshPhysicalMaterial color="#a08838" roughness={0.18} metalness={0.8} clearcoat={0.7} clearcoatRoughness={0.06} emissive="#706020" emissiveIntensity={0.2} />
      </mesh>
      {/* Dark inset */}
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[2.15, 2.15, 0.08, 48]} />
        <meshStandardMaterial color="#0e0e0a" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Logo */}
      <mesh position={[0, 0.24, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.0, 48]} />
        <meshStandardMaterial map={logoTex} transparent roughness={0.4} metalness={0.15} />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════
   TILE ICONS — large, floating, rotating
   ═══════════════════════════════════════════ */

function FloatingIcon({ children }) {
  const ref = useRef();
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.position.y = 0.5 + Math.sin(t * 1.5 + phase) * 0.06;
    ref.current.rotation.y = t * 0.3 + phase;
  });
  return <group ref={ref} position={[0, 0.5, 0]} scale={[1.4, 1.4, 1.4]}>{children}</group>;
}

function TileIcon({ type }) {
  const ic = '#e8d5a0';
  const mp = { roughness: 0.18, metalness: 0.85, emissive: '#c4a44e', emissiveIntensity: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.08 };
  switch (type) {
    case 'star':
      return (
        <FloatingIcon>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.38, 5]} />
            <meshPhysicalMaterial color={ic} {...mp} />
          </mesh>
        </FloatingIcon>
      );
    case 'house':
      return (
        <FloatingIcon>
          <group>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <boxGeometry args={[0.46, 0.35, 0.04]} />
              <meshPhysicalMaterial color={ic} {...mp} />
            </mesh>
            <mesh position={[0, 0.02, -0.13]} rotation={[-Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.38, 0.25, 4]} />
              <meshPhysicalMaterial color={ic} {...mp} />
            </mesh>
          </group>
        </FloatingIcon>
      );
    case 'bolt':
      return (
        <FloatingIcon>
          <mesh rotation={[-Math.PI / 2, 0, Math.PI / 6]}>
            <coneGeometry args={[0.26, 0.6, 3]} />
            <meshPhysicalMaterial color="#ffd866" roughness={0.15} metalness={0.8} emissive="#aa8822" emissiveIntensity={0.5} clearcoat={0.5} />
          </mesh>
        </FloatingIcon>
      );
    case 'brain':
      return (
        <FloatingIcon>
          <mesh position={[0, 0.06, 0]} castShadow>
            <sphereGeometry args={[0.32, 14, 14]} />
            <meshPhysicalMaterial color="#cc99ee" roughness={0.3} metalness={0.35} emissive="#7744aa" emissiveIntensity={0.4} clearcoat={0.45} />
          </mesh>
        </FloatingIcon>
      );
    case 'bars':
    case 'chart':
      return (
        <FloatingIcon>
          <group>
            {[-0.2, 0, 0.2].map((x, i) => (
              <mesh key={i} position={[x, (i + 1) * 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <boxGeometry args={[0.14, 0.14, 0.03 + i * 0.015]} />
                <meshPhysicalMaterial color={ic} {...mp} />
              </mesh>
            ))}
          </group>
        </FloatingIcon>
      );
    case 'bank':
      return (
        <FloatingIcon>
          <group>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <boxGeometry args={[0.56, 0.4, 0.04]} />
              <meshPhysicalMaterial color={ic} {...mp} />
            </mesh>
            {[-0.18, 0, 0.18].map((x, i) => (
              <mesh key={i} position={[x, 0.02, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
                <boxGeometry args={[0.07, 0.24, 0.03]} />
                <meshPhysicalMaterial color={ic} {...mp} />
              </mesh>
            ))}
          </group>
        </FloatingIcon>
      );
    default:
      return (
        <FloatingIcon>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.32, 6]} />
            <meshPhysicalMaterial color={ic} {...mp} />
          </mesh>
        </FloatingIcon>
      );
  }
}

/* ═══════════════════════════════════════════
   TILES — thick, vibrant, metallic clearcoat
   ═══════════════════════════════════════════ */

function Tile3D({ tile, index, active, total }) {
  const style = TILE_STYLES[tile.type] || TILE_STYLES.event;
  const pos = useMemo(() => toXZ(index, total, BOARD_RADIUS), [index, total]);
  const angle = useMemo(() => -(index / total) * Math.PI * 2 + Math.PI / 2, [index, total]);
  const ref = useRef();

  useFrame(({ clock }) => {
    if (!ref.current) return;
    if (active) {
      ref.current.position.y = pos.y + Math.sin(clock.getElapsedTime() * 3) * 0.08;
    }
  });

  return (
    <group ref={ref} position={pos} rotation={[0, angle, 0]}>
      <RoundedBox args={[1.9, 0.9, 1.6]} radius={0.18} smoothness={4} castShadow receiveShadow
        scale={active ? [1.15, 1.15, 1.15] : [1, 1, 1]}>
        <meshPhysicalMaterial
          color={style.color}
          roughness={0.2}
          metalness={0.6}
          clearcoat={0.55}
          clearcoatRoughness={0.08}
          emissive={style.emissive}
          emissiveIntensity={active ? 1.0 : 0.22}
        />
      </RoundedBox>
      <TileIcon type={style.icon} />
      {active && <ActiveTileGlow />}
    </group>
  );
}

/* ═══════════════════════════════════════════
   DICE
   ═══════════════════════════════════════════ */

function PipFace({ value, position, rotation }) {
  const pips = FACE_GRID[value] || FACE_GRID[1];
  return (
    <group position={position} rotation={rotation}>
      {pips.map(([x, y], idx) => (
        <mesh key={`${value}-${idx}`} position={[x * 0.72, y * 0.72, 0.02]}>
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshStandardMaterial color="#111118" roughness={0.1} metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function screenToWorld(ndcX, ndcY, camera, targetY) {
  const v = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(camera);
  const dir = v.sub(camera.position).normalize();
  const dist = (targetY - camera.position.y) / dir.y;
  return camera.position.clone().add(dir.multiplyScalar(dist));
}

function DiePhysics({ value, rolling, xOffset, drag }) {
  const ref = useRef(null);
  const { camera } = useThree();
  const landY = BOARD_SURFACE_Y + 0.8;
  const holdZ = 9;
  const holdX = xOffset * 0.6;
  const holdY = 3;
  const ph = useRef({ vx: 0, vy: 0, vz: 0, vrx: 0, vry: 0, vrz: 0, bounces: 0, mode: 'hold' });
  const tgt = useRef(new THREE.Euler(...(ROTATION_BY_TOP[value] || ROTATION_BY_TOP[1])));
  const prevRolling = useRef(false);

  useEffect(() => {
    if (rolling && !prevRolling.current) {
      const p = ph.current;
      if (p.mode !== 'thrown' && p.mode !== 'bounce') {
        p.mode = 'thrown';
        p.bounces = 0;
        p.vy = 5 + Math.random() * 4;
        p.vx = (Math.random() - 0.5) * 6;
        p.vz = -12 - Math.random() * 6;
        p.vrx = (Math.random() - 0.5) * 20;
        p.vry = (Math.random() - 0.5) * 20;
        p.vrz = (Math.random() - 0.5) * 20;
      }
    }
    if (!rolling && prevRolling.current) {
      tgt.current = new THREE.Euler(...(ROTATION_BY_TOP[value] || ROTATION_BY_TOP[1]));
      const p = ph.current;
      if (p.mode === 'thrown' || p.mode === 'bounce') {
        p.mode = 'landed';
      }
      setTimeout(() => { if (ph.current.mode === 'landed') ph.current.mode = 'return'; }, 500);
    }
    prevRolling.current = rolling;
  }, [rolling, value]);

  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    const p = ph.current;
    const dt = Math.min(delta, 0.033);
    const pos = ref.current.position;
    const rot = ref.current.rotation;
    const t = clock.getElapsedTime();
    const d = drag.current;

    if (d.dragging && (p.mode === 'hold' || p.mode === 'drag')) {
      p.mode = 'drag';
      const ndcX = (d.cx / d.w) * 2 - 1;
      const ndcY = -(d.cy / d.h) * 2 + 1;
      const dragY = THREE.MathUtils.lerp(holdY, holdY + 5, Math.max(0, -ndcY * 0.5 + 0.5));
      const world = screenToWorld(ndcX + xOffset * 0.04, ndcY, camera, dragY);
      pos.x = THREE.MathUtils.lerp(pos.x, world.x, 0.3);
      pos.y = THREE.MathUtils.lerp(pos.y, dragY, 0.3);
      pos.z = THREE.MathUtils.lerp(pos.z, world.z, 0.3);
      rot.x += dt * 6;
      rot.z += dt * 4;
      return;
    }

    if (p.mode === 'drag' && !d.dragging) {
      if (!d.shouldThrow) {
        p.mode = 'return';
        return;
      }
      p.mode = 'thrown';
      p.bounces = 0;
      const speed = Math.sqrt(d.vx * d.vx + d.vy * d.vy);
      const strength = Math.max(0.35, Math.min(speed / 420, 1));
      p.vy = 3.6 + strength * 7.4;
      p.vx = -(d.vx / 600) * 8 + (Math.random() - 0.5) * 2;
      p.vz = Math.min(-7.5, (d.vy / 400) * -16 * strength + (Math.random() - 0.5) * 1.5);
      p.vrx = (Math.random() - 0.5) * 20 * strength;
      p.vry = (Math.random() - 0.5) * 20 * strength;
      p.vrz = (Math.random() - 0.5) * 20 * strength;
      d.shouldThrow = false;
    }

    if (p.mode === 'hold') {
      pos.x = THREE.MathUtils.lerp(pos.x, holdX, 0.06);
      pos.y = holdY + Math.sin(t * 1.8 + xOffset * 2) * 0.2;
      pos.z = THREE.MathUtils.lerp(pos.z, holdZ, 0.06);
      rot.y = t * 0.4 + xOffset;
      rot.x = Math.sin(t * 0.6 + xOffset) * 0.1;
      return;
    }

    if (p.mode === 'thrown' || p.mode === 'bounce') {
      p.vy -= 30 * dt;
      pos.x += p.vx * dt;
      pos.y += p.vy * dt;
      pos.z += p.vz * dt;
      rot.x += p.vrx * dt;
      rot.y += p.vry * dt;
      rot.z += p.vrz * dt;

      if (pos.y <= landY) {
        pos.y = landY;
        p.bounces++;
        p.vy = Math.abs(p.vy) * Math.max(0.1, 0.4 - p.bounces * 0.07);
        p.vx *= 0.55; p.vz *= 0.55;
        p.vrx *= 0.4; p.vry *= 0.4; p.vrz *= 0.4;
        p.mode = 'bounce';
        if (p.vy < 0.3) p.vy = 0;
      }
      if (Math.abs(pos.x) > 6) { pos.x = Math.sign(pos.x) * 6; p.vx *= -0.25; }
      if (pos.z < -6) { pos.z = -6; p.vz *= -0.2; }
      if (pos.z > 10) { pos.z = 10; p.vz *= -0.2; }
      p.vx *= (1 - 2.5 * dt); p.vz *= (1 - 2.5 * dt);
      p.vrx *= (1 - 3 * dt); p.vry *= (1 - 3 * dt); p.vrz *= (1 - 3 * dt);

      if (Math.abs(p.vx) + Math.abs(p.vy) + Math.abs(p.vz) + Math.abs(p.vrx) + Math.abs(p.vry) + Math.abs(p.vrz) < 0.08 && pos.y <= landY + 0.01) {
        p.mode = 'landed';
        tgt.current = new THREE.Euler(...(ROTATION_BY_TOP[value] || ROTATION_BY_TOP[1]));
      }
    } else if (p.mode === 'landed') {
      rot.x = THREE.MathUtils.lerp(rot.x, tgt.current.x, 0.15);
      rot.y = THREE.MathUtils.lerp(rot.y, tgt.current.y, 0.15);
      rot.z = THREE.MathUtils.lerp(rot.z, tgt.current.z, 0.15);
      pos.y = THREE.MathUtils.lerp(pos.y, landY, 0.15);
    } else if (p.mode === 'return') {
      pos.x = THREE.MathUtils.lerp(pos.x, holdX, 0.06);
      pos.y = THREE.MathUtils.lerp(pos.y, holdY, 0.06);
      pos.z = THREE.MathUtils.lerp(pos.z, holdZ, 0.06);
      rot.y = THREE.MathUtils.lerp(rot.y, 0, 0.04);
      if (Math.abs(pos.z - holdZ) < 0.3) p.mode = 'hold';
    }
  });

  const S = 0.84;
  return (
    <group ref={ref} position={[holdX, holdY, holdZ]} castShadow>
      <RoundedBox args={[1.7, 1.7, 1.7]} radius={0.22} smoothness={4}>
        <meshStandardMaterial color="#ffffff" roughness={0.12} metalness={0.02} />
      </RoundedBox>
      <PipFace value={1} position={[0, S, 0]} rotation={[Math.PI / 2, 0, 0]} />
      <PipFace value={6} position={[0, -S, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      <PipFace value={2} position={[0, 0, S]} rotation={[0, 0, 0]} />
      <PipFace value={5} position={[0, 0, -S]} rotation={[0, Math.PI, 0]} />
      <PipFace value={3} position={[S, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
      <PipFace value={4} position={[-S, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
    </group>
  );
}

/* ═══════════════════════════════════════════
   PROFESSION CHARACTER — IK walk system
   ═══════════════════════════════════════════ */

const PROFESSION_OUTFITS = {
  engineer:      { hat: 'hardhat', hatColor: '#e8e8e8', hair: '#2a1a0a', shirt: '#8899aa', belt: '#2a2015', pants: '#b5a88a', boots: '#1a1510', acc: [] },
  doctor:        { hat: null,      hatColor: null,       hair: '#2a1a0a', shirt: '#f0f0f0', belt: '#cccccc', pants: '#f0f0f0', boots: '#e8e8e8', acc: ['stethoscope'] },
  teacher:       { hat: null,      hatColor: null,       hair: '#3b2010', shirt: '#a0522d', belt: '#2a2015', pants: '#2a2a35', boots: '#2a1a10', acc: ['glasses', 'book'] },
  janitor:       { hat: 'cap',     hatColor: '#1a2a4a',  hair: '#2a1a0a', shirt: '#1a2a4a', belt: '#1a1a2a', pants: '#1a2a4a', boots: '#1a1510', acc: ['broom'] },
  nurse:         { hat: 'nursecap',hatColor: '#f0f0f0',  hair: '#5a3020', shirt: '#5aaa9a', belt: '#4a9a8a', pants: '#5aaa9a', boots: '#e8e8e8', acc: [] },
  lawyer:        { hat: null,      hatColor: null,       hair: '#1a1008', shirt: '#1a1a22', belt: '#0a0a12', pants: '#1a1a22', boots: '#0a0a0a', acc: ['tie', 'briefcase'] },
  entrepreneur:  { hat: null,      hatColor: null,       hair: '#3b2818', shirt: '#6a9bc0', belt: '#2a2015', pants: '#2a2a35', boots: '#1a1510', acc: ['glasses'] },
  pilot:         { hat: 'pilotcap',hatColor: '#1a2040',  hair: '#2a1a0a', shirt: '#1a2040', belt: '#d4af37', pants: '#1a2040', boots: '#0a0a0a', acc: ['wings'] },
};

function HatMesh({ type, color }) {
  if (type === 'hardhat') return (
    <group>
      <mesh position={[0, 1.62, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.35, 0.14, 18]} />
        <meshStandardMaterial color={color} roughness={0.25} metalness={0.5} />
      </mesh>
      <mesh position={[0, 1.56, 0]} castShadow>
        <sphereGeometry args={[0.28, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} roughness={0.25} metalness={0.5} />
      </mesh>
    </group>
  );
  if (type === 'cap') return (
    <group>
      <mesh position={[0, 1.56, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.28, 0.1, 18]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position={[0, 1.52, -0.2]} castShadow rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.22, 0.02, 0.18]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} />
      </mesh>
    </group>
  );
  if (type === 'nursecap') return (
    <group>
      <mesh position={[0, 1.58, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.22, 0.14, 18]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
      </mesh>
      <mesh position={[0, 1.64, -0.02]}>
        <boxGeometry args={[0.08, 0.08, 0.02]} />
        <meshStandardMaterial color="#cc2233" roughness={0.4} metalness={0.15} />
      </mesh>
    </group>
  );
  if (type === 'pilotcap') return (
    <group>
      <mesh position={[0, 1.56, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.12, 18]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.4} />
      </mesh>
      <mesh position={[0, 1.52, -0.24]} castShadow rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.26, 0.02, 0.2]} />
        <meshStandardMaterial color="#1a1a2a" roughness={0.2} metalness={0.6} />
      </mesh>
      <mesh position={[0, 1.58, 0.12]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.02, 12]} />
        <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.8} />
      </mesh>
    </group>
  );
  return null;
}

function AccessoryMeshes({ acc }) {
  return (
    <>
      {acc.includes('glasses') && (
        <group position={[0, 1.38, -0.22]}>
          <mesh position={[-0.1, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.06, 0.015, 8, 16]} />
            <meshStandardMaterial color="#222" roughness={0.3} metalness={0.7} />
          </mesh>
          <mesh position={[0.1, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.06, 0.015, 8, 16]} />
            <meshStandardMaterial color="#222" roughness={0.3} metalness={0.7} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.08, 0.015, 0.015]} />
            <meshStandardMaterial color="#222" roughness={0.3} metalness={0.7} />
          </mesh>
        </group>
      )}
      {acc.includes('stethoscope') && (
        <mesh position={[0, 1.12, -0.22]} rotation={[0.3, 0, 0]}>
          <torusGeometry args={[0.12, 0.02, 8, 16, Math.PI]} />
          <meshStandardMaterial color="#555" roughness={0.3} metalness={0.6} />
        </mesh>
      )}
      {acc.includes('tie') && (
        <mesh position={[0, 0.92, -0.24]} castShadow>
          <boxGeometry args={[0.06, 0.4, 0.03]} />
          <meshStandardMaterial color="#cc2233" roughness={0.4} metalness={0.2} />
        </mesh>
      )}
      {acc.includes('wings') && (
        <group position={[0, 1.02, -0.26]}>
          <mesh position={[-0.12, 0, 0]} rotation={[0, 0, -0.3]}>
            <coneGeometry args={[0.04, 0.14, 3]} />
            <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.8} />
          </mesh>
          <mesh position={[0.12, 0, 0]} rotation={[0, 0, 0.3]}>
            <coneGeometry args={[0.04, 0.14, 3]} />
            <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.8} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.04, 10, 10]} />
            <meshStandardMaterial color="#d4af37" roughness={0.2} metalness={0.8} />
          </mesh>
        </group>
      )}
    </>
  );
}

const WALK_SPEED = { slow: { anim: 12, lerp: 0.45 }, medium: { anim: 16, lerp: 0.7 }, fast: { anim: 22, lerp: 0.85 } };

function ProfessionCharacter({ position, walking, professionId = 'engineer', gameSpeed = 'medium' }) {
  const root = useRef(null);
  const torsoGroup = useRef(null);
  const headGroup = useRef(null);
  const leftArm = useRef(null);
  const rightArm = useRef(null);
  const leftLeg = useRef(null);
  const rightLeg = useRef(null);
  const leftKnee = useRef(null);
  const rightKnee = useRef(null);
  const leftEyelid = useRef(null);
  const rightEyelid = useRef(null);
  const tick = useRef(0);
  const blinkTimer = useRef(Math.random() * 3 + 2);
  const lastDir = useRef(0);
  const o = PROFESSION_OUTFITS[professionId] || PROFESSION_OUTFITS.engineer;
  const sp = WALK_SPEED[gameSpeed] || WALK_SPEED.medium;

  useFrame((_, delta) => {
    if (!root.current) return;
    tick.current += delta * (walking ? sp.anim : 2.5);
    const t = tick.current;

    const swing = walking ? Math.sin(t) * 0.6 : Math.sin(t) * 0.08;
    const bob = walking ? Math.abs(Math.sin(t)) * 0.1 : 0.04;

    root.current.position.lerp(
      new THREE.Vector3(position.x, position.y + bob, position.z),
      walking ? sp.lerp : 0.18,
    );

    if (walking) {
      const dx = position.x - root.current.position.x;
      const dz = position.z - root.current.position.z;
      if (dx * dx + dz * dz > 0.02) {
        lastDir.current = Math.atan2(dx, dz) + Math.PI;
      }
      root.current.rotation.y = lerpAngle(root.current.rotation.y, lastDir.current, 0.22);
    } else {
      const outAngle = Math.atan2(position.x, position.z) + Math.PI;
      root.current.rotation.y = lerpAngle(root.current.rotation.y, outAngle, 0.025);
    }

    if (torsoGroup.current) {
      const lean = walking ? -0.12 : 0;
      const sway = walking ? Math.sin(t) * 0.05 : 0;
      torsoGroup.current.rotation.x = THREE.MathUtils.lerp(torsoGroup.current.rotation.x, lean, 0.1);
      torsoGroup.current.rotation.z = THREE.MathUtils.lerp(torsoGroup.current.rotation.z, sway, 0.1);
      torsoGroup.current.position.y = walking ? 0 : Math.sin(t * 0.3) * 0.008;
    }

    if (headGroup.current) {
      if (walking) {
        headGroup.current.rotation.x = THREE.MathUtils.lerp(headGroup.current.rotation.x, 0.12, 0.08);
        headGroup.current.rotation.y = THREE.MathUtils.lerp(headGroup.current.rotation.y, 0, 0.06);
      } else {
        headGroup.current.rotation.x = Math.sin(t * 0.12) * 0.03;
        headGroup.current.rotation.y = Math.sin(t * 0.06) * 0.1;
      }
    }

    if (leftArm.current) leftArm.current.rotation.x = swing;
    if (rightArm.current) rightArm.current.rotation.x = -swing;
    if (leftLeg.current) leftLeg.current.rotation.x = -swing;
    if (rightLeg.current) rightLeg.current.rotation.x = swing;

    if (leftKnee.current) {
      const kl = walking ? Math.max(0, Math.sin(t + 0.8)) * 0.5 : 0;
      leftKnee.current.rotation.x = THREE.MathUtils.lerp(leftKnee.current.rotation.x, -kl, 0.15);
    }
    if (rightKnee.current) {
      const kr = walking ? Math.max(0, Math.sin(t + 0.8 + Math.PI)) * 0.5 : 0;
      rightKnee.current.rotation.x = THREE.MathUtils.lerp(rightKnee.current.rotation.x, -kr, 0.15);
    }

    blinkTimer.current -= delta;
    const isBlinking = blinkTimer.current < 0 && blinkTimer.current > -0.12;
    if (blinkTimer.current < -0.12) blinkTimer.current = 2 + Math.random() * 4;
    const lidY = isBlinking ? 1.43 : 1.49;
    if (leftEyelid.current) leftEyelid.current.position.y = lidY;
    if (rightEyelid.current) rightEyelid.current.position.y = lidY;
  });

  return (
    <group ref={root} position={[position.x, position.y, position.z]} scale={[2.0, 2.0, 2.0]} castShadow>
      <group ref={torsoGroup}>
        <group ref={headGroup}>
          <HatMesh type={o.hat} color={o.hatColor} />
          {!o.hat ? (
            <group>
              <mesh position={[0, 1.5, 0.02]} castShadow>
                <sphereGeometry args={[0.26, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                <meshStandardMaterial color={o.hair} roughness={0.85} />
              </mesh>
              <mesh position={[0, 1.32, 0.12]} castShadow>
                <sphereGeometry args={[0.24, 16, 10, 0, Math.PI * 2, Math.PI * 0.4, Math.PI * 0.6]} />
                <meshStandardMaterial color={o.hair} roughness={0.85} />
              </mesh>
            </group>
          ) : (
            <mesh position={[0, 1.32, 0.1]} castShadow>
              <sphereGeometry args={[0.22, 14, 10, 0, Math.PI * 2, Math.PI / 3, Math.PI * 0.7]} />
              <meshStandardMaterial color={o.hair} roughness={0.85} />
            </mesh>
          )}
          <mesh position={[0, 1.38, 0]} castShadow>
            <sphereGeometry args={[0.26, 24, 24]} />
            <meshStandardMaterial color="#f5d0a9" roughness={0.55} metalness={0.03} />
          </mesh>
          <mesh position={[-0.25, 1.36, 0]} castShadow>
            <sphereGeometry args={[0.06, 10, 10]} />
            <meshStandardMaterial color="#e8b890" roughness={0.6} />
          </mesh>
          <mesh position={[0.25, 1.36, 0]} castShadow>
            <sphereGeometry args={[0.06, 10, 10]} />
            <meshStandardMaterial color="#e8b890" roughness={0.6} />
          </mesh>
          <mesh position={[-0.09, 1.42, -0.22]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={0.2} />
          </mesh>
          <mesh position={[-0.09, 1.42, -0.27]}>
            <sphereGeometry args={[0.035, 10, 10]} />
            <meshStandardMaterial color="#2a1a08" roughness={0.1} />
          </mesh>
          <mesh position={[-0.08, 1.43, -0.295]}>
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0.09, 1.42, -0.22]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshStandardMaterial color="#ffffff" roughness={0.2} />
          </mesh>
          <mesh position={[0.09, 1.42, -0.27]}>
            <sphereGeometry args={[0.035, 10, 10]} />
            <meshStandardMaterial color="#2a1a08" roughness={0.1} />
          </mesh>
          <mesh position={[0.1, 1.43, -0.295]}>
            <sphereGeometry args={[0.012, 8, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh ref={leftEyelid} position={[-0.09, 1.49, -0.23]}>
            <boxGeometry args={[0.13, 0.05, 0.06]} />
            <meshStandardMaterial color="#f5d0a9" roughness={0.55} />
          </mesh>
          <mesh ref={rightEyelid} position={[0.09, 1.49, -0.23]}>
            <boxGeometry args={[0.13, 0.05, 0.06]} />
            <meshStandardMaterial color="#f5d0a9" roughness={0.55} />
          </mesh>
          <mesh position={[-0.09, 1.48, -0.22]} rotation={[0.15, 0, 0.1]}>
            <boxGeometry args={[0.1, 0.02, 0.025]} />
            <meshStandardMaterial color={o.hair} roughness={0.7} />
          </mesh>
          <mesh position={[0.09, 1.48, -0.22]} rotation={[0.15, 0, -0.1]}>
            <boxGeometry args={[0.1, 0.02, 0.025]} />
            <meshStandardMaterial color={o.hair} roughness={0.7} />
          </mesh>
          <mesh position={[0, 1.37, -0.25]}>
            <sphereGeometry args={[0.035, 10, 10]} />
            <meshStandardMaterial color="#e8b890" roughness={0.5} />
          </mesh>
          <mesh position={[0, 1.31, -0.23]} rotation={[0.1, 0, 0]}>
            <boxGeometry args={[0.1, 0.02, 0.02]} />
            <meshStandardMaterial color="#c47a6a" roughness={0.5} />
          </mesh>
          <mesh position={[-0.055, 1.315, -0.225]} rotation={[0.1, 0, -0.3]}>
            <boxGeometry args={[0.03, 0.015, 0.015]} />
            <meshStandardMaterial color="#c47a6a" roughness={0.5} />
          </mesh>
          <mesh position={[0.055, 1.315, -0.225]} rotation={[0.1, 0, 0.3]}>
            <boxGeometry args={[0.03, 0.015, 0.015]} />
            <meshStandardMaterial color="#c47a6a" roughness={0.5} />
          </mesh>
        </group>

        <mesh position={[0, 1.18, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.12, 0.12, 12]} />
          <meshStandardMaterial color="#f0c8a0" roughness={0.55} />
        </mesh>
        <AccessoryMeshes acc={o.acc} />
        <mesh position={[0, 1.0, 0]} castShadow>
          <capsuleGeometry args={[0.28, 0.3, 8, 14]} />
          <meshStandardMaterial color={o.shirt} roughness={0.5} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.72, 0]} castShadow>
          <capsuleGeometry args={[0.24, 0.22, 8, 14]} />
          <meshStandardMaterial color={o.shirt} roughness={0.5} metalness={0.1} />
        </mesh>
        <mesh position={[-0.32, 1.1, 0]} castShadow>
          <sphereGeometry args={[0.1, 10, 10]} />
          <meshStandardMaterial color={o.shirt} roughness={0.5} metalness={0.1} />
        </mesh>
        <mesh position={[0.32, 1.1, 0]} castShadow>
          <sphereGeometry args={[0.1, 10, 10]} />
          <meshStandardMaterial color={o.shirt} roughness={0.5} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0.6, 0]} castShadow>
          <cylinderGeometry args={[0.25, 0.25, 0.06, 16]} />
          <meshStandardMaterial color={o.belt} roughness={0.5} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.6, -0.24]}>
          <boxGeometry args={[0.06, 0.05, 0.02]} />
          <meshStandardMaterial color="#c4a44e" roughness={0.25} metalness={0.7} />
        </mesh>

        <group ref={leftArm} position={[-0.38, 1.08, 0]}>
          <mesh position={[0, -0.2, 0]} castShadow>
            <capsuleGeometry args={[0.09, 0.28, 6, 10]} />
            <meshStandardMaterial color={o.shirt} roughness={0.5} metalness={0.1} />
          </mesh>
          <mesh position={[0, -0.44, 0]} castShadow>
            <capsuleGeometry args={[0.07, 0.22, 6, 10]} />
            <meshStandardMaterial color="#f0c8a0" roughness={0.55} />
          </mesh>
          <group position={[0, -0.62, 0]}>
            <mesh castShadow>
              <sphereGeometry args={[0.065, 10, 10]} />
              <meshStandardMaterial color="#f0c8a0" roughness={0.55} />
            </mesh>
            {[[-0.03, -0.04, -0.02], [0, -0.05, -0.02], [0.025, -0.04, -0.02], [-0.02, -0.03, -0.03]].map(([fx, fy, fz], fi) => (
              <mesh key={fi} position={[fx, fy, fz]} castShadow>
                <capsuleGeometry args={[0.015, 0.03, 4, 6]} />
                <meshStandardMaterial color="#eabc92" roughness={0.55} />
              </mesh>
            ))}
          </group>
          {o.acc.includes('book') && (
            <mesh position={[0, -0.48, -0.1]} castShadow>
              <boxGeometry args={[0.14, 0.18, 0.04]} />
              <meshStandardMaterial color="#8b4513" roughness={0.6} metalness={0.1} />
            </mesh>
          )}
          {o.acc.includes('broom') && (
            <group position={[0, -0.3, -0.08]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.02, 0.02, 0.8, 8]} />
                <meshStandardMaterial color="#c4a44e" roughness={0.7} metalness={0.1} />
              </mesh>
              <mesh position={[0, -0.42, 0]} castShadow>
                <boxGeometry args={[0.12, 0.1, 0.06]} />
                <meshStandardMaterial color="#8b7355" roughness={0.8} metalness={0.05} />
              </mesh>
            </group>
          )}
        </group>

        <group ref={rightArm} position={[0.38, 1.08, 0]}>
          <mesh position={[0, -0.2, 0]} castShadow>
            <capsuleGeometry args={[0.09, 0.28, 6, 10]} />
            <meshStandardMaterial color={o.shirt} roughness={0.5} metalness={0.1} />
          </mesh>
          <mesh position={[0, -0.44, 0]} castShadow>
            <capsuleGeometry args={[0.07, 0.22, 6, 10]} />
            <meshStandardMaterial color="#f0c8a0" roughness={0.55} />
          </mesh>
          <group position={[0, -0.62, 0]}>
            <mesh castShadow>
              <sphereGeometry args={[0.065, 10, 10]} />
              <meshStandardMaterial color="#f0c8a0" roughness={0.55} />
            </mesh>
            {[[0.03, -0.04, -0.02], [0, -0.05, -0.02], [-0.025, -0.04, -0.02], [0.02, -0.03, -0.03]].map(([fx, fy, fz], fi) => (
              <mesh key={fi} position={[fx, fy, fz]} castShadow>
                <capsuleGeometry args={[0.015, 0.03, 4, 6]} />
                <meshStandardMaterial color="#eabc92" roughness={0.55} />
              </mesh>
            ))}
          </group>
          {o.acc.includes('briefcase') && (
            <mesh position={[0, -0.55, -0.1]} castShadow>
              <boxGeometry args={[0.2, 0.14, 0.06]} />
              <meshStandardMaterial color="#3a2a1a" roughness={0.5} metalness={0.3} />
            </mesh>
          )}
        </group>
      </group>

      <group ref={leftLeg} position={[-0.14, 0.52, 0]}>
        <mesh position={[0, -0.16, 0]} castShadow>
          <capsuleGeometry args={[0.11, 0.20, 6, 10]} />
          <meshStandardMaterial color={o.pants} roughness={0.55} metalness={0.06} />
        </mesh>
        <group ref={leftKnee} position={[0, -0.33, 0]}>
          <mesh position={[0, -0.1, 0]} castShadow>
            <capsuleGeometry args={[0.09, 0.18, 6, 10]} />
            <meshStandardMaterial color={o.pants} roughness={0.55} metalness={0.06} />
          </mesh>
          <group position={[0, -0.26, -0.04]}>
            <mesh castShadow>
              <boxGeometry args={[0.14, 0.1, 0.26]} />
              <meshStandardMaterial color={o.boots} roughness={0.6} metalness={0.15} />
            </mesh>
            <mesh position={[0, -0.04, 0.01]}>
              <boxGeometry args={[0.15, 0.03, 0.28]} />
              <meshStandardMaterial color="#0a0a0a" roughness={0.8} metalness={0.1} />
            </mesh>
          </group>
        </group>
      </group>

      <group ref={rightLeg} position={[0.14, 0.52, 0]}>
        <mesh position={[0, -0.16, 0]} castShadow>
          <capsuleGeometry args={[0.11, 0.20, 6, 10]} />
          <meshStandardMaterial color={o.pants} roughness={0.55} metalness={0.06} />
        </mesh>
        <group ref={rightKnee} position={[0, -0.33, 0]}>
          <mesh position={[0, -0.1, 0]} castShadow>
            <capsuleGeometry args={[0.09, 0.18, 6, 10]} />
            <meshStandardMaterial color={o.pants} roughness={0.55} metalness={0.06} />
          </mesh>
          <group position={[0, -0.26, -0.04]}>
            <mesh castShadow>
              <boxGeometry args={[0.14, 0.1, 0.26]} />
              <meshStandardMaterial color={o.boots} roughness={0.6} metalness={0.15} />
            </mesh>
            <mesh position={[0, -0.04, 0.01]}>
              <boxGeometry args={[0.15, 0.03, 0.28]} />
              <meshStandardMaterial color="#0a0a0a" roughness={0.8} metalness={0.1} />
            </mesh>
          </group>
        </group>
      </group>

      <mesh position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.35, 0.56, 28]} />
        <meshBasicMaterial color="#44ccff" transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

function OpponentPawn({ position, color = '#7aa6ff', active = false }) {
  const ref = useRef(null);
  const tRef = useRef(Math.random() * Math.PI * 2);

  useFrame((_, delta) => {
    if (!ref.current) return;
    tRef.current += delta * (active ? 2.8 : 1.7);
    ref.current.position.set(position.x, position.y + Math.sin(tRef.current) * 0.06, position.z);
  });

  return (
    <group ref={ref} position={[position.x, position.y, position.z]}>
      <mesh castShadow>
        <capsuleGeometry args={[0.18, 0.28, 8, 12]} />
        <meshPhysicalMaterial
          color={color}
          roughness={0.28}
          metalness={0.55}
          clearcoat={0.5}
          clearcoatRoughness={0.1}
          emissive={active ? color : '#000000'}
          emissiveIntensity={active ? 0.22 : 0}
        />
      </mesh>
      <mesh position={[0, 0.34, 0]} castShadow>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#f0d7b6" roughness={0.5} metalness={0.08} />
      </mesh>
      <mesh position={[0, -0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.22, 0.32, 24]} />
        <meshBasicMaterial color={active ? '#f7d77a' : '#66b8ff'} transparent opacity={active ? 0.9 : 0.55} />
      </mesh>
    </group>
  );
}

/* ═══════════════════════════════════════════
   EFFECTS
   ═══════════════════════════════════════════ */

function ImpactPulse({ active, position }) {
  const ringRef = useRef(null);
  const progress = useRef(1);
  useEffect(() => { if (active) progress.current = 0; }, [active]);
  useFrame((_, delta) => {
    if (!ringRef.current) return;
    progress.current = Math.min(1, progress.current + delta * 2.4);
    const p = progress.current;
    ringRef.current.position.copy(position);
    ringRef.current.scale.setScalar(0.5 + p * 3);
    ringRef.current.material.opacity = Math.max(0, 0.7 - p * 0.85);
    ringRef.current.visible = p < 1;
  });
  return (
    <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.6, 0.9, 48]} />
      <meshBasicMaterial color="#44ccff" transparent opacity={0.6} />
    </mesh>
  );
}

/* ═══════════════════════════════════════════
   CINEMATIC CAMERA — low angle, dramatic orbit
   ═══════════════════════════════════════════ */

function CinematicCamera() {
  const { camera } = useThree();
  const time = useRef(0);

  useFrame((_, delta) => {
    time.current += delta;
    const t = time.current;
    camera.position.set(Math.sin(t * 0.08) * 0.3, 24, 14);
    camera.lookAt(0, BOARD_SURFACE_Y, -1);
  });

  return null;
}

/* ═══════════════════════════════════════════
   FULL 3D SCENE — warm cinematic lighting
   ═══════════════════════════════════════════ */

function BoardScene({
  tiles,
  animatedPos,
  impactPulse,
  playerColor,
  players,
  walking,
  diceValues,
  rolling,
  professionId,
  gameSpeed,
  drag,
  activePlayerId,
  selfPlayerId,
}) {
  const total = tiles.length || TILE_COUNT_FALLBACK;
  const current = useMemo(() => toXZ(animatedPos, total, BOARD_RADIUS), [animatedPos, total]);
  const playerPoint = useMemo(() => ({ x: current.x, y: BOARD_SURFACE_Y + 0.7, z: current.z }), [current]);
  const safeD = useMemo(() => [
    Math.min(6, Math.max(1, diceValues[0] || 1)),
    Math.min(6, Math.max(1, diceValues[1] || 1)),
  ], [diceValues]);
  const allPlayers = useMemo(() => {
    const selfId = selfPlayerId || 'self-player';
    return [
      { id: selfId, position: animatedPos, color: playerColor, profession_id: professionId, isSelf: true },
      ...(players || []).map((p) => ({ ...p, isSelf: false })),
    ];
  }, [animatedPos, playerColor, professionId, players, selfPlayerId]);
  const arrangedPlayers = useMemo(() => {
    const byTile = new Map();
    const normalized = allPlayers.map((p) => {
      const tileIndex = ((p.position ?? 0) % total + total) % total;
      if (!byTile.has(tileIndex)) byTile.set(tileIndex, []);
      byTile.get(tileIndex).push(p.id);
      return { ...p, tileIndex };
    });

    return normalized.map((p) => {
      const group = byTile.get(p.tileIndex) || [p.id];
      const stackIndex = Math.max(0, group.indexOf(p.id));
      const count = group.length;
      const angle = count > 1 ? (stackIndex / count) * Math.PI * 2 : 0;
      const spreadRadius = count > 1 ? 0.42 : 0;
      const base = toXZ(p.tileIndex, total, BOARD_RADIUS);
      return {
        ...p,
        point: {
          x: base.x + Math.cos(angle) * spreadRadius,
          y: BOARD_SURFACE_Y + 0.7,
          z: base.z + Math.sin(angle) * spreadRadius,
        },
      };
    });
  }, [allPlayers, total]);
  const selfRenderPoint = useMemo(() => {
    const selfId = selfPlayerId || 'self-player';
    return arrangedPlayers.find((p) => p.id === selfId)?.point || playerPoint;
  }, [arrangedPlayers, playerPoint, selfPlayerId]);

  return (
    <>
      <color attach="background" args={['#0a1210']} />
      <fog attach="fog" args={['#0a1210', 35, 65]} />

      <ambientLight intensity={0.35} color="#ffeedd" />
      <hemisphereLight color="#ffd8a0" groundColor="#1a1008" intensity={0.45} />

      <directionalLight
        position={[12, 20, 8]}
        intensity={2.5}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-bias={-0.001}
        color="#ffe0b0"
      />

      <spotLight position={[-10, 14, -6]} angle={0.45} penumbra={0.7} intensity={0.9} color="#ffd090" />
      <spotLight position={[0, 10, 16]} angle={0.5} penumbra={0.8} intensity={1.6} color="#ffcc60" castShadow />
      <pointLight position={[0, 5, 0]} intensity={1.5} color="#d4af37" distance={22} />

      <BoardBase />
      <CenterMedallion />

      {tiles.map((tile, i) => (
        <Tile3D key={`${tile.type}-${i}`} tile={tile} index={i} total={total} active={i === animatedPos} />
      ))}

      <ProfessionCharacter position={selfRenderPoint} walking={walking} professionId={professionId} gameSpeed={gameSpeed} />

      <DiePhysics value={safeD[0]} rolling={rolling} xOffset={-3} drag={drag} />
      <DiePhysics value={safeD[1]} rolling={rolling} xOffset={3} drag={drag} />

      {arrangedPlayers
        .filter((p) => !p.isSelf)
        .map((p, idx) => (
          <OpponentPawn
            key={p.id || `op-${idx}`}
            position={p.point}
            color={p.color || '#7aa6ff'}
            active={activePlayerId ? p.id === activePlayerId : false}
          />
        ))}

      <ImpactPulse active={impactPulse} position={new THREE.Vector3(current.x, BOARD_SURFACE_Y + 0.5, current.z)} />

      <CinematicCamera />
      <Environment preset="sunset" />
      <ContactShadows position={[0, -0.1, 0]} opacity={0.5} blur={2.2} scale={35} far={18} />

      <EffectComposer>
        <Bloom intensity={0.45} luminanceThreshold={0.55} luminanceSmoothing={0.85} />
        <SSAO radius={0.15} intensity={18} luminanceInfluence={0.4} />
        <Vignette offset={0.35} darkness={0.35} />
      </EffectComposer>
    </>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT — step-by-step walking
   ═══════════════════════════════════════════ */

export default function Board({
  tiles,
  playerPosition,
  playerColor = '#FFD700',
  playerName = '',
  playerAvatar = '',
  players = [],
  diceValues = [0, 0],
  rolling = false,
  onRollDice,
  phase = 'roll',
  rollLabel = 'Lanzar Dados',
  professionId = 'engineer',
  gameSpeed = 'medium',
  activePlayerId = null,
  selfPlayerId = null,
}) {
  const [animatedPos, setAnimatedPos] = useState(playerPosition);
  const [impactPulse, setImpactPulse] = useState(false);
  const [walking, setWalking] = useState(false);
  const prevPosRef = useRef(playerPosition);
  const walkEndTimer = useRef(null);
  const total = tiles.length || TILE_COUNT_FALLBACK;

  useEffect(() => {
    const newPos = ((playerPosition % total) + total) % total;
    const prev = prevPosRef.current;
    prevPosRef.current = playerPosition;

    if (prev === playerPosition) return;

    setAnimatedPos(newPos);
    setWalking(true);
    setImpactPulse(false);

    if (walkEndTimer.current) clearTimeout(walkEndTimer.current);
    walkEndTimer.current = setTimeout(() => {
      setWalking(false);
      setImpactPulse(true);
      setTimeout(() => setImpactPulse(false), 300);
    }, 200);

    return () => {
      if (walkEndTimer.current) clearTimeout(walkEndTimer.current);
    };
  }, [playerPosition, total]);

  const diceTotal = (diceValues[0] || 0) + (diceValues[1] || 0);
  const drag = useRef({
    dragging: false,
    pointerId: null,
    cx: 0,
    cy: 0,
    w: 1,
    h: 1,
    vx: 0,
    vy: 0,
    samples: [],
    startX: 0,
    startY: 0,
    startT: 0,
    shouldThrow: false,
  });
  const containerRef = useRef(null);
  const renderDpr = useMemo(() => {
    const pixelRatio = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    const max = Math.min(3, Math.max(2, pixelRatio * 1.2));
    const min = Math.max(1.8, max - 0.6);
    return [min, max];
  }, []);

  const onDown = useCallback((e) => {
    if (phase !== 'roll' || rolling || !onRollDice) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const d = drag.current;
    d.dragging = true;
    d.pointerId = e.pointerId;
    d.cx = e.clientX - rect.left;
    d.cy = e.clientY - rect.top;
    d.w = rect.width;
    d.h = rect.height;
    d.vx = 0; d.vy = 0;
    d.startX = e.clientX;
    d.startY = e.clientY;
    d.startT = Date.now();
    d.shouldThrow = false;
    d.samples = [{ x: e.clientX, y: e.clientY, t: d.startT }];
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
  }, [phase, rolling, onRollDice]);

  const onMove = useCallback((e) => {
    const d = drag.current;
    if (d.pointerId !== null && e.pointerId !== d.pointerId) return;
    if (!d.dragging) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    d.cx = e.clientX - rect.left;
    d.cy = e.clientY - rect.top;
    d.samples.push({ x: e.clientX, y: e.clientY, t: Date.now() });
    if (d.samples.length > 8) d.samples.shift();
  }, []);

  const onUp = useCallback((e) => {
    const d = drag.current;
    if (d.pointerId !== null && e.pointerId !== d.pointerId) return;
    if (!d.dragging) return;
    d.dragging = false;
    const s = d.samples;
    let speed = 0;
    if (s.length >= 2) {
      const last = s[s.length - 1];
      const first = s[Math.max(0, s.length - 4)];
      const dt = (last.t - first.t) / 1000;
      if (dt > 0) {
        d.vx = (last.x - first.x) / dt;
        d.vy = (last.y - first.y) / dt;
        speed = Math.sqrt(d.vx * d.vx + d.vy * d.vy);
      }
    }
    const dx = (s[s.length - 1]?.x ?? d.startX) - d.startX;
    const dy = (s[s.length - 1]?.y ?? d.startY) - d.startY;
    const distance = Math.hypot(dx, dy);
    const duration = Math.max(1, Date.now() - d.startT);
    d.shouldThrow = speed > 90 || distance > 18 || dy < -16 || duration > 140;
    if (d.shouldThrow && phase === 'roll' && !rolling && onRollDice) onRollDice();
    d.pointerId = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
  }, [onRollDice, phase, rolling]);

  return (
    <div ref={containerRef} className="board-container relative" style={{ width: '100%', height: '100%', touchAction: 'none' }} data-testid="game-board"
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <Canvas
        shadows={{ type: THREE.PCFSoftShadowMap }}
        camera={{ position: [0, 24, 14], fov: 56, near: 0.1, far: 130 }}
        gl={{ antialias: true, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.45 }}
        dpr={renderDpr}
        style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        <BoardScene
          tiles={tiles}
          animatedPos={animatedPos}
          impactPulse={impactPulse}
          playerColor={playerColor}
          players={players}
          walking={walking}
          diceValues={diceValues}
          rolling={rolling}
          professionId={professionId}
          gameSpeed={gameSpeed}
          drag={drag}
          activePlayerId={activePlayerId}
          selfPlayerId={selfPlayerId}
        />
      </Canvas>

      <div className="absolute top-2 left-3 z-20 px-2.5 py-0.5 rounded-lg text-[10px] font-bold text-white bg-black/50 border border-[rgba(212,175,55,0.25)] backdrop-blur-sm pointer-events-none">
        {playerName || 'Player'}
      </div>

      {!rolling && diceTotal > 0 && (
        <div className="absolute top-2 right-3 z-20 px-3 py-1 rounded-lg text-sm font-bold text-white bg-black/70 border border-[rgba(212,175,55,0.35)] backdrop-blur-sm tabular-nums pointer-events-none">
          {diceValues[0]}+{diceValues[1]}={diceTotal}
        </div>
      )}

      {phase === 'roll' && !rolling && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
          <span className="text-[11px] font-black tracking-[0.25em] uppercase" style={{
            background: 'linear-gradient(90deg, #8a7a4a, #d4c080, #fff8e0, #d4c080, #8a7a4a)',
            backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            animation: 'shimmer 3s linear infinite',
          }}>Arrastra los dados</span>
        </div>
      )}

      {phase === 'moving' && diceTotal > 0 && (
        <div className="absolute bottom-3 left-3 z-20 text-[var(--gold)] font-medium text-xs animate-pulse bg-black/60 px-3 py-1.5 rounded-lg backdrop-blur-sm tabular-nums pointer-events-none">
          {diceValues[0]}+{diceValues[1]}={diceTotal}
        </div>
      )}
    </div>
  );
}
