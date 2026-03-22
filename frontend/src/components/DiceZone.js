import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { RoundedBox, Environment } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

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

function PipFace({ value, position, rotation }) {
  const pips = FACE_GRID[value] || FACE_GRID[1];
  return (
    <group position={position} rotation={rotation}>
      {pips.map(([x, y], idx) => (
        <mesh key={`${value}-${idx}`} position={[x * 0.55, y * 0.55, 0.02]}>
          <sphereGeometry args={[0.08, 10, 10]} />
          <meshStandardMaterial color="#0a0a14" roughness={0.1} metalness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function DraggableDie({ value, rolling, xOffset = 0, dragState, dieIndex }) {
  const ref = useRef(null);
  const physicsRef = useRef({
    vx: 0, vy: 0, vz: 0,
    vrx: 0, vry: 0, vrz: 0,
    settled: true,
    baseX: xOffset, baseY: 0.65, baseZ: 0,
  });
  const target = useRef(new THREE.Euler(...(ROTATION_BY_TOP[value] || ROTATION_BY_TOP[1])));

  useEffect(() => {
    const p = physicsRef.current;
    if (rolling) {
      target.current = new THREE.Euler(
        Math.random() * Math.PI * 8,
        Math.random() * Math.PI * 8,
        Math.random() * Math.PI * 8,
      );
      p.vy = 1.5 + Math.random() * 1.5;
      p.vx = (Math.random() - 0.5) * 3;
      p.vz = (Math.random() - 0.5) * 2;
      p.vrx = (Math.random() - 0.5) * 15;
      p.vry = (Math.random() - 0.5) * 15;
      p.vrz = (Math.random() - 0.5) * 15;
      p.settled = false;
      return;
    }
    if (!rolling && value) {
      const base = ROTATION_BY_TOP[value] || ROTATION_BY_TOP[1];
      target.current = new THREE.Euler(base[0], base[1], base[2]);
    }
  }, [rolling, value]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    const p = physicsRef.current;
    const drag = dragState.current;
    const dt = Math.min(delta, 0.05);

    if (drag.active && drag.dieIndex === dieIndex) {
      const { viewport } = state;
      const nx = (drag.currentX / window.innerWidth) * 2 - 1;
      const ny = -(drag.currentY / window.innerHeight) * 2 + 1;
      const tx = nx * viewport.width * 0.5;
      const ty = ny * viewport.height * 0.5 + 0.5;
      ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, tx, 0.35);
      ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, Math.max(0.65, ty), 0.35);
      ref.current.rotation.x += dt * 4;
      ref.current.rotation.z += dt * 3;
      p.settled = false;
      return;
    }

    if (!p.settled) {
      p.vy -= 12 * dt;
      ref.current.position.x += p.vx * dt;
      ref.current.position.y += p.vy * dt;
      ref.current.position.z += p.vz * dt;

      ref.current.rotation.x += p.vrx * dt;
      ref.current.rotation.y += p.vry * dt;
      ref.current.rotation.z += p.vrz * dt;

      if (ref.current.position.y <= 0.65) {
        ref.current.position.y = 0.65;
        p.vy *= -0.3;
        p.vx *= 0.7;
        p.vz *= 0.7;
        p.vrx *= 0.5;
        p.vry *= 0.5;
        p.vrz *= 0.5;
        if (Math.abs(p.vy) < 0.15) p.vy = 0;
      }

      const xLimit = 2.8;
      if (Math.abs(ref.current.position.x) > xLimit) {
        ref.current.position.x = Math.sign(ref.current.position.x) * xLimit;
        p.vx *= -0.4;
      }

      p.vx *= (1 - 2.5 * dt);
      p.vz *= (1 - 2.5 * dt);
      p.vrx *= (1 - 3.0 * dt);
      p.vry *= (1 - 3.0 * dt);
      p.vrz *= (1 - 3.0 * dt);

      const totalV = Math.abs(p.vx) + Math.abs(p.vy) + Math.abs(p.vz) + Math.abs(p.vrx) + Math.abs(p.vry) + Math.abs(p.vrz);
      if (totalV < 0.08 && ref.current.position.y <= 0.66) {
        p.settled = true;
        ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, target.current.x, 0.15);
        ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, target.current.y, 0.15);
        ref.current.rotation.z = THREE.MathUtils.lerp(ref.current.rotation.z, target.current.z, 0.15);
      }
    } else {
      ref.current.position.x = THREE.MathUtils.lerp(ref.current.position.x, p.baseX, 0.04);
      ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, p.baseY, 0.06);
      ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, target.current.x, 0.08);
      ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, target.current.y, 0.08);
      ref.current.rotation.z = THREE.MathUtils.lerp(ref.current.rotation.z, target.current.z, 0.08);
      const t = state.clock.getElapsedTime();
      ref.current.position.y = p.baseY + Math.sin(t * 1.5 + dieIndex) * 0.03;
    }
  });

  const S = 0.52;
  return (
    <group ref={ref} position={[xOffset, 0.65, 0]}>
      <RoundedBox args={[1, 1, 1]} radius={0.16} smoothness={4} castShadow>
        <meshPhysicalMaterial color="#faf8f2" roughness={0.12} metalness={0.08} clearcoat={0.8} clearcoatRoughness={0.05} />
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

function DiceSceneContent({ diceValues, rolling, dragState }) {
  const safeD = useMemo(() => [
    Math.min(6, Math.max(1, diceValues[0] || 1)),
    Math.min(6, Math.max(1, diceValues[1] || 1)),
  ], [diceValues]);

  return (
    <>
      <color attach="background" args={['#080c10']} />

      <ambientLight intensity={0.3} color="#ffeedd" />
      <directionalLight position={[3, 6, 4]} intensity={2.0} color="#ffe8cc" castShadow />
      <pointLight position={[-2, 3, 2]} intensity={1.2} color="#44ccff" distance={10} />
      <pointLight position={[2, 2, -1]} intensity={0.8} color="#d4af37" distance={8} />
      <spotLight position={[0, 5, 0]} angle={0.8} penumbra={0.9} intensity={1.5} color="#ffffff" />

      {/* Table surface */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 6]} />
        <meshPhysicalMaterial color="#0c1018" roughness={0.4} metalness={0.3} clearcoat={0.5} clearcoatRoughness={0.2} />
      </mesh>

      {/* Felt border glow */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.5, 3.5, 32]} />
        <meshBasicMaterial color="#d4af37" transparent opacity={0.06} />
      </mesh>

      <DraggableDie value={safeD[0]} rolling={rolling} xOffset={-1.2} dragState={dragState} dieIndex={0} />
      <DraggableDie value={safeD[1]} rolling={rolling} xOffset={1.2} dragState={dragState} dieIndex={1} />

      <EffectComposer>
        <Bloom intensity={0.5} luminanceThreshold={0.5} luminanceSmoothing={0.9} />
        <Vignette offset={0.3} darkness={0.6} />
      </EffectComposer>
    </>
  );
}

