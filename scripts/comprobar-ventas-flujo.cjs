// Prueba EN EJECUCIÓN de las ventas de suplementos (v750). Corre el bloque REAL de app-6-extra.js con un DOM y un
// Supabase falsos (scripts/arnes-ventas.cjs). La lanza avi.test.js en un proceso aparte (necesita esperar promesas).
//
// Uso:  node scripts/comprobar-ventas-flujo.cjs [RAIZ]        (RAIZ = carpeta del repo; por defecto, esta)
//       SAB=<sabotaje> node scripts/comprobar-ventas-flujo.cjs    → tiene que salir con error (ver SABOTAJES)
//
// Cubre: (1) sin red, el aviso FINAL en pantalla y lo pendiente en `ax_supl`, en venta, producto, abono, quitar
// abono, archivar y borrar; la franja de pendientes en ficha, «Mis productos» y panel. (2) Hueco S2: todo el
// flujo no toca `DB.clients` ni `clientToRow`. (3) Hueco S6: la venta vieja conserva su precio copiado.
// (4) Detalles de las pantallas D y C.
const fs = require('fs'), path = require('path');
const { crear } = require('./arnes-ventas.cjs');
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const SAB = process.env.SAB || '';

const SABOTAJES = {
  // S2: la ficha cuelga las ventas del asesorado
  'muta-cliente': [["const ventas=suplVentasDe(SUPL.ventas,id);", "const ventas=suplVentasDe(SUPL.ventas,id); const _p=suplPersona(id); if(_p)_p.ventas=ventas.map(v=>({p:v.producto_nombre,precio:v.precio,costo:v.costo}));"]],
  // S6: la ficha muestra el precio VIVO del producto en vez del copiado en la venta
  'precio-vivo': [["const abonado=suplAbonado(v), precio=suplMonto(v.precio), saldo=suplSaldo(v);", "const _pa=SUPL.productos.find(p=>p.id===v.producto_id)||v; const abonado=suplAbonado(v), precio=suplMonto(_pa.precio), saldo=Math.max(0,precio-abonado);"]],
  // Bug de la v748: suplEscribir avisa y quien la llama avisa después; gana el último
  'toast-pisado': [
    ["  return ok;   // quien llama decide el aviso", "  if(!ok)toast('⚠️ No se guardó en la nube (sin conexión).',5200); return ok;   // quien llama decide el aviso"],
    ["_suplAviso(ok,'Venta guardada')", "toast('Venta guardada')"],
    ["_suplAviso(ok,previo?'Producto actualizado':'Producto guardado')", "toast(previo?'Producto actualizado':'Producto guardado')"],
    ["_suplAviso(ok,val.saldoDespues===0?'Abono guardado: venta saldada':'Abono guardado')", "toast(val.saldoDespues===0?'Abono guardado: venta saldada':'Abono guardado')"],
  ],
  // La franja de pendientes solo en la ficha (como la v748)
  'franja-solo-ficha': [["let h=_suplFranja();\n  if(total>0){", "let h='';\n  if(total>0){"], ["  let h=_suplFranja();\n  if(!act.length", "  let h='';\n  if(!act.length"]],
};
const sabotajes = SAB ? (SABOTAJES[SAB] || (() => { throw new Error('sabotaje desconocido: ' + SAB); })()) : [];

const PEND = 'Guardado en el celular; se sube cuando vuelva la señal';
const dia = 86400000, ahora = Date.now(), iso = d => new Date(d).toISOString();
const clientes = [
  { id: 'c1', name: 'Mariana', age: 34, payments: [{ date: iso(ahora - 12 * dia), dueDate: iso(ahora + 18 * dia), amount: 150000, note: '' }], routines: [{ id: 'r1', name: 'A', exercises: [] }] },
  { id: 'c2', name: 'Sofía', age: 17, payments: [{ date: iso(ahora - 40 * dia), dueDate: iso(ahora - 10 * dia), amount: 150000, note: '' }], routines: [] },
];
const fallas = [];
const ok = (cond, msg) => { if (!cond) fallas.push(msg); };

