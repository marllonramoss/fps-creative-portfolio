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
  const idleAction = React.useRef<any>(null);

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
    const idleClip = animations.find((a: any) => a.name === 'idle');
    if (idleClip) {
      idleAction.current = mixer.current.clipAction(idleClip);
      idleAction.current.setLoop(THREE.LoopRepeat, Infinity);
      idleAction.current.clampWhenFinished = false;
      idleAction.current.enabled = true;
      idleAction.current.play();
    }
    return () => {
      if (mixer.current) mixer.current.stopAllAction();
    };
  }, [animations]);

  // Listener para voltar para idle ao terminar hoverOut ou press
  React.useEffect(() => {
    if (!mixer.current) return;
    const onFinish = (event: any) => {
      if (
        (hoverOutAction.current && event.action === hoverOutAction.current) ||
        (pressAction.current && event.action === pressAction.current)
      ) {
        idleAction.current?.reset().play();
      }
    };
    mixer.current.addEventListener('finished', onFinish);
    return () => {
      mixer.current?.removeEventListener('finished', onFinish);
    };
  }, [animations]);

  // Loga os nomes das animações do modelo ao carregar
  React.useEffect(() => {
    if (animations && animations.length > 0) {
      console.log('GLB Animations:', animations.map(a => a.name));
    }
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

  // Parâmetros de suavização
  const lerpAlpha = 0.1;
  const swayAmount = 0.25; // ajuste para mais/menos sway

  // Guarda a rotação inicial da câmera
  const initialRotation = useRef(new THREE.Euler().copy(camera.rotation));

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

  useFrame(() => {
    if (ref.current) {
      // Sway baseado na diferença da rotação atual para a inicial
      const yawDiff = camera.rotation.y - initialRotation.current.y;
      const pitchDiff = camera.rotation.x - initialRotation.current.x;

      // Limite o sway para evitar jumps extremos
      const swayX = THREE.MathUtils.clamp(-yawDiff * swayAmount, -0.3, 0.3);
      const swayY = THREE.MathUtils.clamp(-pitchDiff * swayAmount, -0.2, 0.2);

      // Posição alvo com sway
      const targetPosition = new THREE.Vector3(-0.1 + swayX, -0.5 + swayY, 0.3);
      ref.current.position.lerp(targetPosition, lerpAlpha);

      // Mantenha a rotação fixa
      ref.current.rotation.set(0, Math.PI, 0);
    }
  });

  return (
    <group ref={ref}>
      <ArmTestingPosModel hovered={hovered} clickTrigger={clickTrigger} />
    </group>
  );
}

// Fragmentos de explosão
function CubeFragments({ origin, count = 24, explosionForce = 2, onFinish }: { origin: [number, number, number], count?: number, explosionForce?: number, onFinish?: () => void }) {
  // Cada fragmento é um objeto com refs para animar sem setState
  const fragmentRefs = useRef<{
    mesh: THREE.Mesh | null,
    velocity: THREE.Vector3,
    rotationSpeed: THREE.Vector3,
    life: number,
    scale: number,
    maxLife: number,
  }[]>([]);
  const [done, setDone] = useState(false);
  // Inicializa fragmentos apenas uma vez
  if (fragmentRefs.current.length === 0) {
    fragmentRefs.current = Array.from({ length: count }, () => {
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize();
      const speed = explosionForce * (0.5 + Math.random() * 0.5);
      return {
        mesh: null,
        velocity: dir.multiplyScalar(speed),
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 4
        ),
        life: 0,
        scale: 0.11 + Math.random() * 0.07,
        maxLife: 1.2,
      };
    });
  }

  useFrame((_, delta) => {
    let allDead = true;
    fragmentRefs.current.forEach(frag => {
      if (!frag.mesh) return;
      if (frag.life >= frag.maxLife) return;
      // Gravidade
      const gravity = new THREE.Vector3(0, -4.5 * delta, 0);
      const damping = 0.98;
      frag.velocity.add(gravity).multiplyScalar(damping);
      frag.mesh.position.add(frag.velocity.clone().multiplyScalar(delta));
      frag.mesh.rotation.x += frag.rotationSpeed.x * delta;
      frag.mesh.rotation.y += frag.rotationSpeed.y * delta;
      frag.mesh.rotation.z += frag.rotationSpeed.z * delta;
      frag.life += delta;
      const fade = Math.max(0, 1 - frag.life / frag.maxLife);
      frag.mesh.scale.setScalar(frag.scale * fade);
      if (frag.mesh.material && 'opacity' in frag.mesh.material) {
        (frag.mesh.material as THREE.MeshStandardMaterial).opacity = fade;
      }
      if (frag.life < frag.maxLife) allDead = false;
    });
    if (allDead && !done) {
      setDone(true);
      if (onFinish) onFinish();
    }
  });

  if (done) return null;
  return (
    <>
      {fragmentRefs.current.map((frag, i) => (
        <mesh
          key={i}
          ref={el => frag.mesh = el}
          position={new THREE.Vector3(...origin)}
          scale={[frag.scale, frag.scale, frag.scale]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="orange" transparent opacity={1} />
        </mesh>
      ))}
    </>
  );
}

// ButtonCube agora usa forwardRef para expor o mesh
const ButtonCube = forwardRef<THREE.Mesh, { hovered: boolean, onCubeClick: () => void, visible?: boolean }>(function ButtonCube({ hovered, onCubeClick, visible = true }, ref) {
  const { scale } = useSpring({
    scale: hovered ? 0.72 : 0.6, // escala inicial menor, hover aumenta proporcionalmente
    config: { tension: 300, friction: 20 }
  });
  if (!visible) return null;
  return (
    <a.mesh
      ref={ref}
      position={[1, 1.1, 0]}
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

// Componente para cubos inimigos vindo em direção ao jogador
function EnemyCubes({ onEnemyDestroyed, destroyedCount, survivalTime, gameActive, onGameOver }: { onEnemyDestroyed: () => void, destroyedCount: number, survivalTime: number, gameActive: boolean, onGameOver: () => void }) {
  const { camera } = useThree();
  const [enemies, setEnemies] = useState(() => [] as Array<{
    id: number,
    position: THREE.Vector3,
    destroyed: boolean,
  }>);
  const nextId = useRef(1);
  const meshRefs = useRef<{ [id: number]: THREE.Mesh | null }>({});
  const lostRef = useRef(false);

  // Limpa todos os inimigos ao reiniciar o jogo
  useEffect(() => {
    if (gameActive && survivalTime === 0) {
      setEnemies([]);
      nextId.current = 1;
      lostRef.current = false;
    }
  }, [gameActive, survivalTime]);

  // Gera novos inimigos periodicamente, frequência aumenta com o tempo
  useEffect(() => {
    if (!gameActive) return;
    let running = true;
    function spawnLoop() {
      if (!running || lostRef.current) return;
      const minInterval = 350;
      const maxInterval = 1200;
      const t = Math.min(survivalTime / 30, 1);
      const interval = maxInterval - (maxInterval - minInterval) * t;
      const cubesPerSpawn = 1 + Math.floor(survivalTime / 15);
      for (let i = 0; i < cubesPerSpawn; i++) {
        const x = (Math.random() - 0.5) * 4;
        const y = 0.7 + Math.random() * 1.5;
        const z = -6 - Math.random() * 4;
        setEnemies(enemies => [
          ...enemies,
          {
            id: nextId.current++,
            position: new THREE.Vector3(x, y, z),
            destroyed: false,
          },
        ]);
      }
      setTimeout(spawnLoop, interval);
    }
    spawnLoop();
    return () => { running = false; };
  }, [gameActive, survivalTime]);

  useFrame((_, delta) => {
    if (!gameActive || lostRef.current) return;
    const camPos = camera.position.clone();
    const speed = 1.2 + destroyedCount * 0.08 + survivalTime * 0.07;
    // Checa colisão diretamente
    for (const enemy of enemies) {
      if (!enemy.destroyed && enemy.position.distanceTo(camPos) < 0.7) {
        if (!lostRef.current) {
          lostRef.current = true;
          onGameOver();
        }
        return;
      }
    }
    setEnemies(enemies => enemies.map(enemy => {
      if (enemy.destroyed) return enemy;
      const dir = camPos.clone().sub(enemy.position).normalize();
      const newPos = enemy.position.clone().add(dir.multiplyScalar(speed * delta));
      return { ...enemy, position: newPos };
    }));
    Object.entries(meshRefs.current).forEach(([id, mesh]) => {
      if (mesh) {
        mesh.lookAt(camPos);
      }
    });
  });

  useEffect(() => {
    if (!gameActive) return;
    const timeout = setInterval(() => {
      setEnemies(enemies => enemies.filter(e => !e.destroyed));
    }, 1500);
    return () => clearInterval(timeout);
  }, [gameActive]);

  function handleEnemyClick(id: number, pos: THREE.Vector3) {
    setEnemies(enemies => enemies.map(e => e.id === id ? { ...e, destroyed: true } : e));
    onEnemyDestroyed();
  }

  return (
    <>
      {gameActive && enemies.map(enemy => !enemy.destroyed && (
        <mesh
          key={enemy.id}
          ref={el => meshRefs.current[enemy.id] = el}
          position={enemy.position}
          scale={[0.35, 0.35, 0.35]}
          onClick={() => handleEnemyClick(enemy.id, enemy.position)}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#e74c3c" />
        </mesh>
      ))}
    </>
  );
}

export default function FullScene() {
  const [cubeHovered, setCubeHovered] = useState(false);
  const [armClickTrigger, setArmClickTrigger] = useState(0);
  const [cubeDestroyed, setCubeDestroyed] = useState(false);
  const [showFragments, setShowFragments] = useState(false);
  const cubeRef = useRef<THREE.Mesh>(null);
  const [destroyedCount, setDestroyedCount] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [showMenu, setShowMenu] = useState(true);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showResumeOverlay, setShowResumeOverlay] = useState(false);
  const [sensitivity, setSensitivity] = useState(1.0);
  const [gameActive, setGameActive] = useState(false);
  const [survivalTime, setSurvivalTime] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [scoreSaved, setScoreSaved] = useState(false);
  const [scoreboard, setScoreboard] = useState<Array<{ name: string, time: number, cubes: number, date: string }>>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Carrega scoreboard do localStorage ao iniciar
  useEffect(() => {
    const scores = localStorage.getItem("fps_scoreboard");
    if (scores) {
      setScoreboard(JSON.parse(scores));
    }
  }, []);

  // Salva novo score
  function saveScore() {
    const name = playerName.trim() ? playerName.trim() : "Anônimo";
    const newScore = {
      name,
      time: survivalTime,
      cubes: destroyedCount,
      date: new Date().toLocaleString(),
    };
    const updated = [...scoreboard, newScore]
      .sort((a, b) => b.time - a.time || b.cubes - a.cubes)
      .slice(0, 10);
    setScoreboard(updated);
    localStorage.setItem("fps_scoreboard", JSON.stringify(updated));
    setScoreSaved(true);
  }

  // Inicia o jogo
  function startGame() {
    setDestroyedCount(0);
    setSurvivalTime(0);
    setGameStarted(true);
    setShowMenu(false);
    setShowScoreboard(false);
    setGameActive(true);
    setGameOver(false);
    setPlayerName("");
    setScoreSaved(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSurvivalTime(t => t + 1);
    }, 1000);
  }
  // Para o timer ao desmontar
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Para o timer ao perder
  useEffect(() => {
    if (gameOver && timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (gameOver) setGameActive(false);
  }, [gameOver]);

  function handleGameOver() {
    setGameOver(true);
    // Libera o pointer lock ao perder
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  // Pausar com ESC
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && gameActive && !gameOver) {
        setShowMenu(true);
        setGameActive(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameActive, gameOver]);

  // Retomar jogo ao fechar menu (se estava pausado)
  function handleResume() {
    setShowMenu(false);
    setShowResumeOverlay(true);
  }
  function handleResumeClick() {
    setShowResumeOverlay(false);
    setGameActive(true);
  }

  // Posição do cubo para explosão
  const cubePosition: [number, number, number] = [1, 1.1, 0];

  // Pega a posição da câmera para os inimigos
  const cameraPos: [number, number, number] = [0, 1.2, 0];

  // Carrega sensibilidade do localStorage ao iniciar
  useEffect(() => {
    const sens = localStorage.getItem('fps_sensitivity');
    if (sens) setSensitivity(Number(sens));
  }, []);

  function handleSensitivityChange(val: number) {
    setSensitivity(val);
    localStorage.setItem('fps_sensitivity', String(val));
  }

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#222" }}>
      {/* Overlay de fundo borrado quando menu, scoreboard ou options estiverem abertos */}
      {(showMenu || showScoreboard || showOptions) && !gameStarted && (
        <div style={{
          position: 'fixed',
          left: 0,
          top: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 20,
          background: 'rgba(20,20,20,0.55)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          pointerEvents: 'none',
        }} />
      )}
      {/* Menu inicial */}
      {showMenu && !gameStarted && !showScoreboard && !showOptions && (
        <div style={{
          position: 'fixed',
          left: 32,
          bottom: 32,
          zIndex: 30,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 16,
          background: 'rgba(24,24,24,0.97)',
          borderRadius: 18,
          padding: '32px 32px 28px 32px',
          boxShadow: '0 4px 32px #0007',
          minWidth: 220,
        }}>
          <button
            style={{
              fontSize: 26,
              padding: '16px 38px',
              borderRadius: 10,
              border: 'none',
              background: '#222',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: 2,
              width: '100%',
              transition: 'background 0.2s',
            }}
            onMouseOver={e => (e.currentTarget.style.background = '#444')}
            onMouseOut={e => (e.currentTarget.style.background = '#222')}
            onClick={startGame}
          >
            Jogar
          </button>
          <button
            style={{
              fontSize: 22,
              padding: '12px 32px',
              borderRadius: 10,
              border: 'none',
              background: '#222',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: 2,
              width: '100%',
              transition: 'background 0.2s',
            }}
            onMouseOver={e => (e.currentTarget.style.background = '#444')}
            onMouseOut={e => (e.currentTarget.style.background = '#222')}
            onClick={() => { setShowScoreboard(true); setShowMenu(false); }}
          >
            Scoreboard
          </button>
          <button
            style={{
              fontSize: 22,
              padding: '12px 32px',
              borderRadius: 10,
              border: 'none',
              background: '#222',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
              transition: 'background 0.2s',
            }}
            onMouseOver={e => (e.currentTarget.style.background = '#444')}
            onMouseOut={e => (e.currentTarget.style.background = '#222')}
            onClick={() => { setShowOptions(true); setShowMenu(false); }}
          >
            Options
          </button>
        </div>
      )}
      {/* Menu de pause (quando jogo já começou) */}
      {showMenu && gameStarted && !showScoreboard && !showOptions && !gameOver && (
        <div style={{
          position: 'fixed',
          left: 32,
          bottom: 32,
          zIndex: 30,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 16,
          background: 'rgba(24,24,24,0.97)',
          borderRadius: 18,
          padding: '32px 32px 28px 32px',
          boxShadow: '0 4px 32px #0007',
          minWidth: 220,
        }}>
          <button
            style={{
              fontSize: 26,
              padding: '16px 38px',
              borderRadius: 10,
              border: 'none',
              background: '#222',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: 2,
              width: '100%',
              transition: 'background 0.2s',
            }}
            onMouseOver={e => (e.currentTarget.style.background = '#444')}
            onMouseOut={e => (e.currentTarget.style.background = '#222')}
            onClick={handleResume}
          >
            Continuar
          </button>
          <button
            style={{
              fontSize: 22,
              padding: '12px 32px',
              borderRadius: 10,
              border: 'none',
              background: '#222',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: 2,
              width: '100%',
              transition: 'background 0.2s',
            }}
            onMouseOver={e => (e.currentTarget.style.background = '#444')}
            onMouseOut={e => (e.currentTarget.style.background = '#222')}
            onClick={() => { setShowScoreboard(true); setShowMenu(false); }}
          >
            Scoreboard
          </button>
          <button
            style={{
              fontSize: 22,
              padding: '12px 32px',
              borderRadius: 10,
              border: 'none',
              background: '#222',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
              transition: 'background 0.2s',
            }}
            onMouseOver={e => (e.currentTarget.style.background = '#444')}
            onMouseOut={e => (e.currentTarget.style.background = '#222')}
            onClick={() => { setShowOptions(true); setShowMenu(false); }}
          >
            Options
          </button>
        </div>
      )}
      {/* Overlay de clique para continuar */}
      {showResumeOverlay && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 50,
            background: 'rgba(20,20,20,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            userSelect: 'none',
          }}
          onClick={handleResumeClick}
        >
          <div style={{
            color: '#fff',
            fontSize: 32,
            fontWeight: 700,
            background: 'rgba(30,30,30,0.92)',
            borderRadius: 16,
            padding: '32px 60px',
            boxShadow: '0 2px 32px #000a',
            textAlign: 'center',
            textShadow: '0 1px 8px #000',
          }}>
            Clique para continuar
          </div>
        </div>
      )}
      {/* Scoreboard na tela de início */}
      {showScoreboard && !gameStarted && (
        <div style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 35,
          background: 'rgba(30,30,30,0.97)',
          borderRadius: 16,
          padding: '32px 44px',
          boxShadow: '0 2px 32px #000a',
          minWidth: 340,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <div style={{ color: '#fff', fontSize: 26, fontWeight: 700, marginBottom: 16, letterSpacing: 1 }}>
            🏆 Scoreboard
          </div>
          <table style={{ width: '100%', color: '#fff', fontSize: 17, borderCollapse: 'collapse', marginBottom: 18 }}>
            <thead>
              <tr style={{ color: '#f1c40f', fontWeight: 700 }}>
                <td style={{ padding: 4 }}>#</td>
                <td style={{ padding: 4 }}>Nome</td>
                <td style={{ padding: 4 }}>Tempo</td>
                <td style={{ padding: 4 }}>Cubos</td>
              </tr>
            </thead>
            <tbody>
              {scoreboard.map((s, i) => (
                <tr key={i} style={{ background: i === 0 ? 'rgba(241,196,15,0.13)' : 'none' }}>
                  <td style={{ padding: 4, textAlign: 'center' }}>{i + 1}</td>
                  <td style={{ padding: 4 }}>{s.name}</td>
                  <td style={{ padding: 4, textAlign: 'center' }}>{s.time}s</td>
                  <td style={{ padding: 4, textAlign: 'center' }}>{s.cubes}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            style={{
              fontSize: 20,
              padding: '8px 32px',
              borderRadius: 8,
              border: 'none',
              background: '#e67e22',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 12px #0004',
            }}
            onClick={() => { setShowMenu(true); setShowScoreboard(false); }}
          >
            Voltar
          </button>
        </div>
      )}
      {/* Menu de opções */}
      {showOptions && !gameStarted && (
        <div style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 35,
          background: 'rgba(30,30,30,0.97)',
          borderRadius: 16,
          padding: '32px 44px',
          boxShadow: '0 2px 32px #000a',
          minWidth: 340,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <div style={{ color: '#fff', fontSize: 26, fontWeight: 700, marginBottom: 24, letterSpacing: 1 }}>
            ⚙️ Opções
          </div>
          <div style={{ color: '#fff', fontSize: 18, marginBottom: 12 }}>Sensibilidade do mouse</div>
          <input
            type="range"
            min={0.2}
            max={2.0}
            step={0.01}
            value={sensitivity}
            onChange={e => handleSensitivityChange(Number(e.target.value))}
            style={{ width: 180, marginBottom: 8 }}
          />
          <div style={{ color: '#fff', fontSize: 16, marginBottom: 18 }}>{sensitivity.toFixed(2)}x</div>
          <button
            style={{
              fontSize: 20,
              padding: '8px 32px',
              borderRadius: 8,
              border: 'none',
              background: '#e67e22',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 12px #0004',
            }}
            onClick={() => { setShowMenu(true); setShowOptions(false); }}
          >
            Voltar
          </button>
        </div>
      )}
      {/* Mensagem de derrota + salvar score */}
      {gameOver && (
        <div style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 40,
          background: 'rgba(30,30,30,0.95)',
          borderRadius: 16,
          padding: '40px 60px',
          boxShadow: '0 2px 32px #000a',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minWidth: 320,
        }}>
          <div style={{ color: '#fff', fontSize: 32, fontWeight: 700, marginBottom: 18, textShadow: '0 1px 8px #000' }}>
            Você perdeu!
          </div>
          <div style={{ color: '#fff', fontSize: 20, marginBottom: 24 }}>
            Sobreviveu por {survivalTime} segundos<br />e destruiu {destroyedCount} cubos.
          </div>
          {!scoreSaved ? (
            <>
              <input
                type="text"
                placeholder="Seu nome"
                value={playerName}
                maxLength={16}
                onChange={e => setPlayerName(e.target.value)}
                style={{
                  fontSize: 20,
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #aaa',
                  marginBottom: 16,
                  outline: 'none',
                  width: 180,
                  textAlign: 'center',
                }}
                onKeyDown={e => { if (e.key === 'Enter') saveScore(); }}
                autoFocus
              />
              <button
                style={{
                  fontSize: 20,
                  padding: '8px 32px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#27ae60',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 12px #0004',
                  marginBottom: 12,
                }}
                onClick={saveScore}
              >
                Salvar score
              </button>
            </>
          ) : (
            <div style={{ color: '#2ecc71', fontSize: 18, marginBottom: 12 }}>Score salvo!</div>
          )}
          <div style={{ display: 'flex', gap: 16 }}>
            <button
              style={{
                fontSize: 22,
                padding: '12px 36px',
                borderRadius: 10,
                border: 'none',
                background: '#e74c3c',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 16px #0006',
              }}
              onClick={startGame}
            >
              REINICIAR
            </button>
            <button
              style={{
                fontSize: 22,
                padding: '12px 36px',
                borderRadius: 10,
                border: 'none',
                background: '#34495e',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 16px #0006',
              }}
              onClick={() => { setShowMenu(true); setGameStarted(false); setGameOver(false); }}
            >
              MENU
            </button>
          </div>
        </div>
      )}
      {/* Contador de cubos destruídos e tempo de sobrevivência */}
      {gameActive && (
        <div style={{
          position: 'fixed',
          top: 18,
          left: 22,
          color: '#fff',
          fontSize: 22,
          fontWeight: 600,
          textShadow: '0 1px 6px #000',
          zIndex: 20,
          userSelect: 'none',
          fontFamily: 'monospace',
        }}>
          Cubos destruídos: {destroyedCount}<br />
          Tempo: {survivalTime}s
        </div>
      )}
      {/* Crosshair central */}
      <div style={{
        position: 'fixed',
        left: '50%',
        top: '50%',
        width: 18,
        height: 18,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.7)',
          border: '1.5px solid rgba(255,255,255,0.8)',
          boxShadow: '0 0 4px 1px rgba(0,0,0,0.15)',
        }} />
      </div>
      <Canvas shadows>
        <fog attach="fog" color="#222" near={1} far={10} args={["#222", 1, 10]} />
        <Suspense fallback={null}>
          <PerspectiveCamera 
            makeDefault 
            position={cameraPos} 
            fov={50} 
          />
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 10, 7]} intensity={1} castShadow />
          <ArmAttachedToCamera hovered={cubeHovered && !cubeDestroyed} clickTrigger={armClickTrigger} />
          <FloorModel position={[0, 0, 0]} />
          {/* Cubo só aparece se não foi destruído */}
          <ButtonCube
            hovered={cubeHovered}
            ref={cubeRef}
            visible={!cubeDestroyed}
            onCubeClick={() => {
              setCubeDestroyed(true);
              setShowFragments(true);
              setArmClickTrigger(t => t + 1);
            }}
          />
          {/* Fragmentos aparecem após destruição */}
          {showFragments && (
            <CubeFragments
              origin={cubePosition}
              count={24} // ajuste o número de fragmentos aqui
              explosionForce={2.5} // ajuste a força da explosão aqui
              onFinish={() => setShowFragments(false)}
            />
          )}
          {/* Inimigos vindo em direção ao jogador */}
          <EnemyCubes
            onEnemyDestroyed={() => setDestroyedCount(c => c + 1)}
            destroyedCount={destroyedCount}
            survivalTime={survivalTime}
            gameActive={gameActive}
            onGameOver={handleGameOver}
          />
          <CubeRaycastHover cubeRef={cubeRef} setCubeHovered={v => setCubeHovered(v && !cubeDestroyed)} />
          <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
            <GizmoViewport axisColors={["red", "green", "blue"]} labelColor="white" />
          </GizmoHelper>
          <Environment preset="studio" background={false} />
        </Suspense>
        {/* O PointerLockControls do drei não aceita lookSpeed diretamente. Para customização real, seria necessário um wrapper customizado. */}
        {gameActive && <PointerLockControls /* sensibilidade custom: {sensitivity} */ />}
      </Canvas>
    </div>
  );
} 