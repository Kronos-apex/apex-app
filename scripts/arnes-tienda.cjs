// Arnés de la tienda de suplementos (v756): corre el bloque REAL de app-6-extra.js (ventas + tienda) con un DOM y un
// Supabase falsos, y le pone un SERVIDOR FALSO que imita las funciones `tienda_*` (el SQL real lo prueba
// scripts/sql/probar-tienda.sql). Lo usa scripts/comprobar-tienda-flujo.cjs (la suite lo lanza en un proceso aparte).
const path = require('path');
const { crear: crearBase } = require('./arnes-ventas.cjs');

const FALTA = n => ({ data: null, error: { message: 'Could not find the function public.' + n + ' in the schema cache', code: 'PGRST202' } });

// `S` = el estado del servidor falso. Cada prueba lo arma y lo mira después.
function servidorFalso(S) {
  let n = 0;
  const ahora = () => new Date().toISOString();
  return (nombre, args, cloud) => {
    if (S.sinFunciones) return FALTA(nombre);
    if (S.falla && S.falla[nombre]) return { data: null, error: { message: S.falla[nombre] } };   // el código corto, como el SQL real
    const ped = id => Object.values(cloud.tienda_pedidos).find(p => p.id === id);
    if (nombre === 'tienda_catalogo') return { data: S.catalogo, error: null };
    if (nombre === 'tienda_pedir') {
      const p = S.catalogo.find(x => x.id === args.p_producto);
      if (!p) return { data: null, error: { message: 'no_disponible' } };
      // 🔒 el precio sale del catálogo del servidor: el teléfono no lo manda
      const row = { id: 'ped-' + (++n), coach_id: 'coach', client_uid: S.uid, client_id: S.uid, client_nombre: S.nombre, producto_id: p.id, producto_nombre: p.nombre, precio_unit: p.precio, cantidad: args.p_cantidad, estado: 'pendiente', cancelado_por: null, venta_id: null, creado: ahora(), resuelto: null };
      cloud.tienda_pedidos[row.id] = row;
      return { data: JSON.parse(JSON.stringify(row)), error: null };
    }
    if (nombre === 'tienda_cancelar') {
      const p = ped(args.p_pedido);
      if (!p || p.estado !== 'pendiente') return { data: null, error: { message: 'no_disponible' } };
      p.estado = 'cancelado'; p.cancelado_por = S.rol === 'coach' ? 'coach' : 'asesorado'; p.resuelto = ahora();
      return { data: JSON.parse(JSON.stringify(p)), error: null };
    }
    if (nombre === 'tienda_entregar') {
      const p = ped(args.p_pedido);
      if (!p || p.estado !== 'pendiente') return { data: null, error: { message: 'no_disponible' } };
      const cuotas = args.p_cuotas || 1, total = p.precio_unit * p.cantidad;
      const abono = cuotas === 1 && args.p_abono == null ? total : Math.min(total, args.p_abono || 0);
      const venta = { id: 'ven-' + (++n), coach_id: 'coach', client_id: p.client_id, producto_id: p.producto_id, producto_nombre: p.producto_nombre, precio: total, costo: (S.costos[p.producto_id] || 0) * p.cantidad, cuotas, fecha: '2026-11-22', abonos: abono > 0 ? [{ id: 'ab-' + n, monto: abono, fecha: '2026-11-22' }] : [], borrado: false, cantidad: p.cantidad, pedido_id: p.id, creado: ahora(), actualizado: ahora() };
      p.estado = 'entregado'; p.venta_id = venta.id; p.resuelto = ahora();
      const st = S.stock[p.producto_id];
      let actual = null;
      if (st && st.lleva_stock) { st.stock_actual -= p.cantidad; actual = st.stock_actual; }
      return { data: { venta, stock_actual: actual, pocas: actual != null && actual <= 5 }, error: null };
    }
    if (nombre === 'tienda_cargar_stock') {
      const st = S.stock[args.p_producto] || (S.stock[args.p_producto] = { producto_id: args.p_producto, lleva_stock: false, stock_actual: 0, apartado: 0, ultima_carga: null });
      if (args.p_modo === 'quitar') { st.lleva_stock = false; st.ultima_carga = null; return { data: { stock_actual: null, ultima_carga: null }, error: null }; }
      st.stock_actual = args.p_modo === 'sumar' ? (st.lleva_stock ? st.stock_actual : 0) + args.p_unidades : args.p_unidades;
      st.lleva_stock = true; st.ultima_carga = st.stock_actual;
      return { data: { stock_actual: st.stock_actual, ultima_carga: st.ultima_carga }, error: null };
    }
    if (nombre === 'coach_stock') return { data: Object.values(S.stock).map(x => Object.assign({ producto_id: null }, x)), error: null };
    return FALTA(nombre);
  };
}

function crear(ROOT, opts) {
  opts = Object.assign({}, opts);
  const S = opts.servidor || (opts.servidor = {});
  S.catalogo = S.catalogo || []; S.stock = S.stock || {}; S.costos = S.costos || {}; S.uid = S.uid || opts.uid; S.nombre = S.nombre || 'Mariana Prueba';
  if (!opts.rpc) opts.rpc = servidorFalso(S);
  const H = crearBase(ROOT, opts);
  H.S = S;
  return H;
}
module.exports = { crear, servidorFalso };
