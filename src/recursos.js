// Archivos originales del equipo incrustados en la página (solo en el navegador; Vite los mete en el HTML).
// Los STL se usan tal cual: se decodifican los bytes del archivo y Three.js los lee sin modificar vértices.
const stl = import.meta.glob('../ESTUDIOS y STL/STL Rodilla*/*.STL', { query: '?inline', import: 'default', eager: true });
const jpg = import.meta.glob('../ESTUDIOS y STL/*/*.jpg', { query: '?inline', import: 'default', eager: true });

const porNombre = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k.split('ESTUDIOS y STL/')[1], v]));
const STL = porNombre(stl), JPG = porNombre(jpg);

export function bytesSTL(archivo) {
  const url = STL[archivo]; // ruta dentro de 'ESTUDIOS y STL/', p. ej. 'STL Rodilla/Ensamblaje1 - AFS1-1.STL'
  if (!url) return null;
  const b64 = url.slice(url.indexOf(',') + 1), bin = atob(b64), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8.buffer;
}
export const imagenEstudio = (ruta) => JPG[ruta] || '';