(async () => {
  const H = crear(ROOT, { clients: clientes, sabotajes });
  const { ctx, el, net, cloud, toasts, core } = H;
  const antesJSON = JSON.stringify(ctx.DB.clients);
  const filas = () => ctx.DB.clients.map(c => JSON.stringify(core.clientToRow(c, { coachId: H.COACH })));
  const antesFilas = filas();
  const antesEstado = ctx.DB.clients.map(c => core.MS.getStatus(c, new Date(ahora)));
  await ctx.suplCargar();

  // Cada acción debe dejar UN solo aviso, y que sea el que corresponde.
  const accion = async (nombre, fn, esperado) => {
    toasts.length = 0; await fn();
    ok(toasts.length === 1, nombre + ': tiene que lanzar UN solo aviso y lanzó ' + toasts.length + ' → ' + JSON.stringify(toasts));
    ok(el('toast').textContent === esperado, nombre + ': el texto que QUEDA en pantalla es «' + el('toast').textContent + '», debía ser «' + esperado + '»');
  };
  const nuevoProd = async (nombre, cat, precio, costo) => {
    ctx.suplAbrirProducto(); el('pr-nombre').value = nombre; el('pr-cat').value = cat; ctx.suplProductoCatCambio();
    el('pr-precio').value = precio; el('pr-costo').value = costo; await ctx.suplGuardarProducto();
    return ctx.__SUPL.productos.find(p => p.nombre === nombre);
  };
  const vender = async (cid, prod, cuotas, fecha, abono1) => {
    ctx.CUR.clientId = cid; ctx.suplOpenVenta(cid); ctx.suplVentaElegir(prod.id); ctx.suplVentaCuotas(cuotas);
    el('vt-fecha').value = fecha; el('vt-abono1').value = abono1 || '';
    await ctx.suplGuardarVenta(); return ctx.__SUPL.ventas[ctx.__SUPL.ventas.length - 1];
  };
  const franja = (html) => /aún no se guardan en la nube/.test(html);

  // ── CON RED: cada acción avisa su éxito y no deja nada pendiente ──
  let prot, cre, v1, v2;
  await accion('producto (con red)', async () => { prot = await nuevoProd('Proteína 2 lb', 'proteina', '150.000', '105.000'); }, 'Producto guardado');
  cre = await nuevoProd('Creatina 300 g', 'creatina', '80.000', '55.000');
  await accion('venta (con red)', async () => { v1 = await vender('c1', prot, 3, '2026-11-10', '50.000'); }, 'Venta guardada');
  await accion('abono (con red)', async () => { ctx.suplOpenAbono(v1.id); el('ab-monto').value = '50.000'; el('ab-fecha').value = '2026-11-12'; await ctx.suplGuardarAbono(); }, 'Abono guardado');
  ok(!Object.keys(ctx.__SUPL.pend.coach_ventas).length && !Object.keys(ctx.__SUPL.pend.coach_productos).length, 'con red no queda nada pendiente');
  ok(cloud.coach_ventas[v1.id] && cloud.coach_ventas[v1.id].abonos.length === 2, 'con red la venta con sus 2 abonos está en la nube');

  // ── S6: subir el precio del producto NO cambia la venta vieja en la ficha ──
  ctx.suplAbrirProducto(prot.id); el('pr-precio').value = '180.000'; el('pr-costo').value = '120.000'; await ctx.suplGuardarProducto();
  el('d-ventas'); ctx.suplRenderFicha('c1'); const f = el('d-ventas').innerHTML;
  ok(/\$150\.000 · 3 cuotas/.test(f), 'S6: la venta vieja tiene que seguir mostrando $150.000 · 3 cuotas');
  ok(!/\$180\.000/.test(f), 'S6: la ficha muestra el precio VIVO del producto ($180.000)');
  ok(/Saldo<br>\$50\.000/.test(f), 'S6: el saldo de la venta vieja tiene que seguir en $50.000 (150.000 − 100.000)');
  ok(/Costo \$105\.000 · Ganancia <b>\$45\.000/.test(f), 'S6: costo y ganancia siguen los copiados (105.000 / 45.000)');

  // ── D: singular y plural; «Quién te debe» con las cuotas, como la maqueta ──
  v2 = await vender('c2', cre, 1, '2026-11-11', '');
  await vender('c2', cre, 1, '2026-11-12', '');
  const stat = (ic, l, v) => '<stat l="' + l + '" v="' + v + '">'; const empty = (i, t) => '<empty>' + t + '</empty>';
  const ing = ctx.suplIngresosHTML(stat, empty);
  ok(/Proteína 2 lb<\/div><div class="crep-meta">1 vendido · margen/.test(ing), 'D: «1 vendido» en singular: ' + (ing.match(/Proteína 2 lb<\/div><div class="crep-meta">[^<]*/) || [''])[0]);
  ok(/Creatina 300 g<\/div><div class="crep-meta">2 vendidos · margen/.test(ing), 'D: «2 vendidos» en plural: ' + (ing.match(/Creatina 300 g<\/div><div class="crep-meta">[^<]*/) || [''])[0]);
  ok(/Proteína 2 lb · 3 cuotas · abonó \$100\.000 de \$150\.000/.test(ing), 'D: «Quién te debe» tiene que decir «Proteína 2 lb · 3 cuotas · abonó $100.000 de $150.000»: ' + (ing.match(/Proteína 2 lb[^<]*abonó[^<]*/) || ['(no está)'])[0]);
  ok(/2 productos · abonó \$0 de \$160\.000/.test(ing) && !/2 productos · \d+ cuotas/.test(ing), 'D: con varias ventas se dice «2 productos» sin inventar cuotas');
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  const regla = (css.match(/\.vt-hist\{[^}]*\}/) || [''])[0];
  ok(/display:flex/.test(regla) && /align-items:center/.test(regla), 'C: la fila de abonos (.vt-hist) tiene que alinear al centro el «Quitar»: ' + regla);

  // ── SIN RED: un solo aviso, el correcto, y todo queda pendiente en el teléfono ──
  net.on = false;
  let pOff, vOff;
  await accion('producto (sin red)', async () => { pOff = await nuevoProd('Omega 3', 'omega3', '65.000', '42.000'); }, PEND);
  await accion('venta (sin red)', async () => { vOff = await vender('c1', cre, 2, '2026-11-14', ''); }, PEND);
  await accion('abono (sin red)', async () => { ctx.suplOpenAbono(vOff.id); el('ab-monto').value = '40.000'; await ctx.suplGuardarAbono(); }, PEND);
  const abId = ctx.__SUPL.ventas.find(v => v.id === vOff.id).abonos[0].id;
  await accion('quitar abono (sin red)', async () => { ctx.suplOpenAbono(vOff.id); await ctx.suplQuitarAbono(abId); }, PEND);
  await accion('archivar (sin red)', async () => { ctx.suplAbrirProducto(pOff.id); await ctx.suplArchivarProducto(); }, PEND);
  await accion('borrar venta (sin red)', async () => { ctx.suplOpenAbono(vOff.id); await ctx.suplBorrarVenta(); }, PEND);
  const loc = JSON.parse(H.store.ax_supl);
  ok(loc.pend.coach_ventas[vOff.id] === true && loc.v.some(v => v.id === vOff.id && v.borrado === true), 'sin red: la venta (ya con lápida) y su marca de pendiente están en ax_supl');
  ok(loc.pend.coach_productos[pOff.id] === true && loc.p.some(p => p.id === pOff.id && p.activo === false), 'sin red: el producto (ya archivado) y su marca de pendiente están en ax_supl');
  ok(!cloud.coach_ventas[vOff.id] && !cloud.coach_productos[pOff.id], 'sin red: nada llegó a la nube');
  // la franja de pendientes en las TRES pantallas
  ctx.suplRenderFicha('c1'); ok(franja(el('d-ventas').innerHTML), 'franja de pendientes en la ficha');
  el('p-productos').classList.add('on'); ctx.suplRenderProductos(); ok(franja(el('pr-list').innerHTML), 'franja de pendientes en «Mis productos»');
  ctx.suplRenderHome(); ok(franja(el('h-supl').innerHTML), 'franja de pendientes en la tarjeta del panel');
  // vuelve la señal: se sube, avisa y la franja se va
  toasts.length = 0; net.on = true; await H.disparar('online');
  ok(cloud.coach_ventas[vOff.id] && cloud.coach_productos[pOff.id] && !Object.keys(ctx.__SUPL.pend.coach_ventas).length && !Object.keys(ctx.__SUPL.pend.coach_productos).length, 'al volver la señal se sube todo lo pendiente');
  ok(toasts.includes('✅ Las ventas pendientes ya se guardaron'), 'al volver la señal avisa que ya se guardó');
  ok(!franja(el('d-ventas').innerHTML) && !franja(el('pr-list').innerHTML) && !franja(el('h-supl').innerHTML), 'al volver la señal la franja desaparece de las tres pantallas');

  // ── S2: todo el flujo no tocó a ningún asesorado ──
  ok(JSON.stringify(ctx.DB.clients) === antesJSON, 'S2: DB.clients cambió durante el flujo de ventas (ficha, catálogo, abonos, editar, archivar, borrar)');
  const despues = filas();
  ok(despues.every((x, i) => x === antesFilas[i]), 'S2: clientToRow de algún asesorado cambió');
  ok(despues.every(x => !/ventas|productos|precio|costo|abonos|Proteína|Creatina|Omega/.test(x)), 'S2: la fila de un asesorado lleva datos de ventas');
  ok(JSON.stringify(ctx.DB.clients.map(c => core.MS.getStatus(c, new Date(ahora)))) === JSON.stringify(antesEstado), 'S2: cambió el estado de membresía');
  ok(ctx.DB.clients.every(c => !('ventas' in c) && !('productos' in c)), 'S2: algún asesorado tiene la propiedad ventas/productos');

  if (fallas.length) { console.error('FALLA (' + fallas.length + ')' + (SAB ? ' [sabotaje ' + SAB + ']' : '') + ':\n - ' + fallas.join('\n - ')); process.exit(1); }
  console.log('OK');
})().catch(e => { console.error('ERROR', e && e.stack); process.exit(2); });
