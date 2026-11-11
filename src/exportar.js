// Exportación sin dependencias: PDF vectorial, DXF (R12) y STL binario.

// ZIP sin compresión (un solo archivo), para formatos que el visor de artifacts no deja guardar sueltos.
function zipDe(nombre, bytes) {
  const tabla = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  let crc = 0xffffffff;
  for (const x of bytes) crc = tabla[(crc ^ x) & 0xff] ^ (crc >>> 8);
  crc = (crc ^ 0xffffffff) >>> 0;
  const nom = new TextEncoder().encode(nombre), n = bytes.length;
  const cab = (firma, extra) => { const d = new DataView(new ArrayBuffer(extra)); d.setUint32(0, firma, true); return d; };
  const local = cab(0x04034b50, 30); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true); local.setUint32(14, crc, true); local.setUint32(18, n, true); local.setUint32(22, n, true); local.setUint16(26, nom.length, true);
  const central = cab(0x02014b50, 46); central.setUint16(4, 20, true); central.setUint16(6, 20, true); central.setUint16(8, 0x0800, true); central.setUint32(16, crc, true); central.setUint32(20, n, true); central.setUint32(24, n, true); central.setUint16(28, nom.length, true);
  const fin = cab(0x06054b50, 22); fin.setUint16(8, 1, true); fin.setUint16(10, 1, true); fin.setUint32(12, 46 + nom.length, true); fin.setUint32(16, 30 + nom.length + n, true);
  return new Blob([local, nom, bytes, central, nom, fin], { type: 'application/zip' });
}

