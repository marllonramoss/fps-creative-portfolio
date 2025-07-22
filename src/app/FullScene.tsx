"use client";
import React, { Suspense, useRef, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { PointerLockControls, Grid, GizmoHelper, GizmoViewport, PerspectiveCamera, Environment, useGLTF } from "@react-three/drei";
import { Group, AxesHelper } from "three";
import { useFrame } from "@react-three/fiber";

function ArmTestingPosModel(props: any) {
  const group = useRef<Group>(null);
  const { scene } = useGLTF('/armTestingPos.glb');
  return <primitive ref={group} object={scene} {...props} />;
}
// Preload para performance
if (typeof window !== 'undefined') useGLTF.preload && useGLTF.preload('/armTestingPos.glb');

function ArmAttachedToCamera(props: any) {
  const { camera, scene } = useThree();
  const ref = useRef<Group>(null);

  useEffect(() => {
    if (ref.current && camera && !camera.children.includes(ref.current)) {
      camera.add(ref.current);
      scene.remove(ref.current);
    }
    return () => {
      if (ref.current && camera.children.includes(ref.current)) {
        camera.remove(ref.current);
      }
    };
  }, [camera, scene]);

  // Ajuste a posição para onde o braço deve aparecer na tela
  return (
    <group ref={ref} position={[0, -2, -1]} scale={[3, 3, 3]} rotation={[0.2, Math.PI, 0]} {...props}>
      <ArmTestingPosModel />
    </group>
  );
}

function AxesHelperPrimitive({ size = 2 }) {
  const ref = useRef<any>();
  const { scene } = useThree();
  useEffect(() => {
    if (ref.current) return;
    const axes = new AxesHelper(size);
    scene.add(axes);
    ref.current = axes;
    return () => {
      scene.remove(axes);
    };
  }, [scene, size]);
  return null;
}

export default function FullScene() {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#222" }}>
      <Canvas shadows>
        <Suspense fallback={null}>
          <PerspectiveCamera 
            makeDefault 
            position={[0, 0.77688, -0.589039]} 
            fov={50} 
          />
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 10, 7]} intensity={1} castShadow />
          <ArmAttachedToCamera />
          <Grid infiniteGrid cellColor="#444" sectionColor="#888" fadeDistance={40} />
          <AxesHelperPrimitive size={2} />
          <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
            <GizmoViewport axisColors={["red", "green", "blue"]} labelColor="white" />
          </GizmoHelper>
          <Environment preset="city" background={false} />
        </Suspense>
        <PointerLockControls />
      </Canvas>
    </div>
  );
} 