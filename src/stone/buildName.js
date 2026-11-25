import * as THREE from 'three';
import { Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Brush, Evaluator, INTERSECTION } from 'three-bvh-csg';

/*
 * Builds the name as solid 3D letters, then breaks every letter into
 * real stone chunks with CSG (letter ∩ prism). The chunks of a letter fit
 * together exactly, so when they return home the name is perfectly clean.
 */

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Cuts a convex polygon with a line; returns the two halves.
function splitPolygon(poly, px, py, angle) {
  const nx = Math.cos(angle), ny = Math.sin(angle);
  const side = (p) => (p.x - px) * nx + (p.y - py) * ny;
  const a = [], b = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const sp = side(p), sq = side(q);
    if (sp >= 0) a.push(p); else b.push(p);
    if ((sp >= 0) !== (sq >= 0)) {
      const t = sp / (sp - sq);
      const m = new THREE.Vector2(p.x + (q.x - p.x) * t, p.y + (q.y - p.y) * t);
      a.push(m); b.push(m.clone());
    }
  }
  return [a, b].filter((h) => h.length >= 3);
}

function centroid(poly) {
  const c = new THREE.Vector2();
  poly.forEach((p) => c.add(p));
  return c.multiplyScalar(1 / poly.length);
}

function csgReady(geometry) {
  geometry.deleteAttribute('uv');
  geometry.deleteAttribute('normal');
  const g = mergeVertices(geometry);
  g.computeVertexNormals();
  return g;
}

// Box-projected UVs so the rock texture wraps every face, including cut faces.
function boxUV(geometry, scale = 0.9) {
  const pos = geometry.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
    n.subVectors(c, b).cross(b.clone().sub(a)).normalize();
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
    [a, b, c].forEach((v, k) => {
      let u, w;
      if (ax >= ay && ax >= az) { u = v.z; w = v.y; } else if (ay >= az) { u = v.x; w = v.z; } else { u = v.x; w = v.y; }
      uv[(i + k) * 2] = u * scale;
      uv[(i + k) * 2 + 1] = w * scale;
    });
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

export function buildName(fontData, lines, { size = 1, depth = 0.34, tracking = 0.07, lineHeight = 1.28, cuts = 2, seed = 11 } = {}) {
  const font = new Font(fontData);
  const res = fontData.resolution;
  const rand = rng(seed);
  const evaluator = new Evaluator();
  evaluator.attributes = ['position', 'normal'];
  evaluator.useGroups = true;
  const ROCK = new THREE.MeshBasicMaterial();
  const CRACK = new THREE.MeshBasicMaterial();

  const advance = (ch) => (fontData.glyphs[ch].ha / res) * size;
  const lineWidth = (l) => [...l].reduce((w, ch) => w + advance(ch) + tracking, -tracking);
  const widths = lines.map(lineWidth);
  const width = Math.max(...widths);
  const height = size + (lines.length - 1) * size * lineHeight;

  const pieces = [];
  let letterCount = 0;
  const totalLetters = lines.join('').replace(/ /g, '').length;

  const lineYs = lines.map((_, li) => height / 2 - size - li * size * lineHeight);

  lines.forEach((line, li) => {
    // Lines are left-aligned to a shared edge.
    const xStart = -width / 2;
    let x = xStart;
    const y = lineYs[li];
    [...line].forEach((ch) => {
      if (ch === ' ') { x += advance(ch) + tracking; return; }

      const text = new TextGeometry(ch, {
        font, size, depth, curveSegments: 3,
        bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.022, bevelSegments: 1,
      });
      text.translate(x, y, -depth / 2);
      text.computeBoundingBox();
      const bb = text.boundingBox;
      const letter = new Brush(csgReady(text), ROCK);
      letter.updateMatrixWorld();

      // Break the letter's outline box into convex cells with random cuts.
      const pad = 0.05;
      let cells = [[
        new THREE.Vector2(bb.min.x - pad, bb.min.y - pad), new THREE.Vector2(bb.max.x + pad, bb.min.y - pad),
        new THREE.Vector2(bb.max.x + pad, bb.max.y + pad), new THREE.Vector2(bb.min.x - pad, bb.max.y + pad),
      ]];
      for (let k = 0; k < cuts; k++) {
        cells = cells.flatMap((poly) => {
          const c = centroid(poly);
          const w = bb.max.x - bb.min.x, h = bb.max.y - bb.min.y;
          // First cut runs mostly across the letter, the next mostly along it.
          const base = k % 2 === 0 ? Math.PI / 2 : 0;
          const ang = base + (rand() - 0.5) * 1.1;
          return splitPolygon(poly, c.x + (rand() - 0.5) * w * 0.3, c.y + (rand() - 0.5) * h * 0.3, ang);
        });
      }

      const order = (li + (x - xStart) / widths[li]) / lines.length;

      cells.forEach((poly) => {
        const shape = new THREE.Shape(poly);
        const prism = new THREE.ExtrudeGeometry(shape, { depth: depth * 4, bevelEnabled: false });
        prism.translate(0, 0, -depth * 2);
        const cutter = new Brush(csgReady(prism), CRACK);
        cutter.updateMatrixWorld();
        const result = evaluator.evaluate(letter, cutter, INTERSECTION);
        let g = result.geometry;
        if (!g.attributes.position || g.attributes.position.count < 12) return;
        if (g.index) g = g.toNonIndexed();

        g.computeBoundingBox();
        const home = new THREE.Vector3();
        g.boundingBox.getCenter(home);
        g.translate(-home.x, -home.y, -home.z);
        for (const grp of g.groups) grp.materialIndex = result.material[grp.materialIndex] === ROCK ? 0 : 1;
        boxUV(g);
        g.computeVertexNormals();
        g.computeBoundingSphere();

        const dir = new THREE.Vector3(home.x * 0.35 + (rand() - 0.5) * 2.4, home.y + (rand() - 0.5) * 2.6, (rand() - 0.5) * 1.6).normalize();
        const scatter = home.clone().multiplyScalar(1.25).addScaledVector(dir, 1.8 + rand() * 3.2);
        scatter.z = THREE.MathUtils.clamp(scatter.z - 1, -6, 2.5);

        pieces.push({
          geometry: g,
          home,
          scatter,
          qStart: new THREE.Quaternion().setFromEuler(new THREE.Euler(rand() * 6.28, rand() * 6.28, rand() * 6.28)),
          axis: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize(),
          spin: 0.2 + rand() * 0.4,
          angle: 0,
          phase: rand() * 6.28,
          delay: order * 0.58 + rand() * 0.07,
          letter: letterCount,
        });
      });

      letterCount++;
      x += advance(ch) + tracking;
    });
  });

  return { pieces, width, height, depth, size, lineYs, lineWidths: widths, letters: totalLetters, maxDelay: 0.65 };
}
