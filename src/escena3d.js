// Vista 3D con Three.js: maniquí, prótesis completa y rodilla de 4 barras con el mecanismo resuelto.
// Unidades de escena: mm. X = anterior, Y = arriba, Z = derecha de la persona.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CONFIG } from './config.js';
import { aMundo, rot, sum, esc, res, unit, norma } from './mat.js';

const Y = new THREE.Vector3(0, 1, 0);
const v3 = (p, z = 0) => new THREE.Vector3(p[0], p[1], z);

export function geometriaCuerpo(c) {
  const forma = new THREE.Shape();
  const sg = c.eje === 'y' ? -1 : 1;
  c.contorno.forEach(([u, v], i) => (i ? forma.lineTo(u, sg * v) : forma.moveTo(u, sg * v)));
  forma.closePath();
  for (const b of c.barrenos) {
    const h = new THREE.Path();
    h.absarc(b.u, sg * b.v, b.d / 2, 0, Math.PI * 2, sg < 0);
    forma.holes.push(h);
  }
  const g = new THREE.ExtrudeGeometry(forma, { depth: c.a1 - c.a0, bevelEnabled: false, curveSegments: 20 });
  if (c.eje === 'y') { g.rotateX(-Math.PI / 2); g.translate(0, c.a0, 0); } else g.translate(0, 0, c.a0);
  return g;
}

// Color del mapa de esfuerzos: azul → verde → amarillo → rojo (uso 0 → 1 de la fluencia).
export function colorEsfuerzo(uso) {
  const u = Math.max(0, Math.min(1, uso));
  const paradas = [[0, [0.16, 0.36, 0.8]], [0.33, [0.12, 0.62, 0.38]], [0.66, [0.93, 0.76, 0.1]], [1, [0.8, 0.13, 0.1]]];
  let i = 0;
  while (i < paradas.length - 2 && u > paradas[i + 1][0]) i++;
  const [u0, c0] = paradas[i], [u1, c1] = paradas[i + 1];
  const k = (u - u0) / (u1 - u0);
  return new THREE.Color(c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k, c0[2] + (c1[2] - c0[2]) * k);
}

