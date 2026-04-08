import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useMemo } from 'react';
import * as THREE from 'three';

function AnimatedCube({ status }) {
  const meshRef = useRef();
  const edgesRef = useRef();
  const glowRef = useRef();
  const shakeStartTime = useRef(0);
  const spinStartTime = useRef(0);

  const colors = useMemo(() => ({
    idle: new THREE.Color('#666666'),
    scanning: new THREE.Color('#FFE66D'),
    success: new THREE.Color('#00FF88'),
    already_taken: new THREE.Color('#FF0044'),
    not_found: new THREE.Color('#FF6B00')
  }), []);

  const targetColor = useMemo(() => {
    return colors[status] || colors.idle;
  }, [status, colors]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;
    const time = state.clock.elapsedTime;

    // Smoothly interpolate color
    mesh.material.color.lerp(targetColor, delta * 6);
    mesh.material.emissive.lerp(
      status === 'success' || status === 'already_taken'
        ? targetColor.clone().multiplyScalar(0.3)
        : new THREE.Color('#000000'),
      delta * 4
    );

    if (edgesRef.current) {
      edgesRef.current.material.color.lerp(targetColor, delta * 6);
    }

    if (status === 'success') {
      // Fast spin on success
      mesh.rotation.y += delta * 12;
      mesh.rotation.x += delta * 6;
      mesh.rotation.z += delta * 3;
      // Slight scale pulse
      const pulse = 1 + Math.sin(time * 10) * 0.08;
      mesh.scale.setScalar(pulse);
      mesh.position.x = 0;
      mesh.position.y = Math.sin(time * 3) * 0.05;
    } else if (status === 'already_taken') {
      // Violent shake
      mesh.position.x = Math.sin(time * 60) * 0.15;
      mesh.position.y = Math.cos(time * 50) * 0.08;
      mesh.rotation.z = Math.sin(time * 45) * 0.15;
      mesh.rotation.x += delta * 2;
      mesh.rotation.y += delta * 1;
      // Scale jitter
      const jitter = 1 + Math.sin(time * 40) * 0.05;
      mesh.scale.setScalar(jitter);
    } else if (status === 'not_found') {
      // Wobble
      mesh.rotation.z = Math.sin(time * 8) * 0.2;
      mesh.rotation.y += delta * 1;
      mesh.position.x = Math.sin(time * 5) * 0.05;
      mesh.position.y = 0;
      mesh.scale.setScalar(1);
    } else if (status === 'scanning') {
      // Pulsing glow
      mesh.rotation.y += delta * 3;
      const pulse = 1 + Math.sin(time * 6) * 0.1;
      mesh.scale.setScalar(pulse);
      mesh.position.x = 0;
      mesh.position.y = 0;
    } else {
      // Idle: gentle float and rotate
      mesh.rotation.y += delta * 0.5;
      mesh.rotation.x += delta * 0.2;
      mesh.position.x *= 0.95;
      mesh.position.y = Math.sin(time * 1.5) * 0.08;
      mesh.rotation.z *= 0.95;
      // Ease scale back to 1
      mesh.scale.x += (1 - mesh.scale.x) * delta * 3;
      mesh.scale.y += (1 - mesh.scale.y) * delta * 3;
      mesh.scale.z += (1 - mesh.scale.z) * delta * 3;
    }
  });

  const edgesGeometry = useMemo(() => {
    const boxGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    return new THREE.EdgesGeometry(boxGeo);
  }, []);

  return (
    <group>
      <mesh ref={meshRef}>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial
          color="#666666"
          emissive="#000000"
          emissiveIntensity={0.5}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      <lineSegments ref={edgesRef} geometry={edgesGeometry}>
        <lineBasicMaterial color="#000000" linewidth={2} />
      </lineSegments>
    </group>
  );
}

export default function StatusCube({ status }) {
  return (
    <div className="status-cube-container">
      <Canvas
        camera={{ position: [0, 0, 4], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[5, 5, 5]} intensity={1.2} />
        <pointLight position={[-5, -5, 5]} intensity={0.4} color="#FFE66D" />
        <AnimatedCube status={status} />
      </Canvas>
      <div className="cube-label">
        {status === 'idle' && 'READY'}
        {status === 'scanning' && 'SCANNING...'}
        {status === 'success' && '✓ VERIFIED'}
        {status === 'already_taken' && '✗ DUPLICATE'}
        {status === 'not_found' && '? UNKNOWN'}
      </div>
    </div>
  );
}
