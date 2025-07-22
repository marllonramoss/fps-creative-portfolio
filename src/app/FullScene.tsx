"use client";
import React, { Suspense, useRef, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, Grid, GizmoHelper, GizmoViewport, PerspectiveCamera, Environment, useGLTF } from "@react-three/drei";
import { Group, AxesHelper } from "three";

function ArmTestingPosModel(props: any) {
  const group = useRef<Group>(null);
  const { scene } = useGLTF('/armTestingPos.glb');
  return <primitive ref={group} object={scene} {...props} />;
}
// Preload para performance
if (typeof window !== 'undefined') useGLTF.preload && useGLTF.preload('/armTestingPos.glb');

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
          <ArmTestingPosModel position={[-0.1, 0, 0]} />
          <Grid infiniteGrid cellColor="#444" sectionColor="#888" fadeDistance={40} />
          <AxesHelperPrimitive size={2} />
          <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
            <GizmoViewport axisColors={["red", "green", "blue"]} labelColor="white" />
          </GizmoHelper>
          <Environment preset="city" background={false} />
        </Suspense>
        <OrbitControls makeDefault target={[0, 0.7, 0]} />
      </Canvas>
    </div>
  );
} 