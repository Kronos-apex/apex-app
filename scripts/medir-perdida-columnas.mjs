// ¿LA CLASE QUE CERRÓ v623 TIENE VÍCTIMAS REALES EN LAS 7 COLECCIONES QUE QUEDAN?
//
// v623 cerró que una escritura pisara `profile`/`routines` con la copia en memoria de un aparato
// abierto. Medido el 17-sep, la misma vía sigue sin fusionar en: history · prs · bodyweight ·
// medidas · nutrition · photos · msgs. Antes de tocar nada hay que saber **a quién le pasó**.
//
// LA SEÑAL: un elemento que está un día y al siguiente NO, **sin su lápida**. Un borrado normal
// deja lápida (v566/v568/v614) o es una poda; lo que desaparece sin ninguna de las dos es lo que
// se pisó.
//
// ⚠️ LÍMITE HONESTO, el mismo de v623: hay UN respaldo por día, así que esto **no puede ver lo
//    que se pisa y se vuelve a escribir dentro del mismo día**. Un cero acota el daño, no lo
//    descarta.
// 🔒 CONTROL DE COBERTURA: se cuenta cuántos elementos NUEVOS vio la sonda. Si no ve altas, no
//    está leyendo nada y sus ceros no valen (un gate que no puede fallar no es un gate).
//
// Corre: node scripts/medir-perdida-columnas.mjs
import { readdirSync, readFileSync } from 'node:fs';

