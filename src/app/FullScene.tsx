"use client";
import React, { Suspense, useRef, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { PointerLockControls, Grid, GizmoHelper, GizmoViewport, PerspectiveCamera, Environment, useGLTF } from "@react-three/drei";
import { Group, AxesHelper, AnimationMixer } from "three";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function ArmTestingPosModel(props: any) {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF('/hoho.glb');
  const mixer = React.useRef<AnimationMixer | null>(null);
  const action = React.useRef<any>(null);

  // Torna todos os materiais wireframe e transparentes
  React.useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh && child.material) {
        child.material.wireframe = true;
        child.material.transparent = true;
        child.material.opacity = 0.5;
        child.material.depthTest = false;
        child.renderOrder = 999;
      }
    });
  }, [scene]);

  // Loga as animações do modelo
  React.useEffect(() => {
    if (animations && animations.length > 0) {
      console.log('GLB Animations:', animations);
    } else {
      console.log('GLB não possui animações.');
    }
  }, [animations]);

  // Setup AnimationMixer e evento de clique
  React.useEffect(() => {
    if (!group.current || !animations || animations.length === 0) return;
    mixer.current = new AnimationMixer(group.current);
    // Procura a animação chamada 'press'
    const clip = animations.find((a: any) => a.name === 'press');
    let onFinish: ((event: any) => void) | undefined;
    if (clip) {
      action.current = mixer.current.clipAction(clip);
      action.current.setLoop(THREE.LoopOnce, 1);
      action.current.clampWhenFinished = true;
      action.current.paused = false;
      action.current.enabled = true;
      action.current.stop();
      action.current.reset();
      (action.current as any)._hasPlayed = false;
      // Listener para liberar novo clique
      onFinish = (event: any) => {
        if (event.action === action.current) {
          (action.current as any)._hasPlayed = false;
        }
      };
      mixer.current.removeEventListener('finished', onFinish);
      mixer.current.addEventListener('finished', onFinish);
    }
    // Handler para clique esquerdo
    const handleClick = (e: MouseEvent) => {
      if (e.button === 0 && action.current) {
        if (!(action.current as any)._hasPlayed) {
          action.current.reset().play();
          (action.current as any)._hasPlayed = true;
        }
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      if (mixer.current) mixer.current.stopAllAction();
      if (mixer.current && onFinish) mixer.current.removeEventListener('finished', onFinish);
    };
  }, [animations]);

  // Atualiza o mixer a cada frame
  useFrame((_, delta) => {
    if (mixer.current) mixer.current.update(delta);
  });

  return <primitive ref={group} object={scene} {...props} />;
}

function FloorModel(props: any) {
  const group = useRef<Group>(null);
  const { scene } = useGLTF('/floor.glb');
  return <primitive ref={group} object={scene} {...props} />;
}

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
    <group ref={ref} position={[-0.1, -0.5, 0.3]} scale={[1, 1, 1]} rotation={[0, Math.PI, 0]} {...props}>
      <ArmTestingPosModel />
    </group>
  );
}

function ButtonCube() {
  return (
    <mesh
      position={[1, 1, 0]}
      onClick={() => console.log('Botão (cubo) clicado!')}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="orange" />
    </mesh>
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
        <fog attach="fog" color="#222" near={1} far={10} />
        <Suspense fallback={null}>
          <PerspectiveCamera 
            makeDefault 
            position={[0, 1.2, 0]} 
            fov={50} 
          />
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 10, 7]} intensity={1} castShadow />
          <ArmAttachedToCamera />
          <FloorModel position={[0, 0, 0]} />
          <ButtonCube />
          <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
            <GizmoViewport axisColors={["red", "green", "blue"]} labelColor="white" />
          </GizmoHelper>
          <Environment preset="studio" background={false} />
        </Suspense>
        <PointerLockControls />
      </Canvas>
    </div>
  );
} 