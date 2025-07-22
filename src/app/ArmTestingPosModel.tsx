import { useGLTF } from '@react-three/drei';
import { useRef } from 'react';
import { Group } from 'three';

export default function ArmTestingPosModel(props: any) {
  const group = useRef<Group>(null);
  // O modelo está em public/armTestingPos.glb
  const { scene } = useGLTF('/hoho.glb');
  return <primitive ref={group} object={scene} {...props} />;
}

// Necessário para o drei carregar o modelo corretamente
useGLTF.preload('/hoho.glb'); 