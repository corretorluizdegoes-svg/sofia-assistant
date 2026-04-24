import { Suspense, useRef, useState } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { TextureLoader } from "three";
import * as THREE from "three";
import sofiaAvatarUrl from "@/assets/sofia-avatar.png";

type AvatarMeshProps = {
  hovered: boolean;
  pointer: { x: number; y: number };
};

function AvatarMesh({ hovered, pointer }: AvatarMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useLoader(TextureLoader, sofiaAvatarUrl);
  texture.anisotropy = 8;

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    // Floating motion
    meshRef.current.position.y = Math.sin(t * 1.2) * 0.05;
    // Smooth follow pointer
    const targetRotY = pointer.x * 0.6;
    const targetRotX = -pointer.y * 0.5;
    meshRef.current.rotation.y += (targetRotY - meshRef.current.rotation.y) * 0.08;
    meshRef.current.rotation.x += (targetRotX - meshRef.current.rotation.x) * 0.08;
    // Subtle scale on hover
    const targetScale = hovered ? 1.08 : 1;
    meshRef.current.scale.x += (targetScale - meshRef.current.scale.x) * 0.1;
    meshRef.current.scale.y += (targetScale - meshRef.current.scale.y) * 0.1;
    meshRef.current.scale.z += (targetScale - meshRef.current.scale.z) * 0.1;
  });

  return (
    <mesh ref={meshRef}>
      <circleGeometry args={[1.1, 64]} />
      <meshStandardMaterial
        map={texture}
        transparent
        roughness={0.35}
        metalness={0.15}
        emissive={new THREE.Color("#5B8DEF")}
        emissiveIntensity={hovered ? 0.25 : 0.08}
      />
    </mesh>
  );
}

type Props = {
  size?: number;
  className?: string;
};

export function SofiaAvatar3D({ size = 240, className = "" }: Props) {
  const [hovered, setHovered] = useState(false);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative cursor-grab active:cursor-grabbing ${className}`}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => {
        setHovered(false);
        setPointer({ x: 0, y: 0 });
      }}
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
        setPointer({ x, y });
      }}
      aria-label="S.O.F.I.A. 3D interactive avatar"
    >
      <Canvas
        camera={{ position: [0, 0, 3], fov: 35 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[2, 3, 4]} intensity={1.2} />
        <pointLight position={[-2, -1, 2]} intensity={0.6} color="#5B8DEF" />
        <Suspense fallback={null}>
          <AvatarMesh hovered={hovered} pointer={pointer} />
        </Suspense>
      </Canvas>
    </div>
  );
}