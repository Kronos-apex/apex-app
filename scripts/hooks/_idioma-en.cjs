// Precarga del pre-commit: hace que Node se comporte como el runner de CI (idioma INGLÉS).
//
// 🔴 Por qué existe (v638): CI estuvo en rojo desde v628 y aquí todo salía verde. Un test calculaba
// lo esperado con `(4320).toLocaleString()`: en esta máquina (Windows en es-CO) da «4.320» y en el
// runner de GitHub (Linux en inglés) «4,320». En Windows, Node toma el idioma del SISTEMA y no hace
// caso a LANG/LC_ALL, así que no hay variable de entorno que lo simule: se fuerza aquí el idioma
// por defecto de las APIs que formatean cuando nadie les pasa uno.
'use strict';
const EN = 'en-US';
const envolver = (proto, nombre) => {
  const orig = proto[nombre];
  proto[nombre] = function (locales, ...resto) { return orig.call(this, locales === undefined ? EN : locales, ...resto); };
};
envolver(Number.prototype, 'toLocaleString');
envolver(Date.prototype, 'toLocaleString');
envolver(Date.prototype, 'toLocaleDateString');
envolver(Date.prototype, 'toLocaleTimeString');
for (const C of ['NumberFormat', 'DateTimeFormat']) {
  const Orig = Intl[C];
  const Nuevo = function (locales, opts) { return new Orig(locales === undefined ? EN : locales, opts); };
  Nuevo.prototype = Orig.prototype;
  Nuevo.supportedLocalesOf = Orig.supportedLocalesOf;
  Intl[C] = Nuevo;
}