// Guarda un archivo y devuelve el nombre final, o false si no se pudo.
// En GitHub Pages usa un enlace de descarga normal; dentro de un artifact de Claude pide permiso al visor.
const PERMITIDAS = /\.(pdf|svg|zip|csv|txt|json|png)$/i;
export async function descargar(nombre, datos, tipo) {
  try {
    let blob = datos instanceof Blob ? datos : new Blob([datos], { type: tipo });
    if (window.claude?.use) {
      const dl = await window.claude.use('downloads');
      if (!dl) return false;
      if (!PERMITIDAS.test(nombre)) { blob = zipDe(nombre, new Uint8Array(await blob.arrayBuffer())); nombre += '.zip'; }
      await dl.save({ filename: nombre, data: blob });
      return nombre;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return nombre;
  } catch { return false; }
}

// ---------- PDF ----------
const MM = 72 / 25.4;
const WIN = { '–': 0x96, '—': 0x97, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '…': 0x85, '€': 0x80, '◇': 0x2a };
const aWin = (s) => [...s].map((ch) => { const c = ch.codePointAt(0); const b = c < 256 ? c : WIN[ch] ?? 0x3f; return b === 0x28 || b === 0x29 || b === 0x5c ? '\\' + String.fromCharCode(b) : String.fromCharCode(b); }).join('');
const anchoTexto = (s, alto, negrita) => [...s].reduce((w, ch) => w + (/[ilI.,:;'|!·]/.test(ch) ? 0.26 : /[mwMW]/.test(ch) ? 0.85 : /[A-ZÁÉÍÓÚÑØ0-9]/.test(ch) ? 0.62 : ch === ' ' ? 0.28 : 0.52), 0) * alto * (negrita ? 1.06 : 1);
const PDF_CAPA = {
  visible: [0.5, null], oculta: [0.25, [2, 1.2]], eje: [0.18, [6, 1.2, 1, 1.2]], cota: [0.18, null], cotaRelleno: [0.1, null, true],
  rayado: [0.13, null], fina: [0.25, null], marco: [0.6, null], corte: [0.5, [7, 1.5, 1.5, 1.5]],
};
export function pdfDeHojas(hojas, HOJA) {
  const f = (v) => (v * MM).toFixed(2), Y = (y) => ((HOJA.h - y) * MM).toFixed(2);
  const objetos = [];
  const nuevo = (s) => { objetos.push(s); return objetos.length; };
  const idCatalogo = nuevo(''), idPaginas = nuevo('');
  const idF1 = nuevo('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const idF2 = nuevo('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const paginas = [];
  for (const h of hojas) {
    let c = '1 J 1 j 0 G 0 g\n', capa = null;
    for (const e of h.ents) {
      if (e.t === 't') {
        const w = anchoTexto(e.s, e.alto, e.negrita);
        const x = e.ancla === 'middle' ? e.x - w / 2 : e.ancla === 'end' ? e.x - w : e.x;
        c += `BT /F${e.negrita ? 2 : 1} ${(e.alto * MM).toFixed(2)} Tf ${f(x)} ${Y(e.y)} Td (${aWin(e.s)}) Tj ET\n`;
        continue;
      }
      const [ancho, guion, relleno] = PDF_CAPA[e.capa] || PDF_CAPA.fina;
      if (capa !== e.capa) { c += `${(ancho * MM).toFixed(2)} w [${(guion || []).map((g) => (g * MM).toFixed(2)).join(' ')}] 0 d\n`; capa = e.capa; }
      const fin = relleno ? 'B' : 'S';
      if (e.t === 'l') c += `${f(e.x1)} ${Y(e.y1)} m ${f(e.x2)} ${Y(e.y2)} l S\n`;
      else if (e.t === 'p') c += e.pts.map((p, i) => `${f(p[0])} ${Y(p[1])} ${i ? 'l' : 'm'}`).join(' ') + (e.cerrada ? ' h ' : ' ') + fin + '\n';
      else if (e.t === 'c') {
        const k = 0.5523 * e.r, { cx, cy, r } = e, P = (x, y) => `${f(x)} ${Y(y)}`;
        c += `${P(cx + r, cy)} m ${P(cx + r, cy + k)} ${P(cx + k, cy + r)} ${P(cx, cy + r)} c ${P(cx - k, cy + r)} ${P(cx - r, cy + k)} ${P(cx - r, cy)} c ${P(cx - r, cy - k)} ${P(cx - k, cy - r)} ${P(cx, cy - r)} c ${P(cx + k, cy - r)} ${P(cx + r, cy - k)} ${P(cx + r, cy)} c ${fin}\n`;
      }
    }
    const idCont = nuevo(`<< /Length ${c.length} >>\nstream\n${c}endstream`);
    paginas.push(nuevo(`<< /Type /Page /Parent ${idPaginas} 0 R /MediaBox [0 0 ${f(HOJA.w)} ${f(HOJA.h)}] /Contents ${idCont} 0 R /Resources << /Font << /F1 ${idF1} 0 R /F2 ${idF2} 0 R >> >> >>`));
  }
  objetos[idCatalogo - 1] = `<< /Type /Catalog /Pages ${idPaginas} 0 R >>`;
  objetos[idPaginas - 1] = `<< /Type /Pages /Kids [${paginas.map((p) => p + ' 0 R').join(' ')}] /Count ${paginas.length} >>`;
  let pdf = '%PDF-1.4\n', pos = [];
  objetos.forEach((o, i) => { pos.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n` + pos.map((p) => String(p).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size ${objetos.length + 1} /Root ${idCatalogo} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return new Blob([bytes], { type: 'application/pdf' });
}

// ---------- DXF R12 ----------
const DXF_CAPA = { visible: ['VISIBLE', 'CONTINUOUS', 7], oculta: ['OCULTA', 'DASHED', 8], eje: ['EJE', 'CENTER', 1], rayado: ['RAYADO', 'CONTINUOUS', 9] };
export function dxfDe({ F, S, L, corte, caja: b }) {
  const dx = b.x1 - b.x0, dy = b.y1 - b.y0, dz = b.z1 - b.z0, sep = 30;
  // Tercer ángulo, 1:1 en mm: frontal en el origen, superior arriba, lateral derecha a la derecha, corte al final.
  const grupos = [[F, -b.x0, -b.y0], [S, -b.x0, dy + sep + b.z1], [L, dx + sep + b.z1, -b.y0], [corte, dx + dz + 2 * sep, -b.y0]];
  const n = (v) => v.toFixed(4);
  let s = '0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n';
  s += '0\nTABLE\n2\nLTYPE\n70\n3\n0\nLTYPE\n2\nCONTINUOUS\n70\n0\n3\nSolida\n72\n65\n73\n0\n40\n0.0\n';
  s += '0\nLTYPE\n2\nDASHED\n70\n0\n3\nOculta\n72\n65\n73\n2\n40\n3.2\n49\n2.0\n49\n-1.2\n';
  s += '0\nLTYPE\n2\nCENTER\n70\n0\n3\nEje\n72\n65\n73\n4\n40\n9.4\n49\n6.0\n49\n-1.2\n49\n1.0\n49\n-1.2\n0\nENDTAB\n';
  s += `0\nTABLE\n2\nLAYER\n70\n${Object.keys(DXF_CAPA).length}\n` + Object.values(DXF_CAPA).map(([nom, lt, col]) => `0\nLAYER\n2\n${nom}\n70\n0\n62\n${col}\n6\n${lt}\n`).join('') + '0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n';
  for (const [ents, ox, oy] of grupos) {
    for (const e of ents) {
      const capa = (DXF_CAPA[e.capa] || DXF_CAPA.visible)[0];
      if (e.t === 'l') s += `0\nLINE\n8\n${capa}\n10\n${n(e.x1 + ox)}\n20\n${n(e.y1 + oy)}\n11\n${n(e.x2 + ox)}\n21\n${n(e.y2 + oy)}\n`;
      else if (e.t === 'c') s += `0\nCIRCLE\n8\n${capa}\n10\n${n(e.cx + ox)}\n20\n${n(e.cy + oy)}\n40\n${n(e.r)}\n`;
      else if (e.t === 'p') s += `0\nPOLYLINE\n8\n${capa}\n66\n1\n70\n${e.cerrada ? 1 : 0}\n` + e.pts.map((p) => `0\nVERTEX\n8\n${capa}\n10\n${n(p[0] + ox)}\n20\n${n(p[1] + oy)}\n`).join('') + `0\nSEQEND\n8\n${capa}\n`;
    }
  }
  return s + '0\nENDSEC\n0\nEOF\n';
}

// ---------- STL binario ----------
export function stlDe(geometrias) {
  const tris = [];
  for (const g0 of geometrias) {
    const g = g0.index ? g0.toNonIndexed() : g0, p = g.attributes.position;
    for (let i = 0; i < p.count; i += 3) tris.push([0, 1, 2].map((j) => [p.getX(i + j), p.getY(i + j), p.getZ(i + j)]));
  }
  const buf = new ArrayBuffer(84 + tris.length * 50), dv = new DataView(buf);
  'Rodilla policentrica 5IV11 - pieza en mm'.split('').forEach((ch, i) => dv.setUint8(i, ch.charCodeAt(0)));
  dv.setUint32(80, tris.length, true);
  let o = 84;
  for (const [a, b, c] of tris) {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let nn = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const L = Math.hypot(...nn) || 1;
    nn = nn.map((x) => x / L);
    for (const x of [...nn, ...a, ...b, ...c]) { dv.setFloat32(o, x, true); o += 4; }
    dv.setUint16(o, 0, true); o += 2;
  }
  return new Blob([buf], { type: 'model/stl' });
}
