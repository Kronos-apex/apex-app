// Prueba EN EJECUCIÓN de la tienda de suplementos (v756). Corre el bloque REAL de app-6-extra.js con un DOM y un
// Supabase falsos (scripts/arnes-tienda.cjs). La lanza avi.test.js en un proceso aparte (necesita esperar promesas).
//
// Uso:  node scripts/comprobar-tienda-flujo.cjs [RAIZ]        (RAIZ = carpeta del repo; por defecto, esta)
//       SAB=<sabotaje> node scripts/comprobar-tienda-flujo.cjs    → tiene que salir con error (ver SABOTAJES)
//
// Cubre: pedir bien y su push; el precio NO sale del teléfono; agotado; sin señal (sin cola); menor; el push que falla
// no tumba el pedido; cancelar; el coach entrega (de contado y a cuotas) y la venta llega a la ficha; la tarjeta del
// panel; «Mis productos» con pocas y agotado; el upsert de productos SIN columnas de stock; la cantidad en la venta
// manual; y que, sin la migración (funciones inexistentes), nada se rompe.
const fs = require('fs'), path = require('path');
const { crear } = require('./arnes-tienda.cjs');
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const SAB = process.env.SAB || '';

const SABOTAJES = {
  // el teléfono manda un precio (el servidor debe sacarlo del catálogo)
  'precio-del-telefono': [["{p_producto:u.id,p_cantidad:u.cant}", "{p_producto:u.id,p_cantidad:u.cant,p_precio:1}"]],
  // el upsert del producto sube el stock (una copia vieja del teléfono lo pisaría)
  'stock-en-upsert': [["'activo','descripcion','en_tienda','creado','actualizado'],", "'activo','descripcion','en_tienda','stock_entradas','stock_desde','stock_ultima_carga','creado','actualizado'],"]],
  // la tienda muestra los «No para menores» a un menor
  'menor-ve-todo': [["const lista=(TIENDA.catalogo||[]).filter(p=>tiendaMuestraProducto(p,c));", "const lista=(TIENDA.catalogo||[]);"]],
  // sin señal el pedido se encola en vez de decir que no salió
  'sin-senal-encola': [["if(!k||!k.c||typeof k.c.rpc!=='function')return {data:null,error:{codigo:'sin_red'}};", "if(!k||!k.c||typeof k.c.rpc!=='function'){ try{localStorage.setItem('ax_cola_pedidos','1');}catch(_e){} return {data:{id:'cola',cantidad:1,producto_nombre:'x',precio_unit:1},error:null}; }"]],
  // no se avisa al coach
  'sin-push': [["Promise.resolve(pushToClient('_coach',t.title,t.body,{type:'pedido',tag:'avi-pedido-'+(p.id||'')})).catch(()=>{});", ";"]],
  // si el push falla, el pedido se pierde en la pantalla
  'push-corta-el-pedido': [
    ["  try{\n    const t=tiendaPushTexto(p,(c&&c.name)||p.client_nombre);\n    Promise.resolve(pushToClient(", "  {\n    const t=tiendaPushTexto(p,(c&&c.name)||p.client_nombre);\n    await (pushToClient("],
    ["{type:'pedido',tag:'avi-pedido-'+(p.id||'')})).catch(()=>{});\n  }catch(_e){}", "{type:'pedido',tag:'avi-pedido-'+(p.id||'')}));\n  }"]],
  // un doble toque en «Entregado» llama dos veces
  'entrega-doble': [["if(TIENDA.ui.ocupado[id])return false;\n  const ped=", "const ped="]],
  // la tarjeta del panel sale aunque no haya nada por entregar
  'tarjeta-con-cero': [["const n=tiendaPorEntregar().length; if(!n)return '';", "const n=tiendaPorEntregar().length;"]],
  // sin la migración, la app sigue creyendo en la caché y enseña la fila
  'sin-funciones-rompe': [["codigo:_tiendaFaltaFuncion(r.error)?'no_funcion':tiendaErrorCodigo(r.error)", "codigo:'otro'"]],
  // al entregar no avisa «Quedan N: pide más»
  'pocas-no-avisa': [["if(d.pocas)msg+='. '+tiendaAvisoPocas(ped.producto_nombre,d.stock_actual);", ""]],
  // en «Mis productos» no sale el aviso de pocas
  'pocas-sin-texto': [["Quedan pocas: pide más</div>`:'';", "</div>`:'';"]],
  // la venta manual ignora la cantidad
  'cantidad-ignorada': [["if((v.cantidad||1)>1)venta.cantidad=v.cantidad;", ""]],
  // el botón de un producto agotado queda activo
  'agotado-activo': [["'disabled aria-disabled=\"true\"'", "''"]],
};
const sabotajes = SAB ? (SABOTAJES[SAB] || (() => { throw new Error('sabotaje desconocido: ' + SAB); })()) : [];

