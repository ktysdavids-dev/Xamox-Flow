import React, { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

const FACE_GRID = {
  1: [[0, 0]],
  2: [[-0.55, -0.55], [0.55, 0.55]],
  3: [[-0.55, -0.55], [0, 0], [0.55, 0.55]],
  4: [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]],
  5: [[-0.55, -0.55], [0.55, -0.55], [0, 0], [-0.55, 0.55], [0.55, 0.55]],
  6: [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0], [0.55, 0], [-0.55, 0.55], [0.55, 0.55]],
};

const ROTATION_BY_TOP = {
  1: [0, 0, 0],
  2: [-Math.PI / 2, 0, 0],
  3: [0, 0, Math.PI / 2],
  4: [0, 0, -Math.PI / 2],
  5: [Math.PI / 2, 0, 0],
  6: [Math.PI, 0, 0],
};

function PipFace({ value, position, rotation }) {
  const pips = FACE_GRID[value] || FACE_GRID[1];
  return (
    <group position={position} rotation={rotation}>
      {pips.map(([x, y], idx) => (
        <mesh key={`${value}-${idx}`} position={[x * 0.72, y * 0.72, 0.02]}>
          <sphereGeometry args={[0.14, 12, 12]} />
          <meshStandardMaterial color="#111122" roughness={0.3} metalness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

function Die({ value, rolling, delay = 0, xOffset = 0 }) {
  const ref = useRef(null);
  const time = useRef(0);
  const target = useRef(new THREE.Euler(...(ROTATION_BY_TOP[value] || ROTATION_BY_TOP[1])));

  useEffect(() => {
    if (rolling) {
      target.current = new THREE.Euler(
        Math.random() * Math.PI * 8,
        Math.random() * Math.PI * 8,
        Math.random() * Math.PI * 8,
      );
      return;
    }
    const base = ROTATION_BY_TOP[value] || ROTATION_BY_TOP[1];
    target.current = new THREE.Euler(
      base[0] + Math.PI * 2,
      base[1] + (value % 2 === 0 ? Math.PI * 1.5 : Math.PI * 1.2),
      base[2],
    );
  }, [rolling, value]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    time.current += delta;
    const t = Math.max(0, time.current - delay);
    if (t < 0.01) return;

    const lerp = rolling ? 0.2 : 0.1;
    ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, target.current.x, lerp);
    ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, target.current.y, lerp);
    ref.current.rotation.z = THREE.MathUtils.lerp(ref.current.rotation.z, target.current.z, lerp);

    const bounce = rolling
      ? Math.abs(Math.sin(t * 7)) * 1.2
      : 0.12 + Math.sin(t * 2) * 0.06;
    ref.current.position.y = 1.2 + bounce;
    ref.current.position.x = xOffset;
    ref.current.position.z = rolling ? Math.sin(t * 5) * 0.5 : 0;
  });

  return (
    <group ref={ref} position={[xOffset, 1.2, 0]}>
      <RoundedBox args={[1.8, 1.8, 1.8]} radius={0.28} smoothness={4}>
        <meshStandardMaterial color="#f5f5f0" roughness={0.2} metalness={0.02} />
      </RoundedBox>
      <PipFace value={1} position={[0, 0.92, 0]} rotation={[Math.PI / 2, 0, 0]} />
      <PipFace value={6} position={[0, -0.92, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      <PipFace value={2} position={[0, 0, 0.92]} rotation={[0, 0, 0]} />
      <PipFace value={5} position={[0, 0, -0.92]} rotation={[0, Math.PI, 0]} />
      <PipFace value={3} position={[0.92, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
      <PipFace value={4} position={[-0.92, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
    </group>
  );
}

function DiceScene({ values, rolling }) {
  return (
    <>
      <color attach="background" args={['#0d1520']} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 10, 6]} intensity={1.5} color="#fff8f0" />
      <hemisphereLight color="#b0d8f0" groundColor="#1a1a30" intensity={0.2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.3, 0]}>
        <circleGeometry args={[5, 48]} />
        <meshStandardMaterial color="#C8960C" roughness={0.35} metalness={0.5} emissive="#6B4F08" emissiveIntensity={0.1} />
      </mesh>
      <Die value={values[0]} rolling={rolling} delay={0.02} xOffset={-1.6} />
      <Die value={values[1]} rolling={rolling} delay={0.12} xOffset={1.6} />
    </>
  );
}

export default function Dice3D({ values = [1, 1], rolling = false }) {
  const safeValues = useMemo(() => [
    Math.min(6, Math.max(1, values[0] || 1)),
    Math.min(6, Math.max(1, values[1] || 1)),
  ], [values]);

  return (
    <div className="flex items-center gap-3" data-testid="dice-3d">
      <div className="relative w-[280px] h-[160px] rounded-2xl overflow-hidden border border-[rgba(212,175,55,0.3)] bg-[rgba(13,21,32,0.9)]" style={{boxShadow: '0 8px 32px rgba(0,0,0,0.5)'}}>
        <Canvas camera={{ position: [0, 5.5, 8], fov: 38 }} gl={{ antialias: true, toneMapping: THREE.NoToneMapping }} dpr={[1, 1.5]}>
          <DiceScene values={safeValues} rolling={rolling} />
        </Canvas>
      </div>
      {!rolling && (
        <div className="text-lg font-bold text-[var(--gold)] tabular-nums">
          = {safeValues[0] + safeValues[1]}
        </div>
      )}
    </div>
  );
}
