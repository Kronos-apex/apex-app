// Prueba de las ventas de suplementos SIN RED (v748). La corre avi.test.js en un proceso aparte:
// el arnés de la suite es síncrono y esto necesita esperar promesas.
const assert = require('assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const core = require('../avi-core.js');
const extra = fs.readFileSync(path.join(__dirname, '..', 'app-6-extra.js'), 'utf8');
const ini = extra.indexOf('// VENTAS DE SUPLEMENTOS (v748) — pantallas y escritura');
assert.ok(ini > 0, 'no se encontró el bloque de ventas');
(async () => {
  const code = extra.slice(ini);
  const guardados = {}, toasts = [];
  const ctx = Object.assign({}, core, {
    warn() {}, toast(m) { toasts.push(m); }, ld: (k, d) => (guardados[k] ? JSON.parse(guardados[k]) : d),
    window: { addEventListener() {}, AVI_ALLOW_CLOUD_WRITE: false }, location: { hostname: 'app.avientrena.com' },
    localStorage: { setItem: (k, v) => { guardados[k] = v; }, getItem: k => guardados[k] || null },
    AUTH: { client: () => ({ from: () => ({ upsert: async () => ({ error: { message: 'Failed to fetch' } }) }) }), getUser: async () => ({ id: 'coach-uid' }) },
    DB: { clients: [] }, CUR: {}, document: { getElementById: () => null }, console,
  });
  vm.createContext(ctx);
  vm.runInContext(code + '\nthis.__SUPL=SUPL; this.__esc=suplEscribir;', ctx);
  const fila = { id: 'v1', client_id: 'c1', producto_nombre: 'X', precio: 10, costo: 5, cuotas: 1, fecha: '2026-11-14', abonos: [], borrado: false };
  const ok = await ctx.__esc('coach_ventas', fila);
  assert.strictEqual(ok, false, '🔴 dijo que guardó sin red');
  assert.ok(toasts.some(t => /No se guardó/.test(t)), '🔴 falló en silencio: ' + JSON.stringify(toasts));
  assert.ok(ctx.__SUPL.pend.coach_ventas.v1, '🔴 la fila no quedó marcada como pendiente');
  const local = JSON.parse(guardados.ax_supl);
  assert.strictEqual(local.v.length, 1, '🔴 la venta no quedó en el teléfono');
  assert.ok(local.pend.coach_ventas.v1);
  // CONTROL: con red la fila sale de la cola y no hay aviso
  toasts.length = 0;
  ctx.AUTH.client = () => ({ from: () => ({ upsert: async () => ({ error: null }) }) });
  assert.strictEqual(await ctx.__esc('coach_ventas', Object.assign({}, fila)), true);
  assert.ok(!ctx.__SUPL.pend.coach_ventas.v1 && toasts.length === 0, 'con red debía quedar limpia y sin aviso');

  console.log('OK');
})().catch(e => { console.error(e.message); process.exit(1); });