export default function DiceZone({ diceValues = [0, 0], rolling = false, onRollDice, phase = 'roll', rollLabel = 'Lanzar Dados' }) {
  const dragState = useRef({
    active: false, dieIndex: -1,
    startX: 0, startY: 0, startTime: 0,
    currentX: 0, currentY: 0,
    velocityY: 0,
    samples: [],
  });

  const diceTotal = (diceValues[0] || 0) + (diceValues[1] || 0);

  const handlePointerDown = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const mid = rect.width / 2;
    const dieIdx = localX < mid ? 0 : 1;
    dragState.current = {
      active: true, dieIndex: dieIdx,
      startX: e.clientX, startY: e.clientY, startTime: Date.now(),
      currentX: e.clientX, currentY: e.clientY,
      velocityY: 0,
      samples: [{ y: e.clientY, t: Date.now() }],
    };
  }, []);

  const handlePointerMove = useCallback((e) => {
    const d = dragState.current;
    if (!d.active) return;
    d.currentX = e.clientX;
    d.currentY = e.clientY;
    d.samples.push({ y: e.clientY, t: Date.now() });
    if (d.samples.length > 6) d.samples.shift();
  }, []);

  const handlePointerUp = useCallback((e) => {
    const d = dragState.current;
    if (!d.active) return;
    d.active = false;
    d.dieIndex = -1;

    const samples = d.samples;
    if (samples.length >= 2) {
      const last = samples[samples.length - 1];
      const first = samples[0];
      const dt = (last.t - first.t) / 1000;
      if (dt > 0) {
        const vy = -(last.y - first.y) / dt;
        if (vy > 300 && onRollDice && phase === 'roll') {
          onRollDice();
        }
      }
    }
  }, [onRollDice, phase]);

  return (
    <div className="relative w-full touch-none select-none" style={{ height: '130px' }}>
      {/* Gold separator line */}
      <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, #d4af37, transparent)' }} />

      <div
        className="w-full h-full"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { dragState.current.active = false; dragState.current.dieIndex = -1; }}
      >
        <Canvas
          camera={{ position: [0, 4, 4.5], fov: 38 }}
          shadows
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
          dpr={[1, 2]}
          style={{ width: '100%', height: '100%' }}
        >
          <DiceSceneContent diceValues={diceValues} rolling={rolling} dragState={dragState} />
        </Canvas>
      </div>

      {/* Roll button / dice total overlay */}
      {phase === 'roll' && onRollDice && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3">
          <button
            data-testid="roll-dice-btn"
            onClick={onRollDice}
            className="btn-gold roll-cta px-5 py-2 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5"
            style={{
              background: 'linear-gradient(135deg, #c4982d, #f7d77a, #c4982d)',
              color: '#1a1510',
              boxShadow: '0 0 20px rgba(212,175,55,0.4), 0 2px 8px rgba(0,0,0,0.5)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="2" width="20" height="20" rx="4" fill="currentColor" opacity="0.3"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>
            {rollLabel}
          </button>
          <span className="text-[9px] text-[#d4af37]/60 font-medium uppercase tracking-wider">o desliza</span>
        </div>
      )}

      {!rolling && diceTotal > 0 && (
        <div className="absolute top-2 right-3 z-20 px-2.5 py-0.5 rounded-lg text-xs font-bold text-white bg-black/60 border border-[rgba(212,175,55,0.3)] backdrop-blur-sm tabular-nums">
          {diceValues[0]}+{diceValues[1]}={diceTotal}
        </div>
      )}
    </div>
  );
}
