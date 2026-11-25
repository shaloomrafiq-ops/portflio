import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import fontData from './anton.typeface.json';
import { buildName } from './buildName.js';

/* ---------- procedural rock texture ---------- */
function rockCanvas(size, seed) {
  let a = seed;
  const rand = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const octaves = [4, 8, 16, 32, 64].map((n, o) => {
    const g = new Float32Array(n * n);
    for (let i = 0; i < g.length; i++) g[i] = rand();
    return { n, g, amp: Math.pow(0.55, o) };
  });
  const total = octaves.reduce((s, o) => s + o.amp, 0);
  const sm = (t) => t * t * (3 - 2 * t);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let v = 0;
      for (const { n, g, amp } of octaves) {
        const fx = (x / size) * n, fy = (y / size) * n;
        const x0 = Math.floor(fx), y0 = Math.floor(fy);
        const tx = sm(fx - x0), ty = sm(fy - y0);
        const x1 = (x0 + 1) % n, y1 = (y0 + 1) % n;
        v += amp * ((g[y0 * n + x0] * (1 - tx) + g[y0 * n + x1] * tx) * (1 - ty) + (g[y1 * n + x0] * (1 - tx) + g[y1 * n + x1] * tx) * ty);
      }
      v = (v / total - 0.5) * 1.9 + 0.5;
      if (rand() < 0.02) v *= 0.55;
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, v * 255));
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function makeTexture(canvas, srgb) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function dotSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.6)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smooth = (t) => t * t * (3 - 2 * t);
const clamp01 = (t) => Math.min(1, Math.max(0, t));

