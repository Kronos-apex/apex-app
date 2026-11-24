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
    ["  try{\n    const t=tiendaPushTexto(p,quien||p.client_nombre);\n    Promise.resolve(pushToClient(", "  {\n    const t=tiendaPushTexto(p,quien||p.client_nombre);\n    await (pushToClient("],
    ["{type:'pedido',tag:'avi-pedido-'+(p.id||'')})).catch(()=>{});\n  }catch(_e){}", "{type:'pedido',tag:'avi-pedido-'+(p.id||'')}));\n  }"]],
  // un doble toque en «Entregado» llama dos veces
  'entrega-doble': [["if(TIENDA.ui.ocupado[id])return false;\n  const ped=", "const ped="]],
  // la tarjeta del panel dice «0 pedidos por entregar» cuando no hay ninguno
  'tarjeta-con-cero': [["Tienda${n?' · '+n+' '+(n===1?'pedido':'pedidos')+' por entregar':''}", "Tienda · ${n} pedidos por entregar"]],
  // sin la migración, la app sigue creyendo en la caché y enseña la fila
  'sin-funciones-rompe': [["codigo:_tiendaFaltaFuncion(r.error)?'no_funcion':tiendaErrorCodigo(r.error)", "codigo:'otro'"]],
  // al entregar no avisa «Quedan N: pide más»
  'pocas-no-avisa': [["if(d.pocas)msg+='. '+tiendaAvisoPocas(ped.producto_nombre,d.stock_actual);", ""]],
  // en «Mis productos» no sale el aviso de pocas
  'pocas-sin-texto': [["Quedan pocas: pide más</div>`:'';", "</div>`:'';"]],
  // la venta manual ignora la cantidad
  'cantidad-ignorada': [["if((v.cantidad||1)>1)venta.cantidad=v.cantidad;", ""]],
  // la cuenta que sale deja su tienda a la vista de la siguiente (ni reinicio ni guardia por uid)
  'sin-reset': [["function tiendaReset(){", "function tiendaReset(){ return;"]],
  'sin-guardia': [["function tiendaGuardia(){", "function tiendaGuardia(){ return;"]],
  // un primer intento sin señal marca el catálogo como bajado y nunca se reintenta
  'catbajado-siempre': [["const r=await _tiendaRpc('tienda_catalogo');\n  if(!_tiendaEsDeAhora(r))return;", "const r=await _tiendaRpc('tienda_catalogo'); TIENDA.catBajado=true;\n  if(!_tiendaEsDeAhora(r))return;"]],
  // el reintento sin señal sube la fila ENTERA (con stock_*)
  'reintento-sube-todo': [["const {error}=await k.c.from(tabla).upsert(_suplFila(tabla,row,k.u.id));", "const {error}=await k.c.from(tabla).upsert(Object.assign({},row,{coach_id:k.u.id}));"]],
  // tras un reintento que sale bien no se refresca el stock
  'reintento-sin-refresco': [["if(subidas&&typeof tiendaStockRefrescar==='function')tiendaStockRefrescar();", ""]],
  // al agotarse dice siempre lo mismo, sin volver a mirar el catálogo
  'agotado-texto-fijo': [["texto=tiendaErrorAgotado(!!(p2&&p2.disponible!==false));", "texto=tiendaErrorTexto('agotado');"]],
  // el botón de confirmar no se bloquea mientras envía
  'confirmar-sin-bloqueo': [["if(btn){ btn.disabled=true; btn.textContent='Enviando…'; }", ""]],
  // los botones del coach no se bloquean mientras envía
  'coach-sin-bloqueo': [["  TIENDA.ui.ocupado[id]=(cuotas===1&&abono==null)?'entregar':'cuotas'; tiendaRenderPedidos();\n  const args=", "  TIENDA.ui.ocupado[id]=(cuotas===1&&abono==null)?'entregar':'cuotas';\n  const args="]],
  // la bandeja vuelve al orden viejo (más viejo primero)
  'bandeja-al-reves': [["Date.parse(b.creado)-Date.parse(a.creado));   // el más nuevo arriba (como la maqueta)", "Date.parse(a.creado)-Date.parse(b.creado));"]],
  // la barra de proteína vuelve a llevar la manzana
  'icono-manzana': [["barras:'box'};", "barras:'apple'};"]],
  // el ?avi-pedidos=1 se queda en la URL (solo se mira el texto: está en app-2-login, lo cubre la prueba estática)
  // la respuesta de otra cuenta se acepta siempre (cambio de cuenta con una llamada en vuelo)
  'esdeahora-siempre': [["function _tiendaEsDeAhora(r){ const u=_tiendaUid(); return !(r&&r.uid&&u&&r.uid!==u); }", "function _tiendaEsDeAhora(r){ return true; }"]],
  // la caché local de OTRA persona se muestra tras recargar
  'cache-sin-uid': [["if(d&&u&&d.uid===u&&Array.isArray(d.c))", "if(d&&Array.isArray(d.c))"]],
  // la respuesta tardía de tienda_pedir pinta «Pediste…» en la cuenta nueva
  'pedir-tardio-sin-guardia': [["const vigente=_tiendaEsDeAhora(r);", "const vigente=true;"]],
  // el aviso al coach lleva el nombre de la cuenta ACTUAL, no el de quien pidió
  'push-nombre-actual': [["tiendaPushTexto(p,quien||p.client_nombre)", "tiendaPushTexto(p,(suplPersona(CUR.clientId)||{}).name||p.client_nombre)"]],
  // la respuesta tardía de entregar avisa «Venta anotada…» a la cuenta nueva
  'entrega-tardia-sin-guardia': [["if(!_tiendaEsDeAhora(r))return false;", ""]],
  // «agotado» decide con el catálogo VIEJO (el de antes de volver a bajarlo)
  'agotado-catalogo-viejo': [["const fresco=await tiendaCatalogoBajar();", "const __v=(TIENDA.catalogo||[]).map(x=>Object.assign({},x)); const fresco=await tiendaCatalogoBajar();"], ["const p2=(TIENDA.catalogo||[]).find(x=>x.id===u.id);\n        texto=", "const p2=__v.find(x=>x.id===u.id);\n        texto="]],
  // si la segunda bajada falla, dice siempre «No quedan tantas» (aunque pidió 1)
  'agotado-sin-dato-tantas': [["else texto=tiendaErrorAgotado(u.cant>1);", "else texto=tiendaErrorAgotado(true);"]],
  // el botón «Enviando…» del modal de cuotas no existe
  'cuotas-sin-bloqueo': [["const b=_suplEl('cu-ok'); if(b){ b.disabled=true; b.textContent='Enviando…'; }", "const b=null;"]],
  // al cancelar, el «Enviando…» sale en Entregado (el botón equivocado)
  'cancelar-boton-equivocado': [["oc==='cancelar'?'Enviando…':'Cancelar'", "'Cancelar'"], ["oc==='entregar'?'Enviando…'", "oc?'Enviando…'"]],
  // al cancelar el coach no se repinta: el botón no muestra «Enviando…»
  'cancelar-coach-sin-repintar': [["TIENDA.ui.ocupado[id]='cancelar'; tiendaRenderPedidos();", "TIENDA.ui.ocupado[id]='cancelar';"]],
  // el interruptor no guarda en el perfil
  'toggle-no-guarda': [["  c.tiendaVer=valor;\n  sv('ax_c',DB.clients);", "  c.tiendaVer=valor;"]],
  // el interruptor no deja la clave EXPLÍCITA
  'toggle-no-explicito': [["  c.tiendaVer=valor;\n", "  delete c.tiendaVer;\n"]],
  // «Quién la ve» enseña a TODOS en todas las pestañas
  'quien-sin-pestanas': [["filas=tiendaQuienLista(DB.clients,tab);", "filas=tiendaQuienLista(DB.clients,'coach').concat(tiendaQuienLista(DB.clients,'pro'),tiendaQuienLista(DB.clients,'libre'));"]],
  // las 4 partes se ven todas a la vez
  'partes-todas-visibles': [["e.classList.toggle('on',k===p);", "e.classList.add('on');"]],
  // la pestaña Compras no trae el interruptor «Ve la tienda»
  'compras-sin-interruptor': [["  tiendaRenderFichaVer(id); suplRenderFicha(id);\n}", "  suplRenderFicha(id);\n}"]],
  // la pestaña Compras del propio coach queda en blanco
  'compras-yo-en-blanco': [["    const e=_suplEl('d-compras-ver'); if(e)e.innerHTML='<div class=\"card\"><div class=\"cb\" style=\"font-size:13px;color:var(--t2);line-height:1.5\">Esta es tu propia ficha: no te vendes a ti mismo, así que aquí no hay compras ni interruptor de la tienda.</div></div>';", "    const e=_suplEl('d-compras-ver'); if(e)e.innerHTML='';"]],
  // apagar «Ve la tienda» esconde al coach los pedidos pendientes de esa persona
  'apagar-esconde-pedidos': [["function tiendaPorEntregar(){ return (TIENDA.pedidos||[]).filter(p=>p&&p.estado==='pendiente'); }", "function tiendaPorEntregar(){ return (TIENDA.pedidos||[]).filter(p=>p&&p.estado==='pendiente'&&((DB.clients||[]).find(c=>c.id===p.client_id)||{}).tiendaVer!==false); }"]],
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
    ok(/data-i="box"/.test(room) && !/data-i="apple"/.test(room), 'A: la barra de proteína lleva el ícono de la caja (box), no una manzana');
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
    ok(el('pd-err').textContent === 'Se acaba de agotar.' && el('pd-err').style.display === 'block', 'B: si ya no queda ninguna, el error dice «Se acaba de agotar.»: ' + el('pd-err').textContent);
    ok(!Object.keys(H.cloud.tienda_pedidos).length && !H.pushes.length, 'B: no queda pedido ni push');
    ok(/Agotado/.test(el('tienda-body').innerHTML.split('Preentreno')[1].split('Creatina')[0]), 'B: el catálogo se refrescó y el producto ya sale «Agotado»');
    // Pidió MÁS de lo que queda (el producto sigue disponible): «No quedan tantas…»
    H.S.catalogo[0].disponible = true; ctx.tiendaRender(); ctx.tiendaPedir('p1');
    await ctx.tiendaConfirmarPedido(); await esperar(30);
    ok(el('pd-err').textContent === 'No quedan tantas. Prueba con menos o pregúntale a tu coach.', 'B: si todavía quedan algunas, dice «No quedan tantas. Prueba con menos o pregúntale a tu coach.»: ' + el('pd-err').textContent);
    ok(!/Agotado/.test(el('tienda-body').innerHTML.split('Preentreno')[1].split('Creatina')[0]), 'B: y la tarjeta sigue «Disponible» (el catálogo se volvió a bajar)');
    ok(H.llamadas.filter(l => l.name === 'tienda_catalogo').length >= 3, 'B: con el error «agotado» se vuelve a bajar el catálogo');
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
    H.setUid('u3'); H.S.uid = 'u3'; ctx.CUR.clientId = 'u3'; await ctx.tiendaCatalogoBajar(); ctx.tiendaRender();
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
    const cache = { ax_tienda: JSON.stringify({ uid: 'u1', c: productosTienda }) };   // de cuando sí había tienda
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
    ctx.tiendaRenderHome(); await esperar(30);
    ok(!/por entregar/.test(el('h-tienda').innerHTML), 'F: sin la tabla el coach NO ve pedidos por entregar en la tarjeta de la Tienda');
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
    // 🔴 CI del 24-nov: «hace 26 h» y «hace 60 s» solo caen en «ayer» y «hoy» si la hora local es de las 02:00 en adelante (y no es el primer minuto
    //    del día). A las 00:31 UTC el pedido de ayer cayó anteayer. Los dos se anclan a la MEDIANOCHE LOCAL: ayer a mediodía, hoy dentro de lo que lleva el día.
    const medianoche = new Date(ahora); medianoche.setHours(0, 0, 0, 0);
    const haceAyer = (ahora - medianoche.getTime()) + 12 * 3600000, haceHoy = Math.min(60000, ahora - medianoche.getTime());
    const filas = [
      p('b', 'u2', 'Juan Prueba', 'p2', 1, 'pendiente', haceAyer),
      p('a', 'u1', 'Laura Prueba', 'p1', 2, 'pendiente', haceHoy),
      p('c', 'u1', 'Laura Prueba', 'p2', 1, 'entregado', 3 * dia),
      p('d', 'u2', 'Juan Prueba', 'p1', 1, 'cancelado', 10 * dia, { cancelado_por: 'coach' }),
      p('e', 'u2', 'Juan Prueba', 'p1', 3, 'cancelado', 2 * dia, { cancelado_por: 'asesorado' }),
    ];
    const H = crear(ROOT, { sabotajes, clients: [{ id: 'u1', name: 'Laura Prueba', age: 30 }, { id: 'u2', name: 'Juan Prueba', age: 28 }], cloud: { tienda_pedidos: filas }, servidor: { catalogo: productosTienda, costos: { p1: 2720, p2: 55000 }, stock: { p1: { producto_id: 'p1', lleva_stock: true, stock_actual: 6, apartado: 2, ultima_carga: 50 } } } });
    const { ctx, el, llamadas, toasts, net } = H;
    await ctx.suplCargar(); await ctx.tiendaCoachCargar(true);
    ctx.tiendaRenderHome(); await esperar(30);
    const tarjeta = el('h-tienda').innerHTML;
    ok(/Tienda · 2 pedidos por entregar/.test(tarjeta), '🔴 G: la tarjeta de la Tienda en el Inicio dice «Tienda · 2 pedidos por entregar»: ' + tarjeta.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
    ctx.tiendaRenderPedidos();
    const lista = el('pd-list').innerHTML;
    ok(el('pd-sub').textContent === '2 por entregar', 'G: el subtítulo dice «2 por entregar»');
    ok(lista.indexOf('Laura Prueba · 2 × Preentreno · sachet') > -1 && lista.indexOf('Laura Prueba · 2 × Preentreno · sachet') < lista.indexOf('Juan Prueba · 1 × Creatina 300 g'), 'G: los pendientes van del más NUEVO al más viejo (Laura, de hace un minuto, antes que Juan, de ayer)');
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
    ok(/<b class="">\$0<\/b><span>Te debe en suplementos/.test(ficha), 'G: de contado y pagada: Laura no debe nada ($0 en «Te debe en suplementos»)');
    ok(/<b>\$8\.000<\/b><span>Ha comprado/.test(ficha), 'G: «Ha comprado» suma lo que compró ($8.000)');
    ok(ctx.__SUPL.pend.coach_ventas && !Object.keys(ctx.__SUPL.pend.coach_ventas).length, 'G: la venta que ya está en el servidor no queda como pendiente de subir');
    ok(!/Laura Prueba · 2 × Preentreno · sachet<\/div><div class="vt-sub">Hoy/.test(el('pd-list').innerHTML.split('Últimos 7 días')[0]), 'G: el pedido entregado sale de «por entregar»');
    // Cuotas: 3 cuotas y abono de 4.000
    ctx.tiendaAbrirCuotas('b'); ctx.tiendaCuotasPon(3); el('cu-abono').value = '4.000';
    await ctx.tiendaCuotasOk();
    const ent2 = llamadas.filter(l => l.name === 'tienda_entregar')[1];
    ok(ent2 && ent2.args.p_cuotas === 3 && ent2.args.p_abono === 4000, 'G: «Cuotas» llama tienda_entregar con 3 cuotas y abono de 4.000: ' + JSON.stringify(ent2 && ent2.args));
    ctx.CUR.clientId = 'u2'; ctx.suplRenderFicha('u2');
    ok(/3 cuotas/.test(el('d-ventas').innerHTML) && /<b class="deb">\$81\.000<\/b><span>Te debe en suplementos/.test(el('d-ventas').innerHTML), 'G: la venta a cuotas sale en la ficha de Juan con su saldo ($81.000 en «Te debe en suplementos»)');
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
    ctx.tiendaRenderHome(); await esperar(30);
    ok(!/por entregar/.test(el('h-tienda').innerHTML), '🔴 G: sin pedidos por entregar la tarjeta de la Tienda NO dice «0 por entregar»');
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

  // ═════ L · 🔒 Cambio de cuenta en la MISMA pestaña: el menor no ve nada de la adulta (con y sin señal) ═════
  for (const modo of ['con-reinicio', 'solo-uid']) {
    for (const senal of [true, false]) {
      const cat = uid => (uid === 'u1' ? productosTienda : productosTienda.filter(p => p.id !== 'p1'));   // el servidor ya le quita el «No para menores» al menor
      const H = crear(ROOT, { sabotajes, uid: 'u1', clients: [{ id: 'u1', name: 'Mariana Prueba', age: 33 }, { id: 'u2', name: 'Sofía Prueba', age: 15 }], servidor: { catalogo: cat, uid: 'u1' } });
      const { ctx, el, store, net } = H; const que = modo + (senal ? ' con señal' : ' sin señal');
      ctx.CUR.clientId = 'u1'; await ctx.tiendaCatalogoBajar(); ctx.tiendaAbrir(); await esperar(30);
      ctx.tiendaPedir('p1'); await ctx.tiendaConfirmarPedido();
      ok(/Preentreno/.test(el('tienda-body').innerHTML) && Object.keys(H.cloud.tienda_pedidos).length === 1, 'L (' + que + '): control, la adulta sí tiene catálogo y su pedido');
      ok(/"uid":"u1"/.test(store.ax_tienda || ''), 'L (' + que + '): la caché local queda atada al uid de la adulta');
      // ── sale de la cuenta (logout() llama a tiendaReset) y entra el menor en la misma pestaña ──
      if (modo === 'con-reinicio') { ctx.tiendaReset(); ok(!('ax_tienda' in store), 'L (' + que + '): al salir se borra la caché local de la tienda'); }
      ctx.CUR.clientId = 'u2'; H.setUid('u2'); H.S.uid = 'u2'; net.on = senal;
      const menor = ctx.DB.clients[1];
      const fila = ctx.tiendaFilaPerfil(menor); await esperar(40);
      const fila2 = ctx.tiendaFilaPerfil(menor);
      ctx.tiendaAbrir(); await esperar(40);
      const sala = el('tienda-body').innerHTML;
      ok(!/Preentreno/.test(fila + fila2 + sala), '🔴 L (' + que + '): el menor ve algo de la adulta (el «No para menores» o su pedido): ' + (fila2 + sala).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 160));
      ok(!/Mis pedidos|Esperando entrega|2 × |1 × Preentreno/.test(sala), '🔴 L (' + que + '): el menor ve «Mis pedidos» de la adulta');
      if (senal) ok(/Creatina 300 g/.test(sala) && !/Preentreno/.test(sala), 'L (' + que + '): CONTROL, con señal el menor sí ve SU catálogo (sin el «No para menores»)');
      else ok(!/Creatina/.test(sala) && fila === '' && fila2 === '', 'L (' + que + '): sin señal no ve ninguna tienda (ni la fila): no hay nada suyo que enseñar');
    }
  }

  // ═════ M · El catálogo que falla (sin señal) se REINTENTA: al volver la señal y al abrir el Perfil ═════
  {
    const H = crear(ROOT, { sabotajes, uid: 'u1', clients: [{ id: 'u1', name: 'Mariana Prueba', age: 33 }], servidor: { catalogo: productosTienda, uid: 'u1' } });
    const { ctx, net, llamadas } = H;
    ctx.CUR.clientId = 'u1'; const c = ctx.DB.clients[0];
    net.on = false;
    ok(ctx.tiendaFilaPerfil(c) === '', 'M: sin señal la fila no sale'); await esperar(40);
    ok(ctx.tiendaFilaPerfil(c) === '', 'M: y sigue sin salir mientras no haya señal');
    net.on = true; await H.disparar('online'); await esperar(40);
    ok(/Tienda · suplementos de tu coach/.test(ctx.tiendaFilaPerfil(c)), '🔴 M: al volver la señal el catálogo se reintenta y la fila aparece (antes quedaba apagada toda la sesión)');
    // y al abrir el Perfil (que pinta la fila), sin que haya vuelto a sonar el evento de señal
    const H2 = crear(ROOT, { sabotajes, uid: 'u1', clients: [{ id: 'u1', name: 'Mariana Prueba', age: 33 }], servidor: { catalogo: productosTienda, uid: 'u1' } });
    H2.ctx.CUR.clientId = 'u1'; H2.net.on = false; H2.ctx.tiendaFilaPerfil(H2.ctx.DB.clients[0]); await esperar(40);
    H2.net.on = true; H2.ctx.tiendaFilaPerfil(H2.ctx.DB.clients[0]); await esperar(40);
    ok(/Tienda · suplementos de tu coach/.test(H2.ctx.tiendaFilaPerfil(H2.ctx.DB.clients[0])), '🔴 M: al abrir el Perfil con señal el catálogo se reintenta');
  }

  // ═════ N · S5a: el reintento sin señal NUNCA sube stock_*, y tras subir refresca el stock ═════
  {
    const prod = { id: 'p1', coach_id: COACH, nombre: 'Preentreno · sachet', categoria: 'preentreno', precio: 4000, costo: 2720, no_menores: true, activo: true, en_tienda: true, descripcion: '', stock_entradas: 50, stock_desde: iso(ahora - dia), stock_ultima_carga: 50, creado: iso(ahora), actualizado: iso(ahora) };
    const H = crear(ROOT, { sabotajes, clients: [{ id: 'u1', name: 'Laura Prueba', age: 30 }], cloud: { coach_productos: [prod] }, servidor: { catalogo: [], stock: { p1: { producto_id: 'p1', lleva_stock: true, stock_actual: 32, apartado: 0, ultima_carga: 50 } } } });
    const { ctx, el, llamadas, net } = H;
    await ctx.suplCargar(); await ctx.tiendaStockCargar();
    net.on = false; ctx.suplAbrirProducto('p1'); el('pr-precio').value = '4.500'; await ctx.suplGuardarProducto();   // queda pendiente en el teléfono
    ok(ctx.__SUPL.pend.coach_productos.p1 === true, 'N: control, el producto quedó pendiente sin señal');
    ok(ctx.__SUPL.productos.find(x => x.id === 'p1').stock_entradas === 50, 'N-CONTROL: la copia local sí trae stock_entradas (50)');
    llamadas.length = 0; net.on = true; await H.disparar('online'); await esperar(60);
    const up = llamadas.filter(l => l.op === 'upsert' && l.t === 'coach_productos');
    ok(up.length >= 1, 'N: el reintento sí subió el producto');
    ok(up.every(l => !Object.keys(l.row).some(k => /^stock_/.test(k))), '🔴 N: el reintento sin señal NO puede subir stock_entradas/stock_desde/stock_ultima_carga: ' + (up[0] && Object.keys(up[0].row).join(',')));
    ok(llamadas.some(l => l.name === 'coach_stock'), '🔴 N: tras un reintento que sale bien se refresca el stock en pantalla');
  }

  // ═════ O · «Enviando…»: el botón se bloquea y no se manda dos veces ═════
  {
    const H = crear(ROOT, { sabotajes, uid: 'u1', clients: [{ id: 'u1', name: 'Mariana Prueba', age: 33 }], servidor: { catalogo: productosTienda, uid: 'u1', demora: 250 } });
    const { ctx, el, llamadas } = H;
    ctx.CUR.clientId = 'u1'; await ctx.tiendaCatalogoBajar(); ctx.tiendaAbrir(); await esperar(550);
    ctx.tiendaPedir('p2');
    const pr = ctx.tiendaConfirmarPedido(); await esperar(10);
    ok(el('pd-ok').disabled === true && el('pd-ok').textContent === 'Enviando…', '🔴 O: mientras envía, «Confirmar pedido» se desactiva y dice «Enviando…»: ' + el('pd-ok').disabled + ' · ' + el('pd-ok').textContent);
    ctx.tiendaConfirmarPedido();
    await pr; await esperar(150);
    ok(llamadas.filter(l => l.name === 'tienda_pedir').length === 1, 'O: un segundo toque mientras envía no manda otro pedido');
    ok(el('pd-ok').disabled === false && el('pd-ok').textContent === 'Confirmar pedido', 'O: al terminar el botón vuelve a «Confirmar pedido»');
  }
  {
    const row = { id: 'a', coach_id: COACH, client_uid: 'u1', client_id: 'u1', client_nombre: 'Laura Prueba', producto_id: 'p1', producto_nombre: 'Preentreno · sachet', precio_unit: 4000, cantidad: 2, estado: 'pendiente', cancelado_por: null, venta_id: null, creado: iso(ahora - 60000), resuelto: null };
    const H = crear(ROOT, { sabotajes, clients: [{ id: 'u1', name: 'Laura Prueba', age: 30 }], cloud: { tienda_pedidos: [row] }, servidor: { catalogo: productosTienda, costos: { p1: 2720 }, demora: 250 } });
    const { ctx, el } = H;
    await ctx.suplCargar(); await ctx.tiendaCoachCargar(true); ctx.tiendaRenderPedidos();
    const pr = ctx.tiendaEntregar('a'); await esperar(10);
    const h = el('pd-list').innerHTML;
    ok(/disabled[^>]*>Enviando…/.test(h) && (h.match(/ disabled aria-disabled="true"/g) || []).length === 3, '🔴 O: mientras el coach entrega, Entregado dice «Enviando…» y Cuotas y Cancelar quedan desactivados: ' + (h.match(/<button[^>]*>/g) || []).join(' '));
    await pr;
  }

  // ═════ P · Respuestas TARDÍAS tras un cambio de cuenta: la cuenta nueva no ve nada de la anterior ═════
  {
    const cat = uid => [{ id: 'p2', nombre: 'Creatina 300 g', categoria: 'creatina', descripcion: '', precio: 85000, disponible: true }].concat(uid === 'uA' ? [{ id: 'px', nombre: 'Quemador X', categoria: 'quemador', descripcion: '', precio: 50000, disponible: true }] : []);
    const montar = () => {
      const H = crear(ROOT, { sabotajes, uid: 'uA', clients: [{ id: 'uA', name: 'Mariana Prueba', age: 30 }, { id: 'uB', name: 'Beto Prueba', age: 15 }], servidor: { catalogo: cat, uid: 'uA', nombre: 'Mariana Prueba' } });
      H.ctx._authUid = 'uA'; H.ctx.CUR.clientId = 'uA';
      const salir = () => { H.ctx.tiendaReset(); H.ctx._authUid = null; H.ctx.CUR.loggedAs = null; H.ctx.CUR.clientId = null; };
      const entrarMenor = () => { H.setUid('uB'); H.S.uid = 'uB'; H.S.nombre = 'Beto Prueba'; H.ctx._authUid = 'uB'; H.ctx.CUR.clientId = 'uB'; };
      return { H, salir, entrarMenor, B: H.ctx.DB.clients[1] };
    };
    const vista = H => { const h = H.el('tienda-body').innerHTML; return { cat: (h.match(/<div class="tn-card">[\s\S]*?vt-nm">([^<]*)/g) || []).map(x => x.replace(/[\s\S]*vt-nm">/, '')), mis: /Mis pedidos/.test(h), franja: /tn-franja/.test(h), h }; };
    // P1 · el catálogo y «Mis pedidos» de la adulta llegan TARDE, cuando el menor ya entró
    for (const senal of [true, false]) {
      const M = montar(); const { H } = M, { ctx } = H;
      ctx.tiendaFilaPerfil(ctx.DB.clients[0]); await esperar(30); ctx.tiendaAbrir(); await esperar(40);
      ctx.tiendaPedir('px'); await ctx.tiendaConfirmarPedido(); await esperar(30);
      H.S.demora = 300; ctx.tiendaAbrir(); await esperar(20);
      M.salir(); await esperar(20); M.entrarMenor(); H.S.demora = 0; H.net.on = senal;
      ctx.tiendaFilaPerfil(M.B); await esperar(30); ctx.tiendaAbrir(); await esperar(650); ctx.tiendaRender();
      const v = vista(H); const q = 'P1 respuestas tardías, menor ' + (senal ? 'con' : 'sin') + ' señal';
      ok(!v.cat.some(n => /Quemador/.test(n)) && !v.mis, '🔴 ' + q + ': el menor ve algo de la adulta (catálogo ' + JSON.stringify(v.cat) + ', «Mis pedidos»: ' + v.mis + ')');
      if (senal) ok(v.cat.some(n => /Creatina/.test(n)), '🔴 ' + q + ': CONTROL, el menor SE QUEDA SIN SU PROPIA TIENDA (la respuesta tardía de la adulta le borró el catálogo): ' + JSON.stringify(v.cat));
    }
    // P2 · el pedido de la adulta sale mientras entra el menor: «Pediste…» no es del menor y el aviso lleva SU nombre
    {
      const M = montar(); const { H } = M, { ctx } = H;
      ctx.tiendaFilaPerfil(ctx.DB.clients[0]); await esperar(30); ctx.tiendaAbrir(); await esperar(40);
      H.S.demora = 300; ctx.tiendaPedir('px'); const pr = ctx.tiendaConfirmarPedido();
      await esperar(20); M.salir(); await esperar(20); M.entrarMenor(); H.S.demora = 0;
      ctx.tiendaFilaPerfil(M.B); await esperar(30); ctx.tiendaAbrir(); await esperar(40);
      await pr; await esperar(60); ctx.tiendaRender();
      const v = vista(H);
      ok(!v.franja && !/Pediste/.test(v.h), '🔴 P2: la cuenta nueva ve «Pediste 1 × …» de la anterior');
      ok(H.pushes.length === 1 && /^Mariana pidió 1 × Quemador X/.test(H.pushes[0][2]), '🔴 P2: el aviso al coach tiene que llevar el nombre de quien pidió (Mariana): ' + JSON.stringify(H.pushes.map(p => p[2])));
      ok(Object.keys(H.cloud.tienda_pedidos).length === 1, 'P2: el pedido sí salió (la respuesta tardía no lo cancela)');
    }
    // P3 · el coach entrega, sale, entra una asesorada y la respuesta llega tarde
    {
      const COACH2 = '0a6484ed-42af-449d-9903-e440ac683ecf';
      const row = { id: 'a', coach_id: COACH2, client_uid: 'u1', client_id: 'u1', client_nombre: 'Laura Prueba', producto_id: 'p1', producto_nombre: 'Preentreno · sachet', precio_unit: 4000, cantidad: 2, estado: 'pendiente', cancelado_por: null, venta_id: null, creado: iso(ahora - 60000), resuelto: null };
      const H = crear(ROOT, { sabotajes, clients: [{ id: 'u1', name: 'Laura Prueba', age: 30 }, { id: 'u9', name: 'Otra Persona', age: 40 }], cloud: { tienda_pedidos: [row] }, servidor: { catalogo: [], costos: { p1: 2720 } } });
      const { ctx } = H; ctx._authUid = COACH2; ctx.CUR.loggedAs = 'coach';
      await ctx.suplCargar(); await ctx.tiendaCoachCargar(true);
      H.S.demora = 250; const pr = ctx.tiendaEntregar('a'); await esperar(10);
      ctx.tiendaReset(); ctx._authUid = null; ctx.CUR.loggedAs = null; ctx.CUR.clientId = null;
      await esperar(10); ctx._authUid = 'u9'; ctx.CUR.loggedAs = 'client'; ctx.CUR.clientId = 'u9';
      const antes = H.toasts.length; await pr; await esperar(200);
      ok(H.toasts.length === antes, '🔴 P3: la asesorada que entró ve un aviso del coach: ' + JSON.stringify(H.toasts.slice(antes)));
      ok(Object.values(H.cloud.tienda_pedidos)[0].estado === 'entregado', 'P3: CONTROL, la entrega sí quedó hecha en el servidor');
    }
    // P4 · recarga de la página: la caché local es de OTRA persona y entra el menor (sin señal)
    {
      const otro = JSON.stringify({ uid: 'uA', c: cat('uA') });
      const H = crear(ROOT, { sabotajes, uid: 'uB', storage: { ax_tienda: otro }, clients: [{ id: 'uB', name: 'Beto Prueba', age: 15 }], servidor: { catalogo: cat, uid: 'uB' } });
      H.ctx._authUid = 'uB'; H.ctx.CUR.clientId = 'uB'; H.net.on = false;
      const f = H.ctx.tiendaFilaPerfil(H.ctx.DB.clients[0]); H.ctx.tiendaAbrir(); await esperar(40);
      const v = vista(H);
      ok(f === '' && !v.cat.length, '🔴 P4: tras recargar el menor ve la caché de otra persona: fila «' + f.replace(/<[^>]+>/g, ' ').trim() + '», catálogo ' + JSON.stringify(v.cat));
      ok(!('ax_tienda' in H.store), 'P4: la caché de otra persona se borra');
    }
  }

  // ═════ Q · «agotado» sin dato fresco, y el «Enviando…» en el botón que se tocó ═════
  {
    for (const [cant, esperado] of [[1, 'Se acaba de agotar.'], [3, 'No quedan tantas. Prueba con menos o pregúntale a tu coach.']]) {
      const H = crear(ROOT, { sabotajes, uid: 'u1', clients: [{ id: 'u1', name: 'Mariana Prueba', age: 33 }], servidor: { catalogo: productosTienda, uid: 'u1', falla: { tienda_pedir: 'agotado' } } });
      const { ctx, el, net } = H;
      ctx.CUR.clientId = 'u1'; await ctx.tiendaCatalogoBajar(); ctx.tiendaAbrir(); await esperar(30);
      ctx.tiendaPedir('p1'); for (let i = 1; i < cant; i++) ctx.tiendaCant(1);
      H.S.falla.tienda_catalogo = 'Failed to fetch';   // la segunda bajada del catálogo falla
      await ctx.tiendaConfirmarPedido(); await esperar(30);
      ok(el('pd-err').textContent === esperado, '🔴 Q: «agotado» con la segunda bajada caída y cantidad ' + cant + ' tiene que decir «' + esperado + '» y dijo «' + el('pd-err').textContent + '»');
    }
    const row = { id: 'a', coach_id: COACH, client_uid: 'u1', client_id: 'u1', client_nombre: 'Laura Prueba', producto_id: 'p1', producto_nombre: 'Preentreno · sachet', precio_unit: 4000, cantidad: 2, estado: 'pendiente', cancelado_por: null, venta_id: null, creado: iso(ahora - 60000), resuelto: null };
    const botones = h => (h.match(/<button[^>]*bsm[^>]*>[^<]*(?:<svg[^]*?<\/svg>)?[^<]*/g) || []).map(b => (/disabled/.test(b) ? 'D' : 'A') + ':' + b.replace(/<button[^>]*>/, '').replace(/<[^>]+>/g, '').trim());
    {   // cancelar: «Enviando…» en CANCELAR
      const H = crear(ROOT, { sabotajes, clients: [{ id: 'u1', name: 'Laura Prueba', age: 30 }], cloud: { tienda_pedidos: [row] }, servidor: { catalogo: [], costos: { p1: 2720 }, demora: 250, rol: 'coach' } });
      const { ctx, el } = H; await ctx.suplCargar(); await ctx.tiendaCoachCargar(true); ctx.tiendaRenderPedidos();
      const pr = ctx.tiendaCancelarCoach('a'); await esperar(10);
      const b = botones(el('pd-list').innerHTML).join(' | ');
      ok(/^D:Entregado \| D:Cuotas \| D:Enviando…$/.test(b), '🔴 Q: al cancelar, «Enviando…» tiene que salir en CANCELAR (y Entregado/Cuotas desactivados): ' + b);
      await pr;
    }
    {   // cuotas: «Enviando…» en el botón del modal y en CUOTAS de la lista
      const H = crear(ROOT, { sabotajes, clients: [{ id: 'u1', name: 'Laura Prueba', age: 30 }], cloud: { tienda_pedidos: [row] }, servidor: { catalogo: [], costos: { p1: 2720 }, demora: 250 } });
      const { ctx, el, llamadas } = H; await ctx.suplCargar(); await ctx.tiendaCoachCargar(true); ctx.tiendaRenderPedidos();
      ctx.tiendaAbrirCuotas('a'); el('cu-abono').value = '2.000';
      const pr = ctx.tiendaCuotasOk(); await esperar(10);
      ok(el('cu-ok').disabled === true && el('cu-ok').textContent === 'Enviando…', '🔴 Q: en el modal de cuotas el botón «Entregar» tiene que pasar a «Enviando…» y desactivarse: ' + el('cu-ok').disabled + ' · ' + el('cu-ok').textContent);
      const b = botones(el('pd-list').innerHTML).join(' | ');
      ok(/^D:Entregado \| D:Enviando… \| D:Cancelar$/.test(b), 'Q: en la lista, «Enviando…» sale en CUOTAS: ' + b);
      ctx.tiendaCuotasOk(); await pr; await esperar(200);
      ok(llamadas.filter(l => l.name === 'tienda_entregar').length === 1 && el('cu-ok').textContent === 'Entregar' && el('cu-ok').disabled === false, 'Q: un segundo toque no entrega dos veces y al terminar el botón vuelve a «Entregar»');
    }
  }

  // ═════ S · La Tienda del coach en el menú: 4 partes y «Quién la ve» ═════
  {
    const hace = d => iso(ahora - d * dia);
    const clientes = [
      { id: 'c1', name: 'Ana Coach', age: 30 }, { id: 'c2', name: 'Beto Coach', age: 41 }, { id: 'c3', name: 'Carla Coach', age: 28 },
      { id: 'p1', name: 'Perla Pro', age: 33, tier: 'libre', proTrialUntil: iso(ahora + 10 * dia) },
      { id: 'l1', name: 'Elena Libre', age: 16, tier: 'libre' }, { id: 'l2', name: 'Fabio Libre', tier: 'libre' }, { id: 'l3', name: 'Gina Libre', age: 25, tier: 'libre', tiendaVer: true },
      { id: '_self', name: 'Yo' },
    ];
    const H = crear(ROOT, { sabotajes, clients: clientes, servidor: { catalogo: [], costos: {} } });
    const { ctx, el } = H; const svs = []; ctx.sv = (k, v) => { svs.push([k, JSON.stringify(v)]); };
    await ctx.suplCargar(); await ctx.tiendaCoachCargar(true);
    ctx.tiendaCoachAbrir(); await esperar(30);
    ok(el('p-tiendac').classList.contains('on') && el('p-productos').classList.contains('on') && !el('p-pedidos').classList.contains('on'), 'S: sin pedidos por entregar, la Tienda abre en Productos');
    ctx.tiendaAbrirPedidos(); await esperar(30);
    ok(el('p-pedidos').classList.contains('on') && !el('p-productos').classList.contains('on') && !el('p-ventas').classList.contains('on') && !el('p-quien').classList.contains('on'), '🔴 S: «Pedidos» (el aviso del celular) abre SOLO la parte Pedidos');
    ctx.tiendaCoachParte('ventas'); await esperar(30);
    const v = el('tc-ventas').innerHTML;
    ok(el('p-ventas').classList.contains('on') && !el('p-pedidos').classList.contains('on') && /Suplementos · aparte de las mensualidades/.test(v) && /Aún no has registrado ventas|Vendido/.test(v), '🔴 S: «Ventas» pinta lo que antes pintaba el reporte de ingresos (suplementos)');
    ctx.tiendaCoachParte('quien'); await esperar(10);
    let q = el('tc-quien').innerHTML;
    ok(el('p-quien').classList.contains('on') && !el('p-ventas').classList.contains('on') && !el('p-pedidos').classList.contains('on') && !el('p-productos').classList.contains('on'), '🔴 S: las 4 partes NO se ven a la vez');
    ok(/Quién ve la tienda/.test(q) && /4 de 7 la ven/.test(q), 'S: «Quién ve la tienda · 4 de 7 la ven» (3 con coach + Gina prendida; el propio coach no cuenta): ' + (q.match(/tq-sub">[^<]*/) || [''])[0]);
    ok(/Con coach · 3/.test(q) && /PRO · 1/.test(q) && /Libres · 3/.test(q), 'S: las pestañas traen los conteos (Con coach 3 · PRO 1 · Libres 3)');
    ok(/Ana Coach/.test(q) && !/Gina Libre|Yo</.test(q), '🔴 S: «Con coach» solo trae a la gente con coach (ni Libres ni el propio coach)');
    ok((q.match(/vt-tg on/g) || []).length === 3, 'S: los 3 con coach salen prendidos (regla por defecto)');
    ctx.tiendaQuienTab('libre'); q = el('tc-quien').innerHTML;
    ok(/Elena Libre/.test(q) && /16 años: sin «No para menores»/.test(q) && /Fabio Libre/.test(q) && /Sin edad: sin «No para menores»/.test(q) && !/Gina Libre[^]*?años/.test(q.split('Gina Libre')[1].split('tq-row')[0]), '🔴 S: a una menor y a quien no tiene edad se les dice «sin «No para menores»»; a una adulta, nada');
    const filaGina = q.split('Gina Libre')[1].split('</button>')[0];
    ok(/vt-tg on/.test(filaGina) && /aria-checked="true"/.test(filaGina), 'S: Gina (Libre con tiendaVer=true) sale prendida');
    const filaElena = q.split('Elena Libre')[1].split('</button>')[0];
    ok(!/vt-tg on/.test(filaElena), 'S: Elena (Libre sin clave) sale apagada');
    // tocar: prende a Elena → explícito true, guarda, el conteo sube
    ctx.tiendaToggleVer('l1');
    const elena = ctx.DB.clients.find(x => x.id === 'l1');
    ok(elena.tiendaVer === true && svs.length === 1 && svs[0][0] === 'ax_c' && /"tiendaVer":true/.test(svs[0][1]), '🔴 S: el interruptor guarda tiendaVer=true EXPLÍCITO en ax_c: ' + JSON.stringify(svs.map(x => x[0])) + ' ' + elena.tiendaVer);
    ok(/5 de 7 la ven/.test(el('tc-quien').innerHTML), 'S: el conteo se actualiza (5 de 7)');
    // apagar a una con coach → false explícito
    ctx.tiendaToggleVer('c1');
    ok(ctx.DB.clients.find(x => x.id === 'c1').tiendaVer === false && /4 de 7 la ven/.test(el('tc-quien').innerHTML), '🔴 S: apagar a alguien con coach deja tiendaVer=false explícito');
    // el propio coach no se toca
    ctx.tiendaToggleVer('_self'); ok(!('tiendaVer' in ctx.DB.clients.find(x => x.id === '_self')), 'S: el propio coach no tiene interruptor');
    // con pedidos por entregar, el menú abre en Pedidos
    H.cloud.tienda_pedidos.z = { id: 'z', coach_id: COACH, client_uid: 'c1', client_id: 'c1', client_nombre: 'Ana Coach', producto_id: 'p1', producto_nombre: 'Preentreno · sachet', precio_unit: 4000, cantidad: 1, estado: 'pendiente', creado: hace(0), resuelto: null };
    await ctx.tiendaCoachCargar(true); ctx.tiendaCoachAbrir(); await esperar(30);
    ok(el('p-pedidos').classList.contains('on') && !el('p-productos').classList.contains('on'), 'S: con pedidos por entregar, el menú abre en Pedidos');
  }

  // ═════ T · Ficha → Compras: el interruptor «Ve la tienda» y lo que ha comprado ═════
  {
    const clientes = [{ id: 'c1', name: 'Ana Coach', age: 30 }, { id: 'l1', name: 'Elena Libre', age: 16, tier: 'libre' }, { id: '_self', name: 'Yo' }];
    const H = crear(ROOT, { sabotajes, clients: clientes, servidor: { catalogo: [], costos: {} } });
    const { ctx, el } = H; const svs = []; ctx.sv = (k, v) => { svs.push(k); };
    await ctx.suplCargar();
    ctx.CUR.clientId = 'c1'; ctx.renderDetailCompras('c1');
    let ver = el('d-compras-ver').innerHTML;
    ok(/Ve la tienda/.test(ver) && /La prendes o la apagas tú/.test(ver) && /vt-tg on/.test(ver), '🔴 T: en Compras sale «Ve la tienda · La prendes o la apagas tú» con el interruptor (Ana, con coach: prendido)');
    ok(/Te debe en suplementos/.test(el('d-ventas').innerHTML) && /Ha comprado/.test(el('d-ventas').innerHTML), '🔴 T: Compras trae «Te debe en suplementos» y «Ha comprado»');
    ctx.tiendaToggleVer('c1'); ctx.renderDetailCompras('c1');
    ok(!/vt-tg on/.test(el('d-compras-ver').innerHTML) && svs.length === 1 && ctx.DB.clients[0].tiendaVer === false, '🔴 T: apagarla desde la ficha guarda tiendaVer=false y el interruptor se apaga');
    ctx.CUR.clientId = 'l1'; ctx.renderDetailCompras('l1');
    ver = el('d-compras-ver').innerHTML;
    ok(!/vt-tg on/.test(ver) && /16 años: sin «No para menores»/.test(ver), 'T: una Libre menor sale apagada y con su nota');
    ctx.tiendaToggleVer('l1'); ok(ctx.DB.clients[1].tiendaVer === true && /vt-tg on/.test(el('d-compras-ver').innerHTML), 'T: prenderla desde la ficha la deja explícita en true');
    ctx.renderDetailCompras('_self');
    ok(el('d-ventas').innerHTML === '' && /Esta es tu propia ficha: no te vendes a ti mismo/.test(el('d-compras-ver').innerHTML) && !/vt-tg/.test(el('d-compras-ver').innerHTML), '🔴 T: en la ficha del propio coach, Compras NO queda en blanco: dice que es su propia ficha y no trae interruptor ni compras');
    ctx.renderDetailCompras('c1'); ok(/vt-tg/.test(el('d-compras-ver').innerHTML), 'T: CONTROL, en la ficha de una persona Compras sí trae el interruptor');
  }

  // ═════ U · Apagar «Ve la tienda» NO esconde al coach lo que esa persona ya pidió ═════
  {
    const hace = ms => iso(ahora - ms);
    const ped = { id: 'u-p1', coach_id: COACH, client_uid: 'c1', client_id: 'c1', client_nombre: 'Ana Coach', producto_id: 'p1', producto_nombre: 'Preentreno · sachet', precio_unit: 4000, cantidad: 1, estado: 'pendiente', cancelado_por: null, venta_id: null, creado: hace(60000), resuelto: null };
    const H = crear(ROOT, { sabotajes, clients: [{ id: 'c1', name: 'Ana Coach', age: 30 }], cloud: { tienda_pedidos: [ped] }, servidor: { catalogo: productosTienda, costos: { p1: 2720 } } });
    const { ctx, el } = H; ctx.sv = () => {};
    await ctx.suplCargar(); await ctx.tiendaCoachCargar(true);
    ctx.tiendaToggleVer('c1');
    ok(ctx.DB.clients[0].tiendaVer === false && ctx.tiendaVeTienda(ctx.DB.clients[0]) === false, 'U: CONTROL, Ana quedó con la tienda APAGADA');
    await ctx.tiendaCoachCargar(true); ctx.tiendaRenderPedidos(); ctx.tiendaRenderHome(); await esperar(30);
    ok(ctx.tiendaPorEntregar().length === 1, '🔴 U: con la tienda apagada, su pedido pendiente sigue en «por entregar» (' + ctx.tiendaPorEntregar().length + ')');
    ok(/Ana Coach · 1 × Preentreno · sachet/.test(el('pd-list').innerHTML) && el('pd-sub').textContent === '1 por entregar', '🔴 U: Tienda → Pedidos sigue mostrando el pedido de Ana: «' + el('pd-sub').textContent + '»');
    ok(/Tienda · 1 pedido por entregar/.test(el('h-tienda').innerHTML), '🔴 U: la tarjeta de la Tienda en el Inicio sigue diciendo «1 pedido por entregar»');
    ctx.tiendaToggleVer('c1'); ok(ctx.DB.clients[0].tiendaVer === true && ctx.tiendaPorEntregar().length === 1, 'U: CONTROL, prenderla otra vez tampoco cambia el pedido');
  }

  if (fallas.length) { console.error('FALLA (' + fallas.length + ')' + (SAB ? ' [sabotaje ' + SAB + ']' : '') + ':\n - ' + fallas.join('\n - ')); process.exit(1); }
  console.log('OK');
})().catch(e => { console.error('ERROR' + (fallas.length ? ' tras ' + fallas.length + ' fallas:\n - ' + fallas.join('\n - ') + '\n' : ' ') + (e && e.stack)); process.exit(2); });
