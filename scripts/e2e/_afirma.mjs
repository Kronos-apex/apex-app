// _afirma.mjs — DIENTES COMPARTIDOS PARA LOS HARNESSES DE CAPTURA (F5, 2026-07-28).
//
// POR QUÉ EXISTE: durante v403 la app tuvo la pestaña «Perfil» ROTA en producción un día entero
// mientras el harness que la abría seguía generando PNG tan tranquilo — capturaba una pantalla
// muerta y salía con código 0. Diez harnesses `_shot*` estaban en esa situación: hacían la foto,
// imprimían la ruta y terminaban en éxito PASARA LO QUE PASARA.
//
// LA REGLA (adoptada en la auditoría FASE 2): un harness que abre una pantalla tiene que EXIGIR
// que arranque. Este módulo es esa exigencia, en un solo sitio, para no reescribirla diez veces
// ni que cada una se despiste distinto.
//
// USO en un harness existente (3 líneas):
//   import { afirmador, afirmaPantalla, salir } from './_afirma.mjs';
//   const A = afirmador('rutinas del asesorado');
//   ws.on('message', ...)  →  añade dentro:  A.verError(m);
//   ...tras el setup:      await afirmaPantalla(ev, A, { nombre:'claro', sel:'#cn-routines' });
//   al final:              salir(A, { chrome, srv, out: OUT });   // exit 1 si algo falló

import { statSync } from 'node:fs';

export function afirmador(nombre) {
  const A = { nombre, fallos: [], jsErrors: [] };
  A.ok = (cond, msg, extra) => {
    console.log(`  ${cond ? '✅' : '❌'} ${msg}${!cond && extra !== undefined ? '  → ' + JSON.stringify(extra) : ''}`);
    if (!cond) A.fallos.push(msg);
    return !!cond;
  };
  // Se llama desde el ws.on('message') del harness. Los errores de la CONSOLA no cuentan (hay
  // ruido de red en local); los que cuentan son las excepciones no capturadas, que son las que
  // dejan una pantalla a medio pintar.
  A.verError = m => {
    if (m && m.method === 'Runtime.exceptionThrown') {
      const d = m.params && m.params.exceptionDetails;
      A.jsErrors.push((d && d.exception && d.exception.description) || (d && d.text) || 'exception');
    }
  };
  return A;
}

// Sonda de una pantalla: ¿existe, está visible, pintó algo y cabe en el teléfono?
// `sel` puede ser una lista separada por comas: se usa el PRIMERO que exista.
const SONDA = (sel, ancho) => `(()=>{try{
  const sels=${JSON.stringify(sel)}.split(',').map(s=>s.trim()).filter(Boolean);
  let el=null; for(const s of sels){ const e=document.querySelector(s); if(e){el=e;break;} }
  if(!el) return {existe:false};
  const r=el.getBoundingClientRect(), cs=getComputedStyle(el);
  return {existe:true,
    visible: cs.display!=='none' && cs.visibility!=='hidden' && r.width>0 && r.height>0,
    txt: (el.innerText||'').replace(/\\s+/g,' ').trim().length,
    alto: Math.round(el.scrollHeight||r.height),
    anchoDoc: document.documentElement.scrollWidth,
    ancho: ${ancho}};
}catch(e){return {existe:false,error:String(e&&e.message||e)}}})()`;

// Afirma que la pantalla ARRANCÓ. Es el mínimo que le faltaba a los `_shot*`.
export async function afirmaPantalla(ev, A, { nombre, sel, minTxt = 40, ancho = 390, setup } = {}) {
  if (setup !== undefined) {
    A.ok(setup === true || setup === 'ok' || setup === 1,
      `${nombre}: el montaje no devolvió error`, setup);
  }
  const s = await ev(SONDA(sel, ancho));
  A.ok(!!(s && s.existe), `${nombre}: la pantalla existe en el DOM (${sel})`, s);
  if (!s || !s.existe) return s;
  A.ok(s.visible, `${nombre}: la pantalla está visible`, s);
  A.ok(s.txt >= minTxt, `${nombre}: pintó contenido real (${s.txt} caracteres ≥ ${minTxt})`, s);
  A.ok(s.anchoDoc <= ancho, `${nombre}: no se sale del ancho de ${ancho}px (mide ${s.anchoDoc})`, s);
  return s;
}

// Afirma que el PNG que se acaba de escribir no es una imagen vacía. Un archivo de 2 KB a
// 390px de ancho es una pantalla en blanco: la foto existe y no prueba nada.
export function afirmaCaptura(A, ruta, minKB = 8) {
  let kb = 0;
  try { kb = Math.round(statSync(ruta).size / 1024); } catch { kb = 0; }
  A.ok(kb >= minKB, `captura ${ruta.split(/[\\/]/).pop()} tiene contenido (${kb} KB ≥ ${minKB})`, kb);
  return kb;
}

// Veredicto + salida. SIN esto los harnesses terminaban siempre en 0.
export function salir(A, { chrome, srv, out } = {}) {
  if (A.jsErrors.length) {
    A.fallos.push('errores JS sueltos');
    console.log('  ❌ errores JS:', A.jsErrors.slice(0, 3));
  } else {
    console.log('  ✅ sin errores JS sueltos');
  }
  console.log(A.fallos.length
    ? `\n❌ ${A.nombre}: ${A.fallos.length} fallo(s) — ${A.fallos.join(' · ')}`
    : `\n✅ ${A.nombre} OK`);
  if (out) console.log('  capturas en:', out);
  try { chrome && chrome.kill(); } catch {}
  try { srv && srv.kill(); } catch {}
  process.exit(A.fallos.length ? 1 : 0);
}
