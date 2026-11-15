// Carrera de la primera carga (v750): se guarda una venta MIENTRAS la primera carga desde la nube va en camino.
// Antes la nube (una foto anterior) ganaba y la venta desaparecía de la ficha y de `ax_supl`.
// Uso: node scripts/comprobar-ventas-carrera.cjs [RAIZ]   ·   SAB=mezcla-nube → tiene que salir con error.
const path = require('path');
const { crear } = require('./arnes-ventas.cjs');
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const SAB = process.env.SAB || '';
const sabotajes = SAB === 'mezcla-nube' ? [["_suplMezcla(rv.data,SUPL.ventas,_suplProtegidas(SUPL_T_VENT))", "_suplMezcla(rv.data,SUPL.ventas,SUPL.pend[SUPL_T_VENT])"]] : [];
const prod = { id: 'p1', nombre: 'Creatina 300 g', categoria: 'creatina', precio: 80000, costo: 55000, no_menores: false, activo: true };
const fallas = [];
const ok = (c, m) => { if (!c) fallas.push(m); };
async function caso(esperarAntes) {
  const H = crear(ROOT, { clients: [{ id: 'c1', name: 'Mariana', age: 30 }], selectDelay: 300, sabotajes,
    cloud: { coach_productos: [prod], coach_ventas: [] } });
  const { ctx, el } = H;
  ctx.__SUPL.productos.push(Object.assign({}, prod));
  const carga = ctx.suplCargar();
  if (esperarAntes) await carga;      // CONTROL: sin carrera nada se pierde, con o sin el arreglo
  ctx.CUR.clientId = 'c1'; ctx.suplOpenVenta('c1'); ctx.suplVentaElegir('p1'); el('vt-fecha').value = '2026-11-14';
  await ctx.suplGuardarVenta();
  const id = ctx.__SUPL.ventas[0] && ctx.__SUPL.ventas[0].id;
  await carga;
  ctx.suplRenderFicha('c1');
  return { id, mem: ctx.__SUPL.ventas.some(v => v.id === id), ls: JSON.parse(H.store.ax_supl).v.some(v => v.id === id), nube: !!H.cloud.coach_ventas[id], ficha: !/Aún no le has vendido nada/.test(el('d-ventas').innerHTML) };
}
(async () => {
  const c = await caso(true);
  ok(c.mem && c.ls && c.nube && c.ficha, 'CONTROL (sin carrera) tiene que conservar la venta: ' + JSON.stringify(c));
  const r = await caso(false);
  ok(r.mem, 'la venta guardada durante la carga desapareció de la memoria');
  ok(r.ls, 'la venta desapareció de ax_supl');
  ok(r.ficha, 'la ficha dice «Aún no le has vendido nada» con una venta guardada');
  ok(r.nube, 'la venta no está en la nube');
  if (fallas.length) { console.error('FALLA (' + fallas.length + ')' + (SAB ? ' [sabotaje ' + SAB + ']' : '') + ':\n - ' + fallas.join('\n - ')); process.exit(1); }
  console.log('OK');
})().catch(e => { console.error('ERROR', e && e.stack); process.exit(2); });