const fallas = [];
const ok = (cond, msg) => { if (!cond) fallas.push(msg); };
const esperar = ms => new Promise(r => setTimeout(r, ms));
const COACH = '0a6484ed-42af-449d-9903-e440ac683ecf';
const iso = d => new Date(d).toISOString();
const dia = 86400000, ahora = Date.now();
const productosTienda = [
  { id: 'p1', nombre: 'Preentreno · sachet', categoria: 'preentreno', descripcion: '1 porción, sellado', precio: 4000, disponible: true },
  { id: 'p2', nombre: 'Creatina 300 g', categoria: 'creatina', descripcion: '60 porciones', precio: 85000, disponible: true },
  { id: 'p3', nombre: 'Barra de proteína', categoria: 'barras', descripcion: '20 g de proteína', precio: 7500, disponible: false },
];
const SIN_SENAL = 'Sin señal: tu pedido no salió. Inténtalo cuando tengas internet.';

(async () => {
  // ═════ A · La asesorada pide bien: hoja, total, franja, push, «Mis pedidos», cancelar ═════
  {
    const H = crear(ROOT, { sabotajes, uid: 'u1', clients: [{ id: 'u1', name: 'Mariana Prueba', age: 33 }], servidor: { catalogo: productosTienda, uid: 'u1' } });
    const { ctx, el, llamadas, pushes, toasts } = H;
    ctx.CUR.clientId = 'u1';
    const cliente = ctx.DB.clients[0];
    ok(ctx.tiendaFilaPerfil(cliente) === '', 'A: antes de bajar el catálogo la fila del Perfil NO sale');
    await esperar(40);
    const fila = ctx.tiendaFilaPerfil(cliente);
    ok(/Tienda · suplementos de tu coach/.test(fila) && /3 productos/.test(fila), 'A: con productos la fila dice «Tienda · suplementos de tu coach»: ' + fila.slice(0, 120));
    ok(llamadas.filter(l => l.name === 'tienda_catalogo').length === 1, 'A: el catálogo se baja UNA vez al abrir (no en cada pintada): ' + llamadas.filter(l => l.name === 'tienda_catalogo').length);
    ctx.tiendaFilaPerfil(cliente); ctx.tiendaFilaPerfil(cliente);
    ok(llamadas.filter(l => l.name === 'tienda_catalogo').length === 1, 'A: pintar el Perfil otra vez no vuelve a bajar el catálogo');
    // CONTROL (cobertura): una persona SIN coach (plan libre) no ve la fila aunque haya productos
    ok(ctx.tiendaFilaPerfil({ id: 'u9', name: 'Paula Prueba', tier: 'libre' }) === '', 'A-CONTROL: quien no entrena con el coach no ve la fila');
    ctx.tiendaAbrir(); await esperar(40);
    const room = el('tienda-body').innerHTML;
    ok(/Suplementos de tu coach · se pagan al recibirlos/.test(room), 'A: la habitación dice «Suplementos de tu coach · se pagan al recibirlos»');
    ok(/Preentreno · sachet/.test(room) && /1 porción, sellado/.test(room) && /\$4\.000/.test(room), 'A: la tarjeta lleva nombre, descripción y precio');
    ok((room.match(/>Disponible</g) || []).length === 2 && (room.match(/>Agotado</g) || []).length >= 1, 'A: insignias «Disponible» (2) y «Agotado»');
    ok(/disabled aria-disabled="true"/.test(room), 'A: el botón del agotado va desactivado (gris)');
    ok(!/costo|margen|unidades|stock/i.test(room.replace(/Stock\b/g, '')), 'A: la persona NO ve costo, margen ni unidades');
    // hoja: cantidad 1 → 2, total $8.000
    ctx.tiendaPedir('p1'); ctx.tiendaCant(1);
    ok(el('pd-cant').textContent === '2' && el('pd-total').textContent === '$8.000', 'A: la hoja muestra cantidad 2 y total $8.000: ' + el('pd-cant').textContent + ' · ' + el('pd-total').textContent);
    for (let i = 0; i < 12; i++) ctx.tiendaCant(1);
    ok(el('pd-cant').textContent === '10', 'A: la cantidad se detiene en 10');
    for (let i = 0; i < 12; i++) ctx.tiendaCant(-1);
    ok(el('pd-cant').textContent === '1', 'A: y no baja de 1');
    ctx.tiendaCant(1);
    await ctx.tiendaConfirmarPedido();
    const pedir = llamadas.filter(l => l.name === 'tienda_pedir');
    ok(pedir.length === 1 && JSON.stringify(Object.keys(pedir[0].args).sort()) === JSON.stringify(['p_cantidad', 'p_producto']) && pedir[0].args.p_cantidad === 2,
      'A: tienda_pedir recibe SOLO producto y cantidad (el precio no sale del teléfono): ' + JSON.stringify(pedir[0] && pedir[0].args));
    const room2 = el('tienda-body').innerHTML;
    ok(/Pediste 2 × Preentreno · sachet\. Tu coach te lo entrega en el gym\. Lo ves en «Mis pedidos»\./.test(room2), 'A: sale la franja «Pediste 2 × Preentreno · sachet…»: ' + (room2.match(/tn-franja[^]*?<\/div>/) || [''])[0].slice(0, 200));
    ok(/Mis pedidos/.test(room2) && /Esperando entrega/.test(room2) && /2 × Preentreno · sachet · \$8\.000/.test(room2), 'A: «Mis pedidos» muestra «Esperando entrega» con 2 × Preentreno · $8.000');
    ok(pushes.length === 1 && pushes[0][0] === '_coach' && pushes[0][2] === 'Mariana pidió 2 × Preentreno · sachet ($8.000)' && pushes[0][3].type === 'pedido',
      'A: se le manda el push al coach («Mariana pidió 2 × Preentreno · sachet ($8.000)», type pedido): ' + JSON.stringify(pushes[0]));
    // cancelar: con confirmación
    let preguntas = 0; ctx.confirm = () => { preguntas++; return true; };
    const pid = Object.values(H.cloud.tienda_pedidos)[0].id;
    await ctx.tiendaCancelarMio(pid);
    ok(preguntas === 1, 'A: cancelar pide confirmación');
    const room3 = el('tienda-body').innerHTML;
    ok(/Cancelado/.test(room3) && !/Cancelar este pedido/.test(room3) && !/Esperando entrega/.test(room3), 'A: el pedido cancelado sale «Cancelado» en gris y ya no se puede cancelar');
    ok(H.cloud.tienda_pedidos[pid].cancelado_por === 'asesorado', 'A: queda cancelado por «asesorado»');
    // los pedidos de más de 30 días no salen
    H.cloud.tienda_pedidos['viejo'] = { id: 'viejo', client_uid: 'u1', producto_nombre: 'Viejo', cantidad: 1, precio_unit: 1, estado: 'entregado', creado: iso(ahora - 40 * dia) };
    await ctx.tiendaMisCargar(); ctx.tiendaRender();
    ok(!/Viejo/.test(el('tienda-body').innerHTML), 'A: «Mis pedidos» solo muestra los últimos 30 días');
  }

  // ═════ B · Se agotó mientras tanto: texto propio y el catálogo se refresca ═════
  {
    const H = crear(ROOT, { sabotajes, uid: 'u1', clients: [{ id: 'u1', name: 'Mariana Prueba', age: 33 }], servidor: { catalogo: productosTienda.map(p => ({ ...p })), uid: 'u1', falla: { tienda_pedir: 'agotado' } } });
    const { ctx, el, llamadas } = H;
    ctx.CUR.clientId = 'u1'; await ctx.tiendaCatalogoBajar(); ctx.tiendaAbrir(); await esperar(30);
    ctx.tiendaPedir('p1'); H.S.catalogo[0].disponible = false;   // alguien más se llevó lo último
    await ctx.tiendaConfirmarPedido(); await esperar(30);
    ok(/Se acaba de agotar/.test(el('pd-err').textContent) && el('pd-err').style.display === 'block', 'B: el error dice «Se acaba de agotar»: ' + el('pd-err').textContent);
    ok(!Object.keys(H.cloud.tienda_pedidos).length && !H.pushes.length, 'B: no queda pedido ni push');
    ok(/Agotado/.test(el('tienda-body').innerHTML.split('Preentreno')[1].split('Creatina')[0]), 'B: el catálogo se refrescó y el producto ya sale «Agotado»');
    // cada código con su texto propio, distinto
    const textos = ['agotado', 'menor', 'limite', 'no_disponible', 'sin_red', 'otro'].map(c => ctx.tiendaErrorTexto(c));
    ok(new Set(textos).size === textos.length, 'B: cada error tiene su texto propio');
  }

  // ═════ C · Sin señal: el pedido NO sale y NO se encola ═════
  {
    const H = crear(ROOT, { sabotajes, uid: 'u1', clients: [{ id: 'u1', name: 'Mariana Prueba', age: 33 }], servidor: { catalogo: productosTienda, uid: 'u1' } });
    const { ctx, el, llamadas, net, store, pushes } = H;
    ctx.CUR.clientId = 'u1'; await ctx.tiendaCatalogoBajar(); ctx.tiendaAbrir(); await esperar(30);
    ctx.tiendaPedir('p1'); net.on = false;
    const antes = llamadas.filter(l => l.name === 'tienda_pedir').length;
    await ctx.tiendaConfirmarPedido();
    ok(el('pd-err').textContent === SIN_SENAL, 'C: sin señal dice «' + SIN_SENAL + '» y dijo «' + el('pd-err').textContent + '»');
    ok(llamadas.filter(l => l.name === 'tienda_pedir').length === antes && !pushes.length, 'C: no llegó al servidor ni mandó push');
    ok(!Object.keys(H.cloud.tienda_pedidos).length && !Object.keys(store).some(k => /cola|pend/.test(k) && k !== 'ax_supl'), 'C: NO hay cola de pedidos en el teléfono: ' + Object.keys(store).join(','));
    ok(!/Pediste/.test(el('tienda-body').innerHTML), 'C: no sale la franja de «Pediste»');
    net.on = true; await ctx.tiendaConfirmarPedido();
    ok(Object.keys(H.cloud.tienda_pedidos).length === 1, 'C-CONTROL: con señal el mismo pedido SÍ sale');
  }

  // ═════ D · Menor de edad: no ve (ni en la tarjeta ni en la fila) lo «No para menores» ═════
  {
    const cat = [productosTienda[1], { id: 'px', nombre: 'Quemador', categoria: 'quemador', descripcion: '', precio: 50000, disponible: true, no_menores: true }];
    const H = crear(ROOT, { sabotajes, uid: 'u2', clients: [{ id: 'u2', name: 'Sofía Prueba', age: 15 }, { id: 'u3', name: 'Camila Prueba', age: 30 }], servidor: { catalogo: cat, uid: 'u2' } });
    const { ctx, el } = H;
    ctx.CUR.clientId = 'u2'; await ctx.tiendaCatalogoBajar(); ctx.tiendaAbrir(); await esperar(30);
    const room = el('tienda-body').innerHTML;
    ok(/Creatina 300 g/.test(room) && !/Quemador/.test(room), 'D: la menor ve la creatina y NO el «No para menores»');
    ok(/1 producto</.test(ctx.tiendaFilaPerfil(ctx.DB.clients[0])), 'D: la fila del Perfil cuenta solo lo que puede ver (1)');
    ctx.CUR.clientId = 'u3'; ctx.tiendaRender();
    ok(/Quemador/.test(el('tienda-body').innerHTML), 'D-CONTROL: una persona adulta SÍ ve el mismo producto');
  }

  // ═════ E · El push falla: el pedido igual queda y se ve en «Mis pedidos» ═════
  {
    const H = crear(ROOT, { sabotajes, uid: 'u1', pushFalla: true, clients: [{ id: 'u1', name: 'Mariana Prueba', age: 33 }], servidor: { catalogo: productosTienda, uid: 'u1' } });
    const { ctx, el } = H;
    ctx.CUR.clientId = 'u1'; await ctx.tiendaCatalogoBajar(); ctx.tiendaAbrir(); await esperar(30);
    ctx.tiendaPedir('p2');
    await ctx.tiendaConfirmarPedido().catch(e => fallas.push('E: el push caído tumbó el pedido: ' + e.message));
    ok(Object.keys(H.cloud.tienda_pedidos).length === 1 && /Pediste 1 × Creatina 300 g/.test(el('tienda-body').innerHTML) && /Esperando entrega/.test(el('tienda-body').innerHTML),
      'E: con el push caído el pedido igual queda y se ve en «Mis pedidos»');
  }

  // ═════ F · Migración sin aplicar (las funciones no existen): nada se rompe ═════
  {
    const cache = { ax_tienda: JSON.stringify({ cid: 'u1', c: productosTienda }) };   // de cuando sí había tienda
    const H = crear(ROOT, { sabotajes, uid: 'u1', storage: cache, tablaFalta: ['tienda_pedidos'], clients: [{ id: 'u1', name: 'Mariana Prueba', age: 33 }], servidor: { catalogo: [], uid: 'u1', sinFunciones: true } });
    const { ctx, el, toasts } = H;
    ctx.CUR.clientId = 'u1';
    let f = ctx.tiendaFilaPerfil(ctx.DB.clients[0]); await esperar(40);
    f = ctx.tiendaFilaPerfil(ctx.DB.clients[0]);
    ok(f === '', 'F: sin las funciones la persona NO ve la fila de la tienda (ni con la caché vieja): ' + f.slice(0, 80));
    ok(!toasts.length, 'F: ningún aviso de error llega a la persona');
  }
  {
    const H = crear(ROOT, { sabotajes, tablaFalta: ['tienda_pedidos'], clients: [{ id: 'u1', name: 'Mariana Prueba', age: 33 }], servidor: { catalogo: [], sinFunciones: true } });
    const { ctx, el, toasts, llamadas } = H;
    await ctx.suplCargar(); await ctx.tiendaCoachCargar(true);
    ok(ctx.tiendaTarjetaHome() === '', 'F: sin la tabla el coach NO ve la tarjeta de pedidos');
    ctx.suplRenderHome(); await esperar(30);
    ok(!/Pedidos de la tienda/.test(el('h-supl').innerHTML), 'F: el panel del coach no pinta la tarjeta');
    // «Mis productos» y guardar un producto siguen igual que en la v750 (sin columnas nuevas en el upsert)
    el('p-productos').classList.add('on');
    ctx.suplAbrirProducto(); el('pr-nombre').value = 'Omega 3'; el('pr-cat').value = 'omega3'; el('pr-precio').value = '65.000'; el('pr-costo').value = '42.000';
    ok(el('pr-tienda-sec').style.display === 'none', 'F: sin las funciones el modal NO ofrece «Mostrar en la tienda» ni «Llevar stock»');
    await ctx.suplGuardarProducto(); ctx.suplRenderProductos(); await esperar(30);
    const up = llamadas.filter(l => l.op === 'upsert' && l.t === 'coach_productos');
    ok(up.length === 1 && !('descripcion' in up[0].row) && !('en_tienda' in up[0].row) && !Object.keys(up[0].row).some(k => /stock/.test(k)), 'F: el producto se guarda como en la v750, sin columnas nuevas: ' + JSON.stringify(up[0] && Object.keys(up[0].row)));
    ok(/Omega 3/.test(el('pr-list').innerHTML) && !/pr-stock"/.test(el('pr-list').innerHTML), 'F: «Mis productos» se pinta y no muestra stock');
    ok(!toasts.some(t => /tienda|función|PGRST/i.test(t)), 'F: ningún aviso técnico: ' + JSON.stringify(toasts));
  }

  // ═════ G · El coach: panel, bandeja, entregar, cuotas, cancelar, sin señal ═════
  {
    const p = (id, uid, nombre, prod, cant, estado, hace, extra) => Object.assign({ id, coach_id: COACH, client_uid: uid, client_id: uid, client_nombre: nombre, producto_id: prod, producto_nombre: prod === 'p1' ? 'Preentreno · sachet' : 'Creatina 300 g', precio_unit: prod === 'p1' ? 4000 : 85000, cantidad: cant, estado, cancelado_por: null, venta_id: null, creado: iso(ahora - hace), resuelto: estado === 'pendiente' ? null : iso(ahora - hace + 3600000) }, extra || {});
    const filas = [
      p('b', 'u2', 'Juan Prueba', 'p2', 1, 'pendiente', 26 * 3600000),
      p('a', 'u1', 'Laura Prueba', 'p1', 2, 'pendiente', 60000),
      p('c', 'u1', 'Laura Prueba', 'p2', 1, 'entregado', 3 * dia),
      p('d', 'u2', 'Juan Prueba', 'p1', 1, 'cancelado', 10 * dia, { cancelado_por: 'coach' }),
      p('e', 'u2', 'Juan Prueba', 'p1', 3, 'cancelado', 2 * dia, { cancelado_por: 'asesorado' }),
    ];
    const H = crear(ROOT, { sabotajes, clients: [{ id: 'u1', name: 'Laura Prueba', age: 30 }, { id: 'u2', name: 'Juan Prueba', age: 28 }], cloud: { tienda_pedidos: filas }, servidor: { catalogo: productosTienda, costos: { p1: 2720, p2: 55000 }, stock: { p1: { producto_id: 'p1', lleva_stock: true, stock_actual: 6, apartado: 2, ultima_carga: 50 } } } });
    const { ctx, el, llamadas, toasts, net } = H;
    await ctx.suplCargar(); await ctx.tiendaCoachCargar(true);
    const tarjeta = ctx.tiendaTarjetaHome();
    ok(/Pedidos de la tienda/.test(tarjeta) && /2 por entregar/.test(tarjeta), 'G: la tarjeta del panel dice «Pedidos de la tienda · 2 por entregar»: ' + tarjeta.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
    ctx.suplRenderHome(); await esperar(30);
    ok(/Pedidos de la tienda/.test(el('h-supl').innerHTML), 'G: el panel de Inicio pinta la tarjeta');
    ctx.tiendaRenderPedidos();
    const lista = el('pd-list').innerHTML;
    ok(el('pd-sub').textContent === '2 por entregar', 'G: el subtítulo dice «2 por entregar»');
    ok(lista.indexOf('Juan Prueba · 1 × Creatina 300 g') > -1 && lista.indexOf('Juan Prueba · 1 × Creatina 300 g') < lista.indexOf('Laura Prueba · 2 × Preentreno · sachet'), 'G: los pendientes van del más viejo al más nuevo (Juan antes que Laura)');
    ok(/Hoy \d{1,2}:\d{2} (a|p)\. m\. · \$8\.000/.test(lista) && /Ayer \d{1,2}:\d{2} (a|p)\. m\. · \$85\.000/.test(lista), 'G: cada pedido dice «Hoy 7:42 a. m. · $8.000»: ' + (lista.match(/vt-sub">[^<]*/g) || []).join(' | '));
    ok(/Al tocar <b>Entregado<\/b>/.test(lista) && /Si cancelas, no se toca nada/.test(lista), 'G: lleva la nota de la maqueta');
    const ult = lista.split('Últimos 7 días')[1] || '';
    ok(/Laura Prueba · 1 × Creatina 300 g/.test(ult) && /Entregado/.test(ult) && /Juan Prueba · 3 × Preentreno/.test(ult) && /Cancelado/.test(ult) && !/Juan Prueba · 1 × Preentreno/.test(ult), '«Últimos 7 días»: entregados y cancelados de la semana, no el de hace 10 días');
    // ✓ Entregado: de contado, UNA llamada aunque se toque dos veces a la vez
    await Promise.all([ctx.tiendaEntregar('a'), ctx.tiendaEntregar('a')]);
    const ent = llamadas.filter(l => l.name === 'tienda_entregar');
    ok(ent.length === 1, 'G: un doble toque en «Entregado» llama UNA sola vez al servidor (llamó ' + ent.length + ')');
    ok(ent[0] && ent[0].args.p_cuotas === 1 && !('p_abono' in ent[0].args), 'G: «Entregado» entrega con 1 cuota y sin abono (el servidor la deja pagada): ' + JSON.stringify(ent[0] && ent[0].args));
    ok(toasts.some(t => /^Venta anotada en la ficha de Laura/.test(t)), 'G: avisa «Venta anotada en la ficha de Laura»: ' + JSON.stringify(toasts));
    ok(toasts.some(t => /Quedan 4 de Preentreno · sachet: pide más/.test(t)), 'G: con pocas avisa «Quedan 4 de Preentreno · sachet: pide más»: ' + JSON.stringify(toasts));
    // la venta aparece en la ficha de Laura con su marca y su cantidad
    ctx.CUR.clientId = 'u1'; ctx.suplRenderFicha('u1'); const ficha = el('d-ventas').innerHTML;
    ok(/Preentreno · sachet × 2/.test(ficha) && /Pedido de la tienda/.test(ficha) && /\$8\.000 · de contado/.test(ficha), 'G: la ficha de Laura muestra la venta «Preentreno · sachet × 2 … Pedido de la tienda»');
    ok(!/Te debe/.test(ficha), 'G: de contado y pagada: Laura no debe nada');
    ok(ctx.__SUPL.pend.coach_ventas && !Object.keys(ctx.__SUPL.pend.coach_ventas).length, 'G: la venta que ya está en el servidor no queda como pendiente de subir');
    ok(!/Laura Prueba · 2 × Preentreno · sachet<\/div><div class="vt-sub">Hoy/.test(el('pd-list').innerHTML.split('Últimos 7 días')[0]), 'G: el pedido entregado sale de «por entregar»');
    // Cuotas: 3 cuotas y abono de 4.000
    ctx.tiendaAbrirCuotas('b'); ctx.tiendaCuotasPon(3); el('cu-abono').value = '4.000';
    await ctx.tiendaCuotasOk();
    const ent2 = llamadas.filter(l => l.name === 'tienda_entregar')[1];
    ok(ent2 && ent2.args.p_cuotas === 3 && ent2.args.p_abono === 4000, 'G: «Cuotas» llama tienda_entregar con 3 cuotas y abono de 4.000: ' + JSON.stringify(ent2 && ent2.args));
    ctx.CUR.clientId = 'u2'; ctx.suplRenderFicha('u2');
    ok(/3 cuotas/.test(el('d-ventas').innerHTML) && /Te debe/.test(el('d-ventas').innerHTML), 'G: la venta a cuotas sale en la ficha de Juan con saldo');
    // abono mayor al total: no llama
    H.cloud.tienda_pedidos['z'] = p('z', 'u1', 'Laura Prueba', 'p1', 1, 'pendiente', 1000); await ctx.tiendaCoachCargar(true);
    ctx.tiendaAbrirCuotas('z'); ctx.tiendaCuotasPon(2); el('cu-abono').value = '9.000'; const antes = llamadas.filter(l => l.name === 'tienda_entregar').length;
    await ctx.tiendaCuotasOk();
    ok(llamadas.filter(l => l.name === 'tienda_entregar').length === antes && /no puede pasar del total/.test(el('cu-err').textContent), 'G: un abono mayor al total no se manda');
    // Sin señal: no se encola
    net.on = false; toasts.length = 0;
    await ctx.tiendaEntregar('z'); await ctx.tiendaCancelarCoach('z');
    ok(toasts.length === 2 && toasts.every(t => /hace falta internet/.test(t)), 'G: sin señal los botones dicen que hace falta internet: ' + JSON.stringify(toasts));
    ok(H.cloud.tienda_pedidos['z'].estado === 'pendiente' && !Object.keys(H.store).some(k => /cola/.test(k)), 'G: sin señal no se encola nada');
    net.on = true;
    // Cancelar (con confirmación)
    let preg = 0; ctx.confirm = () => { preg++; return false; };
    await ctx.tiendaCancelarCoach('z');
    ok(preg === 1 && H.cloud.tienda_pedidos['z'].estado === 'pendiente', 'G: si dice que no en la confirmación, no cancela');
    ctx.confirm = () => true; H.S.rol = 'coach';
    await ctx.tiendaCancelarCoach('z');
    ok(H.cloud.tienda_pedidos['z'].estado === 'cancelado' && H.cloud.tienda_pedidos['z'].cancelado_por === 'coach', 'G: cancelar lo deja cancelado por «coach»');
    // Con 0 por entregar la tarjeta NO sale
    Object.values(H.cloud.tienda_pedidos).forEach(x => { if (x.estado === 'pendiente') x.estado = 'cancelado'; });
    await ctx.tiendaCoachCargar(true);
    ok(ctx.tiendaTarjetaHome() === '', 'G: sin pedidos por entregar la tarjeta del panel NO sale');
    ctx.tiendaRenderPedidos();
    ok(/No tienes pedidos por entregar/.test(el('pd-list').innerHTML) && el('pd-sub').textContent === 'Nada por entregar', 'G: y la bandeja dice que no hay nada por entregar');
  }

  // ═════ H · «Mis productos»: cifras, barra, pocas, agotado, apartados, agregar unidades ═════
  {
    const prod = (id, nombre, precio, costo, extra) => Object.assign({ id, coach_id: COACH, nombre, categoria: 'otro', precio, costo, no_menores: false, activo: true, creado: iso(ahora), actualizado: iso(ahora) }, extra || {});
    const S = { catalogo: [], stock: {
      p1: { producto_id: 'p1', lleva_stock: true, stock_actual: 32, apartado: 2, ultima_carga: 50 },
      p2: { producto_id: 'p2', lleva_stock: true, stock_actual: 4, apartado: 0, ultima_carga: 10 },
      p3: { producto_id: 'p3', lleva_stock: true, stock_actual: 0, apartado: 0, ultima_carga: 20 },
    }, costos: {} };
    const hoy = new Date(); const f = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0') + '-10';
    const venta = (id, precio, costo) => ({ id, coach_id: COACH, client_id: 'u1', producto_id: 'p1', producto_nombre: 'Preentreno · sachet', precio, costo, cuotas: 1, fecha: f, abonos: [], borrado: false, creado: iso(ahora), actualizado: iso(ahora) });
    const H = crear(ROOT, { sabotajes, clients: [{ id: 'u1', name: 'Laura Prueba', age: 30 }], servidor: S, cloud: {
      coach_productos: [prod('p1', 'Preentreno · sachet', 4000, 2720, { no_menores: true, en_tienda: true, descripcion: '1 porción', stock_entradas: 50, stock_desde: iso(ahora - dia), stock_ultima_carga: 50 }), prod('p2', 'Creatina 300 g', 85000, 55000, { en_tienda: true }), prod('p3', 'Barra de proteína', 7500, 5000), prod('p4', 'Omega 3', 65000, 42000)],
      coach_ventas: [venta('v1', 100000, 60000), venta('v2', 86000, 41200)] } });
    const { ctx, el, llamadas } = H;
    el('p-productos').classList.add('on');
    await ctx.suplCargar(); ctx.suplRenderProductos(); await esperar(60);
    const h = el('pr-list').innerHTML;
    ok(/\$186\.000<\/b><span>Vendido/.test(h) && /\$84\.800<\/b><span>Ganancia/.test(h) && /<b>2<\/b><span>Ventas/.test(h), 'H: arriba las 3 cifras del mes: Vendido $186.000, Ganancia $84.800, Ventas 2: ' + (h.match(/pr-stat">[^]*?<\/div>/g) || []).join(' ').replace(/<[^>]+>/g, ' ').slice(0, 160));
    ok(/32 de 50/.test(h) && /width:64%/.test(h) && /pf-ok/.test(h), 'H: «32 de 50» con barra verde (64 %)');
    ok(/4 de 10/.test(h) && /pf-pocas/.test(h) && /Quedan pocas: pide más/.test(h), 'H: con 4 de 10 la barra es roja y dice «Quedan pocas: pide más»');
    ok(/Agotado: en la tienda sale «Agotado»/.test(h), 'H: con 0 dice «Agotado: en la tienda sale «Agotado»»');
    ok(/2 apartados/.test(h), 'H: con pedidos pendientes dice «2 apartados»');
    ok((h.match(/\+ Agregar unidades/g) || []).length === 3, 'H: un botón «+ Agregar unidades» por producto con stock (3)');
    ok((h.match(/class="pr-stock"/g) || []).length === 3, 'H: el producto sin stock (Omega 3) no pinta barra: solo 3 bloques de stock');
    ok(/⚠/.test(h) === false, 'H: sin emojis: usa el ícono de la app');
    // agregar unidades: «contar lo que tengo» (fijar)
    ctx.tiendaAbrirStock('p2'); ctx.tiendaStockModo('fijar'); el('st-n').value = '12';
    await ctx.tiendaStockGuardar(false);
    const cg = llamadas.filter(l => l.name === 'tienda_cargar_stock');
    ok(cg.length === 1 && cg[0].args.p_producto === 'p2' && cg[0].args.p_unidades === 12 && cg[0].args.p_modo === 'fijar', 'H: «Contar lo que tengo» manda modo fijar con 12: ' + JSON.stringify(cg[0] && cg[0].args));
    ok(/12 de 12/.test(el('pr-list').innerHTML), 'H: después se repinta «12 de 12»');
    ctx.tiendaAbrirStock('p2'); el('st-n').value = '3'; await ctx.tiendaStockGuardar(false);
    ok(llamadas.filter(l => l.name === 'tienda_cargar_stock')[1].args.p_modo === 'sumar', 'H: por defecto suma unidades');

    // ── I · el upsert del producto NO lleva stock (aunque la copia local lo traiga) ──
    ctx.suplAbrirProducto('p1');
    ok(el('pr-tienda-sec').style.display === 'block', 'I: con las funciones, el modal ofrece «Mostrar en la tienda» y «Llevar stock»');
    el('pr-precio').value = '4.500'; el('pr-desc').value = '1 porción, sellado';
    await ctx.suplGuardarProducto();
    const up = llamadas.filter(l => l.op === 'upsert' && l.t === 'coach_productos');
    ok(up.length === 1, 'I: el producto se subió una vez');
    const llaves = Object.keys(up[0].row);
    ok(!llaves.some(k => /^stock_/.test(k)), '🔴 I: el upsert de productos NO puede llevar stock_entradas/stock_desde/stock_ultima_carga (una copia vieja pisaría el stock): ' + llaves.join(','));
    ok(up[0].row.precio === 4500 && up[0].row.descripcion === '1 porción, sellado' && up[0].row.en_tienda === true, 'I: sí lleva descripción y «en la tienda»');
    // CONTROL: la copia local SÍ trae stock (así el candado discrimina)
    ok(ctx.__SUPL.productos.find(x => x.id === 'p1').stock_entradas === 50, 'I-CONTROL: la copia local del producto sí trae stock_entradas (50), y aun así no sube');
    // producto nuevo con «Llevar stock»: primero el upsert (sin stock), luego la función
    llamadas.length = 0;
    ctx.suplAbrirProducto(); el('pr-nombre').value = 'Proteína 2 lb'; el('pr-cat').value = 'proteina'; el('pr-precio').value = '150.000'; el('pr-costo').value = '105.000';
    ctx.suplProductoTienda(); ctx.suplProductoStock(); el('pr-stock-n').value = '20';
    await ctx.suplGuardarProducto();
    const iUp = llamadas.findIndex(l => l.op === 'upsert' && l.t === 'coach_productos' && l.row.nombre === 'Proteína 2 lb'), iCarga = llamadas.findIndex(l => l.name === 'tienda_cargar_stock');
    ok(iUp >= 0 && iCarga > iUp, 'I: producto nuevo con stock: primero el upsert y después tienda_cargar_stock (upsert en ' + iUp + ', carga en ' + iCarga + ')');
    const nuevo = llamadas[iUp];
    ok(!Object.keys(nuevo.row).some(k => /^stock_/.test(k)) && nuevo.row.en_tienda === true, 'I: el producto nuevo sube sin stock y con «en la tienda»');
    const carga = llamadas.find(l => l.name === 'tienda_cargar_stock');
    ok(carga && carga.args.p_unidades === 20 && carga.args.p_modo === 'fijar', 'I: las unidades iniciales van por tienda_cargar_stock (20)');
  }

  // ═════ K · Venta manual con cantidad: precio y costo = unitario × cantidad ═════
  {
    const H = crear(ROOT, { sabotajes, clients: [{ id: 'u1', name: 'Laura Prueba', age: 30 }], servidor: { catalogo: [] }, cloud: { coach_productos: [{ id: 'p1', coach_id: COACH, nombre: 'Creatina 300 g', categoria: 'creatina', precio: 85000, costo: 55000, no_menores: false, activo: true, creado: iso(ahora), actualizado: iso(ahora) }] } });
    const { ctx, el, llamadas } = H;
    await ctx.suplCargar(); ctx.CUR.clientId = 'u1'; ctx.suplOpenVenta('u1'); ctx.suplVentaElegir('p1');
    ctx.suplVentaCant(1);
    ok(el('vt-cant').textContent === '2' && el('vt-precio').value === '170.000' && el('vt-costo').value === '110.000', 'K: con cantidad 2 el precio y el costo se duplican (170.000 / 110.000): ' + el('vt-precio').value + ' / ' + el('vt-costo').value);
    await ctx.suplGuardarVenta();
    const v = llamadas.find(l => l.op === 'upsert' && l.t === 'coach_ventas');
    ok(v && v.row.cantidad === 2 && v.row.precio === 170000 && v.row.costo === 110000, 'K: la venta se guarda con cantidad 2, precio 170.000 y costo 110.000: ' + JSON.stringify(v && v.row));
    // CONTROL: una venta de 1 unidad sigue subiendo SIN la columna nueva (compatible con antes de la migración)
    llamadas.length = 0; ctx.suplOpenVenta('u1'); ctx.suplVentaElegir('p1'); await ctx.suplGuardarVenta();
    const v1 = llamadas.find(l => l.op === 'upsert' && l.t === 'coach_ventas');
    ok(v1 && !('cantidad' in v1.row) && v1.row.precio === 85000, 'K-CONTROL: una venta de 1 unidad sube como siempre (sin la columna cantidad)');
  }

  if (fallas.length) { console.error('FALLA (' + fallas.length + ')' + (SAB ? ' [sabotaje ' + SAB + ']' : '') + ':\n - ' + fallas.join('\n - ')); process.exit(1); }
  console.log('OK');
})().catch(e => { console.error('ERROR' + (fallas.length ? ' tras ' + fallas.length + ' fallas:\n - ' + fallas.join('\n - ') + '\n' : ' ') + (e && e.stack)); process.exit(2); });