const DIR = 'C:/Users/KRONOS/Desktop/AVI/backups';
const archivos = readdirSync(DIR).filter(f => /^avi-backup-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
if (archivos.length < 2) { console.error('hacen falta al menos 2 respaldos'); process.exit(1); }

// Cómo se identifica un elemento en cada colección, dónde vive su lápida y — 🔒 CLAVE — DESDE
// CUÁNDO existe esa lápida. Sin esta fecha la sonda miente: un borrado legítimo de julio, hecho
// cuando el mecanismo de lápida todavía no existía, se ve exactamente igual que una pérdida.
// (Primera corrida: 45 «hallazgos» y casi todos eran esto.)
const COLS = {
  history:    { tipo: 'lista', id: s => s && (s.id || s.date), tope: 365, desde: null },
  prs:        { tipo: 'mapa',  lapida: (fila, k) => !!((fila.profile || {}).prTombs || {})[k],
                desde: '2026-09-16' },   // v620
  bodyweight: { tipo: 'lista', id: e => e && e.date, lapidaEn: 'del', desde: '2026-09-15' },  // v614
  medidas:    { tipo: 'lista', id: e => e && (e.id || e.date), lapidaEn: 'del', desde: '2026-09-03' },  // v566
  photos:     { tipo: 'lista', id: e => e && (e.id || e.url || e.date), lapidaEn: 'del', desde: '2026-09-03' },  // v568
  msgs:       { tipo: 'lista', id: m => m && [m.from, m.date, (m.text || '').slice(0, 40)].join('|'), desde: null },
  nutrition:  { tipo: 'opaco', desde: null },   // es un plan, no una lista: se mira si se VACIÓ
};

const lista = v => Array.isArray(v) ? v : [];
const clavesVivas = (v, c) => {
  const set = new Map();
  lista(v).forEach(e => {
    if (!e || typeof e !== 'object') return;
    if (c.lapidaEn && e[c.lapidaEn]) return;          // una lápida no es un elemento vivo
    // 🔒 NORMALIZAR la clave: v566/v567 le ASIGNÓ id a las entradas viejas (`2026-06-30T…` pasó a
    //    `d:2026-06-30T…`) y sin esto la sonda lee ese cambio de identidad como una PÉRDIDA —
    //    fueron 5 de los 6 hallazgos de la primera corrida, todos falsos.
    const k0 = c.id(e); if (k0 == null) return;
    set.set(String(k0).replace(/^[a-z]:/, ''), e);
  });
  return set;
};

const hallazgos = [];
const saltados = {};
let pares = 0, altasVistas = 0, filasVistas = 0;
const porCol = Object.fromEntries(Object.keys(COLS).map(k => [k, { perdidos: 0, altas: 0, personas: new Set() }]));

for (let i = 1; i < archivos.length; i++) {
  const A = JSON.parse(readFileSync(DIR + '/' + archivos[i - 1], 'utf8'));
  const B = JSON.parse(readFileSync(DIR + '/' + archivos[i], 'utf8'));
  const mapa = f => new Map((f.user_data || []).map(r => [r.user_id, r]));
  const dia = archivos[i].replace('avi-backup-', '').replace('.json', '');
  const ma = mapa(A), mb = mapa(B);
  pares++;
  for (const [uid, a] of ma) {
    const b = mb.get(uid); if (!b) continue;           // la fila ya no está: no es este defecto
    filasVistas++;
    const quien = ((a.profile || {}).name || uid).split(' ')[0];
    for (const [col, c] of Object.entries(COLS)) {
      // 🔒 Antes de que existiera su lápida, un borrado legítimo se ve igual que una pérdida.
      if (c.desde && dia < c.desde) { saltados[col] = (saltados[col] || 0) + 1; continue; }
      if (c.tipo === 'opaco') {
        const va = a[col], vb = b[col];
        const tenia = va && typeof va === 'object' && Object.keys(va).length;
        const tiene = vb && typeof vb === 'object' && Object.keys(vb).length;
        if (tenia && !tiene) { porCol[col].perdidos++; porCol[col].personas.add(quien);
          hallazgos.push({ col, quien, que: 'el plan entero se vació', dia }); }
        continue;
      }
      if (c.tipo === 'mapa') {
        const va = a[col] || {}, vb = b[col] || {};
        Object.keys(vb).forEach(k => { if (!(k in va)) { porCol[col].altas++; altasVistas++; } });
        Object.keys(va).forEach(k => {
          if (k in vb) return;
          if (c.lapida && c.lapida(b, k)) return;      // el coach lo borró: es una lápida, no una pérdida
          porCol[col].perdidos++; porCol[col].personas.add(quien);
          hallazgos.push({ col, quien, que: 'récord ' + k, dia });
        });
        continue;
      }
      const va = clavesVivas(a[col], c), vb = clavesVivas(b[col], c);
      vb.forEach((_, k) => { if (!va.has(k)) { porCol[col].altas++; altasVistas++; } });
      // Si la colección está en su tope, lo que sale por abajo es PODA, no pérdida.
      const podando = c.tope && lista(b[col]).length >= c.tope;
      if (podando) continue;
      va.forEach((_, k) => {
        if (vb.has(k)) return;
        // ¿quedó como lápida? (borrado legítimo)
        const enLapida = lista(b[col]).some(e => e && c.lapidaEn && e[c.lapidaEn] && String(c.id(e)).replace(/^[a-z]:/, '') === k);
        if (enLapida) return;
        porCol[col].perdidos++; porCol[col].personas.add(quien);
        hallazgos.push({ col, quien, que: k.slice(0, 48), dia });
      });
    }
  }
}

console.log(`\n📊 ${archivos.length} respaldos · ${pares} pares de días · ${filasVistas} filas comparadas`);
console.log(`🔒 CONTROL DE COBERTURA: ${altasVistas} elementos NUEVOS vistos ` +
  (altasVistas > 50 ? '→ la sonda sí lee los cambios' : '→ 🔴 SOSPECHOSO: la sonda casi no ve movimiento, sus ceros no valen'));
console.log('\n| colección  | desaparecidos sin lápida | personas |');
console.log('|------------|--------------------------|----------|');
for (const [col, r] of Object.entries(porCol)) {
  console.log(`| ${col.padEnd(10)} | ${String(r.perdidos).padStart(24)} | ${[...r.personas].join(', ') || '—'}`);
}
if (hallazgos.length) {
  console.log('\nCasos:');
  hallazgos.filter(h=>h.col!==(process.argv[2]||'')).forEach(h => console.log(`  ${h.dia}  ${h.col.padEnd(10)} ${h.quien.padEnd(12)} ${h.que}`));

} else {
  console.log('\n✅ Ni un elemento desaparecido sin lápida en toda la ventana.');
}
console.log('\n⚠️  Un respaldo por día NO ve lo que se pisa dentro del mismo día: esto ACOTA el daño, no lo descarta.');
