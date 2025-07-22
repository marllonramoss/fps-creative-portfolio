"use client";
import React, { Suspense, useRef, useEffect, useState, forwardRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { PointerLockControls, Grid, GizmoHelper, GizmoViewport, PerspectiveCamera, Environment, useGLTF } from "@react-three/drei";
import { Group, AxesHelper, AnimationMixer } from "three";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useSpring, a } from '@react-spring/three';

function ArmTestingPosModel(props: any) {
  const { hovered, clickTrigger } = props;
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF('/hoho.glb');
  const mixer = React.useRef<AnimationMixer | null>(null);
  const hoverInAction = React.useRef<any>(null);
  const hoverOutAction = React.useRef<any>(null);
  const pressAction = React.useRef<any>(null);

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

  // Setup AnimationMixer e hoverIn/hoverOut actions
  React.useEffect(() => {
    if (!group.current || !animations || animations.length === 0) return;
    mixer.current = new AnimationMixer(group.current);
    const hoverInClip = animations.find((a: any) => a.name === 'hoverIn');
    if (hoverInClip) {
      hoverInAction.current = mixer.current.clipAction(hoverInClip);
      hoverInAction.current.setLoop(THREE.LoopOnce, 1);
      hoverInAction.current.clampWhenFinished = true;
      hoverInAction.current.enabled = true;
      hoverInAction.current.stop();
      hoverInAction.current.reset();
    }
    const hoverOutClip = animations.find((a: any) => a.name === 'hoverOut' || a.name === 'hoverOut!');
    if (hoverOutClip) {
      hoverOutAction.current = mixer.current.clipAction(hoverOutClip);
      hoverOutAction.current.setLoop(THREE.LoopOnce, 1);
      hoverOutAction.current.clampWhenFinished = true;
      hoverOutAction.current.enabled = true;
      hoverOutAction.current.stop();
      hoverOutAction.current.reset();
    }
    const pressClip = animations.find((a: any) => a.name === 'press');
    if (pressClip) {
      pressAction.current = mixer.current.clipAction(pressClip);
      pressAction.current.setLoop(THREE.LoopOnce, 1);
      pressAction.current.clampWhenFinished = true;
      pressAction.current.enabled = true;
      pressAction.current.stop();
      pressAction.current.reset();
    }
    return () => {
      if (mixer.current) mixer.current.stopAllAction();
    };
  }, [animations]);

  // Executa hoverIn/hoverOut conforme hovered
  React.useEffect(() => {
    if (hovered && hoverInAction.current) {
      mixer.current?.stopAllAction();
      hoverInAction.current.reset().play();
    } else if (!hovered) {
      if (hoverOutAction.current) {
        mixer.current?.stopAllAction();
        hoverOutAction.current.reset().play();
      }
    }
  }, [hovered]);

  // Executa press quando clickTrigger mudar
  React.useEffect(() => {
    if (pressAction.current && clickTrigger > 0) {
      mixer.current?.stopAllAction();
      pressAction.current.reset().play();
    }
  }, [clickTrigger]);

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
  const { hovered, clickTrigger } = props;
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
      <ArmTestingPosModel hovered={hovered} clickTrigger={clickTrigger} />
    </group>
  );
}

// ButtonCube agora usa forwardRef para expor o mesh
const ButtonCube = forwardRef<THREE.Mesh, { hovered: boolean, onCubeClick: () => void }>(function ButtonCube({ hovered, onCubeClick }, ref) {
  const { scale } = useSpring({
    scale: hovered ? 1.2 : 1,
    config: { tension: 300, friction: 20 }
  });
  return (
    <a.mesh
      ref={ref}
      position={[1, 1, 0]}
      scale={scale}
      onClick={() => {
        onCubeClick();
        console.log('Botão (cubo) clicado!');
      }}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="orange" />
    </a.mesh>
  );
});

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

// Componente auxiliar para raycast FPS hover
function CubeRaycastHover({ cubeRef, setCubeHovered }: { cubeRef: React.RefObject<THREE.Mesh | null>, setCubeHovered: (v: boolean) => void }) {
  useFrame(({ camera }) => {
    const raycaster = new THREE.Raycaster();
    const center = new THREE.Vector2(0, 0);
    raycaster.setFromCamera(center, camera);
    const cube = cubeRef.current;
    let isHovering = false;
    if (cube) {
      const intersects = raycaster.intersectObject(cube, false);
      isHovering = intersects.length > 0;
    }
    setCubeHovered(isHovering);
  });
  return null;
}

export default function FullScene() {
  const [cubeHovered, setCubeHovered] = useState(false);
  const [armClickTrigger, setArmClickTrigger] = useState(0);
  const cubeRef = useRef<THREE.Mesh>(null);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#222" }}>
      <Canvas shadows>
        <fog attach="fog" color="#222" near={1} far={10} args={["#222", 1, 10]} />
        <Suspense fallback={null}>
          <PerspectiveCamera 
            makeDefault 
            position={[0, 1.2, 0]} 
            fov={50} 
          />
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 10, 7]} intensity={1} castShadow />
          <ArmAttachedToCamera hovered={cubeHovered} clickTrigger={armClickTrigger} />
          <FloorModel position={[0, 0, 0]} />
          <ButtonCube hovered={cubeHovered} ref={cubeRef} onCubeClick={() => setArmClickTrigger(t => t + 1)} />
          <CubeRaycastHover cubeRef={cubeRef} setCubeHovered={setCubeHovered} />
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