export function crearEscena(contenedor) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  contenedor.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', 'Vista 3D del maniquí con la prótesis. Arrastra para girar, pellizca o usa la rueda para acercar.');
  const escena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camara = new THREE.PerspectiveCamera(32, 1, 20, 30000);
  const controles = new OrbitControls(camara, renderer.domElement);
  controles.enableDamping = true;
  controles.dampingFactor = 0.12;
  controles.minDistance = 120;
  controles.maxDistance = 9000;
  controles.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  escena.add(new THREE.HemisphereLight(0xffffff, 0x8a8a90, 1.1));
  const sol_ = new THREE.DirectionalLight(0xffffff, 1.6);
  sol_.position.set(900, 2200, 1400);
  escena.add(sol_);

  const mats = {
    piel: new THREE.MeshStandardMaterial({ color: 0xb9b4ae, roughness: 0.85, metalness: 0 }),
    aluminio: () => new THREE.MeshStandardMaterial({ color: 0xc9ccd1, roughness: 0.34, metalness: 0.9 }),
    acero: new THREE.MeshStandardMaterial({ color: 0x70757d, roughness: 0.3, metalness: 1 }),
    socket: new THREE.MeshStandardMaterial({ color: 0x6b1e46, roughness: 0.55, metalness: 0.1 }),
    pie: new THREE.MeshStandardMaterial({ color: 0x8d6f5c, roughness: 0.9 }),
    apoyo: new THREE.MeshStandardMaterial({ color: 0x9a9da3, roughness: 0.95 }),
  };
  let dirty = true;
  const pedir = () => { dirty = true; };
  controles.addEventListener('change', pedir);

  // ---------- piso ----------
  const piso = new THREE.Group();
  escena.add(piso);
  const rejilla = new THREE.GridHelper(8000, 40, 0x888888, 0x888888);
  rejilla.material.transparent = true;
  rejilla.material.opacity = 0.28;
  piso.add(rejilla);
  const plano = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), new THREE.MeshBasicMaterial({ color: 0xe9e7e4 }));
  plano.rotation.x = -Math.PI / 2;
  plano.position.y = -1.5;
  piso.add(plano);
  const utileria = new THREE.Group();
  escena.add(utileria);

  // ---------- helpers ----------
  const cil = (r0, r1, mat, seg = 20) => new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, 1, seg), mat); // r0 abajo (inicio), r1 arriba (fin)
  function entre(mesh, a, b) {
    const d = new THREE.Vector3().subVectors(b, a);
    const L = d.length() || 1;
    mesh.position.copy(a).addScaledVector(d, 0.5);
    mesh.quaternion.setFromUnitVectors(Y, d.normalize());
    mesh.scale.set(1, L, 1);
  }
  const esfera = (r, mat) => new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), mat);

  let M = null; // modelo actual
  let cuerpo = null, protesis = null, gRodilla = null, marcos = {}, mallas = {}, lado = 1, zLado = 0;
  let superpuestos = null;
  const objetivoCam = new THREE.Vector3(0, 480, 0);
  let seguir = true;

  function limpiar(g) { g.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); g.removeFromParent(); }

  function setModelo(modelo) {
    M = modelo;
    if (cuerpo) limpiar(cuerpo);
    if (protesis) limpiar(protesis);
    if (superpuestos) limpiar(superpuestos);
    const s = M.seg, k = s.corpulencia;
    lado = M.usuario.ladoAmputado === 'derecho' ? 1 : -1;
    zLado = (lado * s.anchoCadera) / 2;
    cuerpo = new THREE.Group();
    protesis = new THREE.Group();
    escena.add(cuerpo, protesis);
    const piel = mats.piel;
    const c = {};
    c.torso = cil(105 * k, 135 * k, piel, 24); c.torso.scale.z = 0.62;
    c.pelvis = esfera(1, piel);
    c.cuello = cil(38 * k, 36 * k, piel);
    c.cabeza = esfera(1, piel);
    c.musloS = cil(78 * k, 52 * k, piel); c.piernaS = cil(52 * k, 36 * k, piel);
    c.rodS = esfera(54 * k, piel); c.tobS = esfera(36 * k, piel);
    c.pieS = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), piel);
    c.munon = cil(50 * k, 76 * k, piel);
    for (const b of ['brazoD', 'brazoI']) { c[b] = cil(40 * k, 33 * k, piel); c[b + '2'] = cil(33 * k, 26 * k, piel); c[b + 'h'] = esfera(46 * k, piel); c[b + 'm'] = esfera(34 * k, piel); }
    Object.values(c).forEach((m) => cuerpo.add(m));
    cuerpo.userData = c;

    // --- prótesis: socket, rodilla, pilón, pie ---
    const p = {};
    p.socket = cil(56 * k, 88 * k, mats.socket, 28);
    p.conector = cil(17, 17, mats.acero);
    protesis.add(p.socket, p.conector);
    gRodilla = new THREE.Group();
    protesis.add(gRodilla);
    marcos = { muslo: new THREE.Group(), pierna: new THREE.Group(), c1: new THREE.Group(), c2: new THREE.Group() };
    Object.values(marcos).forEach((g) => gRodilla.add(g));
    mallas = {};
    for (const pz of M.piezas) {
      const g = new THREE.Group();
      for (const cu of pz.cuerpos) g.add(new THREE.Mesh(geometriaCuerpo(cu), mats.aluminio()));
      g.userData.pieza = pz;
      marcos[pz.cuerpo].add(g);
      mallas[pz.id] = g;
    }
    for (const e of M.ejes) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(e.d / 2, e.d / 2, e.largo, 20), mats.acero.clone());
      m.rotation.x = Math.PI / 2;
      m.position.set(e.centro[0], e.centro[1], 0);
      marcos[e.cuerpo].add(m);
      mallas[e.id] = m;
    }
    const tb = CONFIG.piezas.tuboReceptor, ba = CONFIG.piezas.base, dp = CONFIG.distal;
    const yTubo = ba.yTope - ba.espesorPlaca - tb.largo;
    p.pilon = cil(dp.pilonDiametro / 2, dp.pilonDiametro / 2, mats.aluminio(), 24);
    entre(p.pilon, new THREE.Vector3(0, -M.Lps, 0), new THREE.Vector3(0, yTubo + 25, 0));
    marcos.pierna.add(p.pilon);
    // Pie SACH: perfil lateral extruido.
    const Lf = s.pie, h = dp.pieAlturaTobillo;
    const perfil = new THREE.Shape();
    [[-0.25 * Lf, -h + 10], [-0.23 * Lf, -18], [-45, 0], [45, 0], [0.45 * Lf, -h + 34], [0.72 * Lf, -h + 20], [0.75 * Lf, -h + 8], [0.72 * Lf, -h], [-0.25 * Lf + 14, -h]]
      .forEach(([x, y], i) => (i ? perfil.lineTo(x, y) : perfil.moveTo(x, y)));
    const ancho = 0.052 * s.estatura;
    p.pie = new THREE.Mesh(new THREE.ExtrudeGeometry(perfil, { depth: ancho, bevelEnabled: true, bevelSize: 5, bevelThickness: 5, bevelSegments: 2 }), mats.pie);
    p.pie.geometry.translate(0, 0, -ancho / 2);
    p.gPie = new THREE.Group();
    p.gPie.add(p.pie);
    protesis.add(p.gPie);
    protesis.userData = p;

    // --- elementos superpuestos: CIR, líneas, carga, fuerzas ---
    superpuestos = new THREE.Group();
    escena.add(superpuestos);
    const linea = (color, guion) => {
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      const m = guion ? new THREE.LineDashedMaterial({ color, dashSize: 14, gapSize: 9, depthTest: false, transparent: true }) : new THREE.LineBasicMaterial({ color, depthTest: false, transparent: true });
      const l = new THREE.Line(g, m);
      l.renderOrder = 10;
      superpuestos.add(l);
      return l;
    };
    const flecha = (color) => { const a = new THREE.ArrowHelper(Y, new THREE.Vector3(), 100, color, 26, 14); a.line.material.depthTest = false; a.cone.material.depthTest = false; a.renderOrder = 11; superpuestos.add(a); return a; };
    const o = superpuestos.userData = {
      cir: new THREE.Mesh(new THREE.SphereGeometry(7, 18, 12), new THREE.MeshBasicMaterial({ color: 0x1e7b4f, depthTest: false })),
      ext1: linea(0x6b1e46, true), ext2: linea(0x6b1e46, true),
      carga: linea(0x1e7b4f, false), grf: flecha(0x1e7b4f), fA: flecha(0x2a5cc7), fB: flecha(0x2a5cc7),
    };
    o.cir.renderOrder = 12;
    superpuestos.add(o.cir);
    pedir();
  }

  function ponerLinea(l, a, b) {
    const pos = l.geometry.attributes.position;
    pos.setXYZ(0, a.x, a.y, a.z); pos.setXYZ(1, b.x, b.y, b.z);
    pos.needsUpdate = true;
    if (l.material.isLineDashedMaterial) l.computeLineDistances();
    l.geometry.computeBoundingSphere();
  }
  function ponerFlecha(f, origen, F, escala) {
    const L = Math.hypot(F[0], F[1]);
    f.visible = L * escala > 12;
    if (!f.visible) return;
    f.position.copy(origen);
    f.setDirection(new THREE.Vector3(F[0] / L, F[1] / L, 0));
    f.setLength(L * escala, Math.min(30, L * escala * 0.3), 15);
  }

  let ultimaUtileria = '';
  function ponerUtileria(escn, inst) {
    const clave = escn.id + M.seg.alturaRodilla;
    if (clave === ultimaUtileria) return;
    ultimaUtileria = clave;
    while (utileria.children.length) limpiar(utileria.children[0]);
    if (escn.escalon) {
      const { h, sube } = escn.escalon;
      const b = new THREE.Mesh(new THREE.BoxGeometry(1400, h, 1200), mats.apoyo);
      b.position.set(sube ? 700 : -700, h / 2, 0);
      utileria.add(b);
    }
    if (escn.silla) {
      const hs = M.seg.alturaRodilla - 55 * M.seg.corpulencia - 20;
      const asiento = new THREE.Mesh(new THREE.BoxGeometry(420, 40, 460), mats.apoyo);
      asiento.position.set(-M.seg.muslo - 60, hs, 0);
      const resp = new THREE.Mesh(new THREE.BoxGeometry(40, 480, 460), mats.apoyo);
      resp.position.set(-M.seg.muslo - 250, hs + 260, 0);
      utileria.add(asiento, resp);
      for (const [dx, dz] of [[-170, -200], [170, -200], [-170, 200], [170, 200]]) {
        const pata = new THREE.Mesh(new THREE.BoxGeometry(30, hs - 20, 30), mats.apoyo);
        pata.position.set(-M.seg.muslo - 60 + dx, (hs - 20) / 2, dz);
        utileria.add(pata);
      }
    }
  }

  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
  function actualizar(inst, ver) {
    if (!M) return;
    const P = inst.postura, s = M.seg, k = s.corpulencia, c = cuerpo.userData, p = protesis.userData;
    const dx = inst.escenario.cinta ? -P.s.px : 0;
    const X = (q, z = 0) => new THREE.Vector3(q[0] + dx, q[1], z);
    rejilla.position.x = inst.escenario.cinta ? -(P.s.px % 200) : 0;
    ponerUtileria(inst.escenario, inst);
    utileria.position.x = 0;

    // --- tronco, cabeza, brazos ---
    const zS = -zLado;
    const cad = P.cadera, tr = (P.s.tronco * Math.PI) / 180;
    const arriba = (d) => sum(cad, rot([0, d], -tr));
    const hombro = arriba(s.alturaHombro - s.alturaCadera);
    entre(c.torso, X(arriba(-20)), X(hombro));
    c.pelvis.position.copy(X(arriba(10))); c.pelvis.scale.set(100 * k, 95 * k, (s.anchoCadera / 2 + 70) * k);
    entre(c.cuello, X(hombro), X(arriba(s.alturaMenton - s.alturaCadera + 10)));
    const rc = (s.estatura - s.alturaMenton) / 2;
    c.cabeza.position.copy(X(arriba(s.alturaMenton - s.alturaCadera + rc))); c.cabeza.scale.set(rc * 0.86, rc, rc * 0.8);
    const zh = s.anchoHombros / 2;
    [['brazoD', 1], ['brazoI', -1]].forEach(([n, sg]) => {
      const a = ((sg * lado > 0 ? -1 : 1) * (P.s.brazos || 0) * Math.PI) / 180 - tr * 0.4;
      const h0 = sum(hombro, rot([0, -30], -tr));
      const codo = sum(h0, [s.brazo * Math.sin(a), -s.brazo * Math.cos(a)]);
      const mano = sum(codo, [s.antebrazo * Math.sin(a + 0.25), -s.antebrazo * Math.cos(a + 0.25)]);
      entre(c[n], X(codo, sg * zh), X(h0, sg * zh));
      entre(c[n + '2'], X(mano, sg * zh), X(codo, sg * zh));
      c[n + 'h'].position.copy(X(h0, sg * zh));
      c[n + 'm'].position.copy(X(mano, sg * zh));
    });
    // --- pierna sana ---
    entre(c.musloS, X(P.rodS, zS), X(cad, zS));
    entre(c.piernaS, X(P.tobS, zS), X(P.rodS, zS));
    c.rodS.position.copy(X(P.rodS, zS)); c.tobS.position.copy(X(P.tobS, zS));
    const centroPie = sum(P.tobS, rot([0.25 * s.pie, -s.alturaTobillo / 2], P.pitchS));
    c.pieS.position.copy(X(centroPie, zS)); c.pieS.rotation.set(0, 0, P.pitchS); c.pieS.scale.set(s.pie, s.alturaTobillo, 0.052 * s.estatura);
    // --- muñón y socket ---
    const eje = CONFIG.mecanismo.ejePilonX, ad = CONFIG.piezas.adaptador;
    const yAnillo = ad.yBase + ad.espesorPlaca + ad.anilloAlto;
    const cadM = [M.ctx.e, s.muslo], pieSocket = [eje, yAnillo];
    const dirS = unit(res(pieSocket, cadM));
    const largoSocket = Math.min(s.munon, norma(res(pieSocket, cadM)) - 30); // el socket no puede invadir la rodilla
    const finMunon = sum(cadM, esc(dirS, largoSocket));
    const W = (q) => X(aMundo(P.mMuslo, q), zLado);
    entre(c.munon, W(sum(cadM, esc(dirS, largoSocket - 20))), W(cadM));
    entre(p.socket, W(sum(finMunon, esc(dirS, 12))), W(sum(cadM, esc(dirS, 70))));
    entre(p.conector, W(pieSocket), W(sum(finMunon, esc(dirS, 12))));
    // --- rodilla ---
    gRodilla.position.set(dx, 0, zLado);
    const poner = (g, m) => { g.position.set(m.t[0], m.t[1], 0); g.rotation.z = m.ang; };
    poner(marcos.muslo, P.mMuslo);
    poner(marcos.pierna, P.mPierna);
    poner(marcos.c1, { ang: P.mPierna.ang + inst.sol.phi1, t: aMundo(P.mPierna, inst.sol.D) });
    poner(marcos.c2, { ang: P.mPierna.ang + inst.sol.phi2, t: aMundo(P.mPierna, inst.sol.C) });
    p.gPie.position.copy(X(P.tobP, zLado)); p.gPie.rotation.z = P.pitchP;

    // --- despiece, transparencia y mapa de esfuerzos ---
    const fd = ver.despiece || 0;
    for (const pz of M.piezas) {
      const g = mallas[pz.id];
      g.position.set(pz.despiece[0] * fd, pz.despiece[1] * fd, pz.despiece[2] * fd);
      const e = inst.cargas.esfuerzos[pz.id];
      g.children.forEach((m) => {
        if (ver.esfuerzos && e && e.uso != null) { m.material.color.copy(colorEsfuerzo(e.uso)); m.material.metalness = 0.25; m.material.roughness = 0.6; }
        else { m.material.color.set(0xc9ccd1); m.material.metalness = 0.9; m.material.roughness = 0.34; }
      });
    }
    for (const e of M.ejes) {
      const m = mallas[e.id], es = inst.cargas.esfuerzos[e.id];
      m.position.z = fd * 0;
      m.scale.y = 1 + fd * 0.6;
      if (ver.esfuerzos && es) { m.material.color.copy(colorEsfuerzo(es.uso)); m.material.metalness = 0.25; } else { m.material.color.set(0x70757d); m.material.metalness = 1; }
    }
    const op = ver.transparente ? 0.16 : 1;
    for (const mt of [mats.piel, mats.socket]) { mt.transparent = op < 1; mt.opacity = op; mt.depthWrite = op >= 1; }

    // --- CIR, líneas de las barras, línea de carga y vectores ---
    const o = superpuestos.userData;
    const zO = zLado + lado * (CONFIG.piezas.separacionC1 + CONFIG.piezas.barraLateral.espesor + 6);
    const Wp = (q) => X(aMundo(P.mPierna, q), zO);
    const hayCir = !!inst.sol.cir;
    const colorEst = inst.cargado ? (inst.estable ? 0x1e7b4f : 0xc0271d) : 0x6b1e46;
    o.cir.visible = ver.cir && hayCir;
    o.ext1.visible = o.ext2.visible = ver.lineas && hayCir;
    if (hayCir) {
      o.cir.position.copy(Wp(inst.sol.cir)); o.cir.material.color.set(colorEst);
      ponerLinea(o.ext1, Wp(inst.sol.D), Wp(inst.sol.cir));
      ponerLinea(o.ext2, Wp(inst.sol.C), Wp(inst.sol.cir));
    }
    const F = inst.grf.F, hayCarga = inst.cargado;
    o.carga.visible = ver.carga && hayCarga;
    o.grf.visible = false;
    if (hayCarga) {
      const u = unit(F), cop = inst.grf.p;
      ponerLinea(o.carga, X(sum(cop, esc(u, -40)), zO), X(sum(cop, esc(u, s.alturaCadera * 1.15)), zO));
      o.carga.material.color.set(colorEst);
      if (ver.carga) { ponerFlecha(o.grf, X(cop, zO), F, 0.32); o.grf.setColor(colorEst); }
    }
    const fz = ver.fuerzas && (Math.abs(inst.cargas.F1) + Math.abs(inst.cargas.F2) > 5);
    o.fA.visible = o.fB.visible = false;
    if (fz) {
      const g1 = rot(esc(inst.sol.u1, inst.cargas.F1), P.mPierna.ang), g2 = rot(esc(inst.sol.u2, inst.cargas.F2), P.mPierna.ang);
      ponerFlecha(o.fA, Wp(inst.sol.A), g1, 0.12);
      ponerFlecha(o.fB, Wp(inst.sol.B), g2, 0.12);
    }

    // --- cámara: sigue al centro de la rodilla ---
    if (seguir) {
      const kc = aMundo(P.mPierna, [0, 30]);
      tmpA.set(kc[0] + dx, kc[1], zLado);
      tmpB.subVectors(tmpA, objetivoCam).multiplyScalar(0.25);
      objetivoCam.add(tmpB);
      camara.position.add(tmpB);
      controles.target.copy(objetivoCam);
    }
    pedir();
  }

  function setVista(nombre) {
    const d = nombre === 'rodilla' ? 520 : controles.getDistance() || 2300;
    const dirs = { isometrica: [1, 0.55, lado], frontal: [1, 0.02, 0], lateral: [0, 0.02, lado], posterior: [-1, 0.02, 0], superior: [0.001, 1, 0], rodilla: [0.75, 0.3, lado] };
    const v = new THREE.Vector3(...(dirs[nombre] || dirs.isometrica)).normalize();
    seguir = true;
    camara.position.copy(objetivoCam).addScaledVector(v, nombre === 'rodilla' ? d : Math.max(d, 900));
    controles.target.copy(objetivoCam);
    controles.update();
    pedir();
  }

  function setTema() {
    const cs = getComputedStyle(document.documentElement);
    const fondo = cs.getPropertyValue('--lienzo').trim() || '#eceae7';
    escena.background = new THREE.Color(fondo);
    plano.material.color.set(cs.getPropertyValue('--piso').trim() || '#e3e0dc');
    pedir();
  }

  function redimensionar() {
    const w = contenedor.clientWidth, h = contenedor.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
    pedir();
  }
  new ResizeObserver(redimensionar).observe(contenedor);

  camara.position.set(1500, 1300, 1700);
  let activo = true;
  (function ciclo() {
    requestAnimationFrame(ciclo);
    if (!activo) return;
    controles.update();
    if (dirty) { dirty = false; renderer.render(escena, camara); }
  })();

  return { setModelo, actualizar, setVista, setTema, redimensionar, setActivo: (a) => { activo = a; if (a) pedir(); }, lienzo: renderer.domElement,
    alejar: (d) => { const v = new THREE.Vector3().subVectors(camara.position, controles.target).setLength(d); camara.position.copy(controles.target).add(v); pedir(); } };
}