/* ---------- embers that rise off the stone ---------- */
const SPARKS = 220;
function useSparks() {
  return useMemo(() => {
    const pos = new Float32Array(SPARKS * 3);
    const col = new Float32Array(SPARKS * 3);
    const vel = new Float32Array(SPARKS * 3);
    const life = new Float32Array(SPARKS);
    const max = new Float32Array(SPARKS).fill(1);
    let next = 0;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const spawn = (x, y, z, power = 1) => {
      const i = next; next = (next + 1) % SPARKS;
      pos[i * 3] = x + (Math.random() - 0.5) * 0.2;
      pos[i * 3 + 1] = y + (Math.random() - 0.5) * 0.2;
      pos[i * 3 + 2] = z;
      vel[i * 3] = (Math.random() - 0.5) * 0.8 * power;
      vel[i * 3 + 1] = (0.4 + Math.random() * 1.1) * power;
      vel[i * 3 + 2] = (Math.random() - 0.2) * 0.8 * power;
      max[i] = life[i] = 0.8 + Math.random() * 1.2;
    };
    const update = (dt) => {
      for (let i = 0; i < SPARKS; i++) {
        if (life[i] <= 0) { col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0; continue; }
        life[i] -= dt;
        vel[i * 3 + 1] += 0.25 * dt;
        vel[i * 3] *= 0.985; vel[i * 3 + 2] *= 0.985;
        pos[i * 3] += vel[i * 3] * dt + Math.sin(life[i] * 6 + i) * 0.002;
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        const k = Math.max(0, life[i] / max[i]);
        col[i * 3] = 1 * k; col[i * 3 + 1] = 0.55 * k * k; col[i * 3 + 2] = 0.2 * k * k * k;
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
    };
    return { geometry, spawn, update };
  }, []);
}

/* ---------- the broken name ---------- */
function StoneName({ progress, burst }) {
  const { size } = useThree();
  const narrow = size.width / size.height < 1.1;

  // SHALOOM on top, RAFIQ underneath, on every screen size.
  const name = useMemo(() => {
    const n = buildName(fontData, ['SHALOOM', 'RAFIQ']);
    n.pieces.forEach((pc) => {
      pc.hover = 0;
      pc.burstDir = new THREE.Vector3(pc.home.x * 0.5 + (Math.random() - 0.5), pc.home.y + (Math.random() - 0.5), 1.2 + Math.random() * 1.5)
        .normalize().multiplyScalar(1.4 + Math.random() * 1.6);
    });
    return n;
  }, []);
  useEffect(() => () => name.pieces.forEach((p) => p.geometry.dispose()), [name]);

  const materials = useMemo(() => {
    const surface = rockCanvas(256, 7);
    const glow = rockCanvas(128, 31);
    const rock = new THREE.MeshStandardMaterial({
      color: '#9b9286', map: makeTexture(surface, true), bumpMap: makeTexture(surface, false), bumpScale: 3,
      roughness: 0.94, metalness: 0.02, flatShading: true,
    });
    const crack = new THREE.MeshStandardMaterial({
      color: '#c2b3a0', map: makeTexture(surface, true), roughness: 0.9, flatShading: true,
      emissive: new THREE.Color('#ff7a2a'), emissiveMap: makeTexture(glow, true), emissiveIntensity: 1,
    });
    return { rock, crack, list: [rock, crack] };
  }, []);

  const sparks = useSparks();
  const sprite = useMemo(dotSprite, []);

  const group = useRef();
  const ember = useRef();
  const torch = useRef();
  const meshes = useRef([]);
  const tmp = useMemo(() => ({
    spinQ: new THREE.Quaternion(), startQ: new THREE.Quaternion(), extraQ: new THREE.Quaternion(), identity: new THREE.Quaternion(),
    v: new THREE.Vector3(), dir: new THREE.Vector3(), hit: new THREE.Vector3(), local: new THREE.Vector3(), w: new THREE.Vector3(),
    rotX: 0, rotY: 0, locked: false, lockT: -10, lastP: 0, seenBurst: 0,
  }), []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const now = performance.now() / 1000;
    const p = progress.current;
    const pe = smooth(p);
    const span = 1 - name.maxDelay;
    const cam = state.camera;
    const g = group.current;

    /* framing: left of centre on wide screens, above the tagline on narrow ones */
    const aspect = size.width / size.height;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(35 / 2));
    const fit = narrow
      ? Math.max((name.width * 1.2) / (2 * tanHalf * aspect), (name.height * 2.3) / (2 * tanHalf)) + name.depth
      : Math.max(name.width / (0.5 * 2 * tanHalf * aspect), (name.height * 1.8) / (2 * tanHalf)) + name.depth;
    const viewW = 2 * tanHalf * fit * aspect;
    cam.position.x = THREE.MathUtils.damp(cam.position.x, state.pointer.x * 0.3, 2, dt);
    cam.position.y = THREE.MathUtils.damp(cam.position.y, state.pointer.y * 0.2, 2, dt);
    cam.position.z = fit * THREE.MathUtils.lerp(1.3, 1, pe);
    cam.lookAt(0, 0, 0);

    tmp.rotY = THREE.MathUtils.damp(tmp.rotY, state.pointer.x * 0.2 + (1 - pe) * Math.sin(t * 0.15) * 0.3, 3, dt);
    tmp.rotX = THREE.MathUtils.damp(tmp.rotX, -state.pointer.y * 0.12, 3, dt);
    if (g) {
      g.rotation.set(tmp.rotX, tmp.rotY, 0);
      g.position.set(narrow ? 0 : -viewW * 0.17, narrow ? name.height * 0.22 : 0, 0);
      g.updateMatrixWorld();
    }

    /* where the cursor meets the stone's plane */
    tmp.dir.set(state.pointer.x, state.pointer.y, 0.5).unproject(cam).sub(cam.position).normalize();
    tmp.hit.copy(cam.position).addScaledVector(tmp.dir, -cam.position.z / tmp.dir.z);
    tmp.local.copy(tmp.hit);
    if (g) g.worldToLocal(tmp.local);
    const whole = clamp01((p - 0.9) / 0.1);

    /* click / tap: break the name apart, then let it pull itself back */
    if (burst.current !== tmp.seenBurst) {
      tmp.seenBurst = burst.current;
      if (whole > 0.5 && g) {
        name.pieces.forEach((pc) => {
          tmp.w.copy(pc.home); g.localToWorld(tmp.w);
          for (let k = 0; k < 3; k++) sparks.spawn(tmp.w.x, tmp.w.y, tmp.w.z + 0.2, 1.8);
        });
      }
    }
    const since = now - burst.current;
    const b = burst.current > 0 && whole > 0.5 ? Math.exp(-2.4 * since) * Math.min(1, since * 14) : 0;

    name.pieces.forEach((pc, i) => {
      const m = meshes.current[i];
      if (!m) return;
      const e = easeInOutCubic(clamp01((p - pc.delay) / span));
      const free = 1 - e;
      pc.angle += dt * pc.spin * free;

      // cursor pushes nearby chunks out of the wall
      const dx = pc.home.x - tmp.local.x, dy = pc.home.y - tmp.local.y;
      const d = Math.hypot(dx, dy);
      pc.hover = THREE.MathUtils.damp(pc.hover, (1 - smooth(clamp01(d / 0.95))) * whole, 7, dt);

      m.position.lerpVectors(pc.scatter, pc.home, e);
      m.position.x += Math.sin(t * 0.5 + pc.phase) * 0.18 * free + (d > 0.001 ? (dx / d) * pc.hover * 0.1 : 0) + pc.burstDir.x * b;
      m.position.y += Math.cos(t * 0.4 + pc.phase * 1.3) * 0.2 * free + (d > 0.001 ? (dy / d) * pc.hover * 0.1 : 0) + pc.burstDir.y * b;
      m.position.z += pc.hover * 0.38 + pc.burstDir.z * b;

      tmp.spinQ.setFromAxisAngle(pc.axis, pc.angle);
      tmp.startQ.copy(pc.qStart).multiply(tmp.spinQ);
      m.quaternion.slerpQuaternions(tmp.startQ, tmp.identity, e);
      tmp.extraQ.setFromAxisAngle(pc.axis, pc.hover * 0.3 + b * 2.2);
      m.quaternion.multiply(tmp.extraQ);
    });

    /* seams: glow while apart, flash when whole, flare when broken */
    if (p > 0.985 && !tmp.locked) { tmp.locked = true; tmp.lockT = t; }
    if (p < 0.94) tmp.locked = false;
    const pulse = tmp.locked ? Math.exp(-(t - tmp.lockT) * 1.5) * 2.6 : 0;
    materials.crack.emissiveIntensity = 0.15 + (1 - p) * 0.9 + pulse + b * 3;

    /* writing light + sparks off the letter being written */
    if (ember.current && g) {
      const head = clamp01(p / (name.maxDelay + 0.15)) * 0.999 * name.lineYs.length;
      const line = Math.floor(head);
      ember.current.position.set(-name.width / 2 + (head - line) * name.lineWidths[line], name.lineYs[line] + name.size / 2, 1.6);
      ember.current.intensity = Math.sin(Math.PI * p) * 14 + pulse * 6 + b * 10;
      const moving = Math.abs(p - tmp.lastP) > 0.0004 && p > 0.02 && p < 0.97;
      if (moving) {
        tmp.w.copy(ember.current.position).setZ(0.3); g.localToWorld(tmp.w);
        for (let k = 0; k < 3; k++) sparks.spawn(tmp.w.x, tmp.w.y, tmp.w.z, 1);
      }
    }
    tmp.lastP = p;

    /* the cursor is a warm torch once the name is whole */
    if (torch.current) {
      torch.current.position.set(tmp.hit.x, tmp.hit.y, 1.3);
      torch.current.intensity = THREE.MathUtils.damp(torch.current.intensity, whole * 9, 4, dt);
    }

    sparks.update(dt);
  });

  return (
    <>
      <group ref={group}>
        {name.pieces.map((piece, i) => (
          <mesh
            key={i}
            ref={(el) => (meshes.current[i] = el)}
            geometry={piece.geometry}
            material={materials.list}
            position={piece.scatter}
            scale={0.992}
          />
        ))}
        <pointLight ref={ember} intensity={0} distance={7} decay={2} color="#ff9a52" />
      </group>
      <pointLight ref={torch} intensity={0} distance={4.5} decay={2} color="#ffb070" />
      <points geometry={sparks.geometry} frustumCulled={false}>
        <pointsMaterial map={sprite} size={0.09} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation />
      </points>
    </>
  );
}

/* ---------- floating dust ---------- */
function Dust({ count = 450 }) {
  const ref = useRef();
  const { positions, sprite } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 12 - 2;
    }
    return { positions, sprite: dotSprite() };
  }, [count]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = t * 0.01;
    ref.current.position.y = Math.sin(t * 0.1) * 0.25;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial map={sprite} size={0.05} color="#e6cfb2" transparent opacity={0.35} depthWrite={false} sizeAttenuation />
    </points>
  );
}

/* ---------- scene ---------- */
export default function StoneScene({ progress, burst }) {
  return (
    <>
      <color attach="background" args={['#0b0b0c']} />
      <fog attach="fog" args={['#0b0b0c', 11, 30]} />
      <ambientLight intensity={0.16} color="#8d93a6" />
      <directionalLight position={[-4, 5, 7]} intensity={2.6} color="#ffd9b5" />
      <directionalLight position={[6, 3, -6]} intensity={3.2} color="#7d9bff" />
      <directionalLight position={[0, -5, 4]} intensity={0.35} color="#3b4058" />
      <StoneName progress={progress} burst={burst} />
      <Dust />
    </>
  );
}
