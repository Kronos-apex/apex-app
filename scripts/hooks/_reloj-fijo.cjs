// Precarga de pruebas: fija el reloj (`new Date()` y `Date.now()`) en AVI_AHORA (milisegundos desde la época).
//
// 🔴 Por qué existe (v757, CI rojo del 24-nov): un arnés armaba un pedido «de hace 26 h» y esperaba que dijera «Ayer».
// Eso solo vale si la hora local es de las 02:00 en adelante; CI corrió a las 00:31 UTC y el pedido cayó anteayer
// («22 de noviembre»). Una prueba que depende de «ahora» solo falla en SU franja del día, y a mano nadie la prueba a esa
// hora. Con esta precarga la prueba se corre A PROPÓSITO en la franja mala (y en una buena, de control).
// Uso: AVI_AHORA=<ms> node --require scripts/hooks/_reloj-fijo.cjs <script>
'use strict';
const FIJO = Number(process.env.AVI_AHORA);
if (Number.isFinite(FIJO) && FIJO > 0) {
  const Real = Date;
  class DateFijo extends Real {
    constructor(...a) { if (a.length === 0) super(FIJO); else super(...a); }
    static now() { return FIJO; }
  }
  global.Date = DateFijo;
}
