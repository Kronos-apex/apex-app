// _sonda-recortes.mjs — LA SONDA DE RECORTES CON LETRA GRANDE (19-oct-2026). La comparten la auditoría
// (`_audit-letra-recortes`) y el candado de v716 (`_verify-cortes-letra`): dos copias se separarían.
// Se instala con `await ev(SONDA)` y se llama `window.__qaRec(raíz, {comp})`: con `comp`, cada hallazgo dice
// si cae DENTRO de ese componente (`enComp`), para que un candado afirme sobre lo suyo y no sobre la pantalla entera.
export const SONDA = `window.__qaRec=function(root,opc){
  if(typeof root==='string') root=document.querySelector(root); if(!root) return {falta:true};
  document.querySelectorAll('[data-qrec]').forEach(e=>e.removeAttribute('data-qrec'));
  const vw=document.documentElement.clientWidth;
  const C=new Map(); const cs=el=>{ let s=C.get(el); if(!s){ s=getComputedStyle(el); C.set(el,s); } return s; };
  const V=new Map(); const visible=el=>{ if(!el||el===document.documentElement) return true; if(V.has(el)) return V.get(el);
    const s=cs(el); const v=!(s.display==='none'||s.visibility==='hidden'||parseFloat(s.opacity)<0.05)&&visible(el.parentElement); V.set(el,v); return v; };
  const desc=el=>{ const c=String(typeof el.className==='string'?el.className:((el.className&&el.className.baseVal)||'')).trim().split(/\\s+/).filter(Boolean).slice(0,2).join('.');
    return el.tagName.toLowerCase()+(el.id?'#'+el.id:'')+(c?'.'+c:''); };
  const out={casilla:[],corte:[],puntos:[],clamp:[],partida:[],montados:[],fuera:[]};
  let nTxt=0,nInp=0,k=0;
  const comp=opc&&opc.comp;
  const add=(tipo,el,o)=>{ if(out[tipo].length>=40) return; const q=el.closest('[data-qa]'); el.setAttribute('data-qrec',String(k));
    out[tipo].push(Object.assign({id:k++,el:desc(el),padre:el.parentElement?desc(el.parentElement):'',qa:q?q.getAttribute('data-qa'):null,
      enComp:comp?!!el.closest(comp):null},o)); };
  // 1 · CASILLA
  const cv=document.createElement('canvas').getContext('2d');
  root.querySelectorAll('input,select').forEach(i=>{
    if(i.tagName==='INPUT'&&!/^(text|number|tel|email|search|password|url)$/.test(i.type||'text')) return;
    const r=i.getBoundingClientRect(); if(r.width<4||r.height<4||!visible(i)) return;
    const s=cs(i), esSel=i.tagName==='SELECT';
    let txt=esSel?((i.options[i.selectedIndex]||{}).text||''):(i.value||'');
    const pista=!esSel&&!i.value; if(pista) txt=i.placeholder||'';
    if(!txt.trim()) return;
    if(i.type==='password'&&i.value) txt='\\u2022'.repeat(i.value.length);
    nInp++;
    cv.font=s.fontStyle+' '+s.fontWeight+' '+s.fontSize+' '+s.fontFamily;
    const tw=cv.measureText(txt).width+(parseFloat(s.letterSpacing)||0)*txt.length;
    let util=i.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight);
    if(esSel&&s.appearance!=='none') util-=18;
    if(tw>util+0.5) add('casilla',i,{txt:txt.slice(0,44),pista,mide:+tw.toFixed(1),cabe:+util.toFixed(1)});
  });
  // 2-5 · cada texto visible
  const capa=el=>{ for(let n=el;n&&n!==document.body;n=n.parentElement){ const p=cs(n).position; if(p==='fixed'||p==='sticky') return n; } return document.body; };
  const PAL=/[\\p{L}\\p{N}][\\p{L}\\p{N}.,%$]*[\\p{L}\\p{N}%]/gu;
  const lineas=[];
  const tw=document.createTreeWalker(root,NodeFilter.SHOW_TEXT); let n;
  while((n=tw.nextNode())){
    const t=n.textContent; if(!t.trim()) continue;
    const el=n.parentElement; if(!el||/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|OPTION|TEXTAREA)$/.test(el.tagName)||!visible(el)) continue;
    const rg=document.createRange(); rg.selectNodeContents(n);
    const rects=[...rg.getClientRects()].filter(r=>r.width>0.5&&r.height>0.5); if(!rects.length) continue;
    // Lo VISIBLE de cada renglón: recortado por toda caja que no deja ver lo de fuera (hidden, clip, auto o scroll).
    let vis=rects.map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom}));
    for(let a=el;a&&a!==document.documentElement&&vis.length;a=a.parentElement){
      const s=cs(a), cx=s.overflowX!=='visible', cy=s.overflowY!=='visible'; if(!cx&&!cy) continue;
      const b=a.getBoundingClientRect();
      vis=vis.map(r=>({left:cx?Math.max(r.left,b.left):r.left,right:cx?Math.min(r.right,b.right):r.right,top:cy?Math.max(r.top,b.top):r.top,bottom:cy?Math.min(r.bottom,b.bottom):r.bottom}))
        .filter(r=>r.right-r.left>0.5&&r.bottom-r.top>0.5);
    }
    if(!vis.length) continue;   // escondido entero (acordeón cerrado) o fuera de la vista de su scroller
    nTxt++;
    const txt=t.trim().replace(/\\s+/g,' ');
    // 2 · CORTE: sube por los padres; un scroller (auto/scroll) en un eje hace que lo de más allá se deslice, no se corte.
    let corte=null, sx=false, sy=false;
    for(let a=el;a&&a!==document.documentElement&&!corte;a=a.parentElement){
      const s=cs(a), ox=s.overflowX, oy=s.overflowY;
      const hx=(ox==='hidden'||ox==='clip')&&!sx, hy=(oy==='hidden'||oy==='clip')&&!sy;
      if(hx||hy){
        const b=a.getBoundingClientRect(); if(b.width<=2||b.height<=2) break;   // .sr-only y similares
        for(const r of rects){
          if(hx&&((r.right>b.right+1.5&&r.left<b.right-1)||(r.left<b.left-1.5&&r.right>b.left+1))){ corte={a,eje:'x',falta:Math.round(Math.max(r.right-b.right,b.left-r.left))}; break; }
          if(hy&&((r.bottom>b.bottom+1.5&&r.top<b.bottom-1)||(r.top<b.top-1.5&&r.bottom>b.top+1))){ corte={a,eje:'y',falta:Math.round(Math.max(r.bottom-b.bottom,b.top-r.top))}; break; }
        }
      }
      if(ox==='auto'||ox==='scroll') sx=true;
      if(oy==='auto'||oy==='scroll') sy=true;
    }
    if(corte){
      const s=cs(corte.a);
      // El «…» solo se DIBUJA en una caja de bloque: en una flex/grid (la píldora del coach era inline-flex) el
      // text-overflow se ignora y el texto se corta en seco. Contarlo como recorte a propósito lo escondía.
      const puntos=s.textOverflow==='ellipsis'&&!/flex|grid/.test(s.display);
      const tipo=puntos?'puntos':((s.webkitLineClamp&&s.webkitLineClamp!=='none')?'clamp':'corte');
      add(tipo,el,{txt:txt.slice(0,44),eje:corte.eje,falta:corte.falta,caja:desc(corte.a)});
    } else if(!sx){
      // 5 · FUERA del teléfono (y visible a medias: lo que está entero fuera es un panel corrido a propósito)
      for(const r of rects){ if(r.right>vw+1.5&&r.left<vw-1){ add('fuera',el,{txt:txt.slice(0,44),llega:Math.round(r.right)}); break; } }
    }
    // 3 · PARTIDA: solo un texto de varios renglones puede partir una palabra.
    if(rects.length>1){
      PAL.lastIndex=0; let m;
      while((m=PAL.exec(t))){
        if(m[0].length<3) continue;
        const wr=document.createRange(); wr.setStart(n,m.index); wr.setEnd(n,m.index+m[0].length);
        const tops=[...wr.getClientRects()].filter(r=>r.width>0.5).map(r=>r.top);
        if(tops.length>1&&Math.max(...tops)-Math.min(...tops)>2){ add('partida',el,{txt:m[0],num:/\\p{N}/u.test(m[0]),frase:txt.slice(0,44)}); break; }
      }
    }
    const L=capa(el); vis.forEach(r=>lineas.push({r,el,n,L}));
  }
  // 4 · MONTADOS: dos renglones VISIBLES de textos distintos, en la misma capa, que se pisan de verdad (≥20% del
  // menor). Por franjas de 40 px: casi lineal en las listas largas (la del picker tiene cientos de renglones).
  const vistos=new Set(), franjas=new Map(), pares=new Set();
  lineas.forEach((P,i)=>{ P.i=i; P.r.width=P.r.right-P.r.left; P.r.height=P.r.bottom-P.r.top;
    for(let f=Math.floor(P.r.top/40);f<=Math.floor(P.r.bottom/40);f++){ if(!franjas.has(f)) franjas.set(f,[]); franjas.get(f).push(P); } });
  for(const grupo of franjas.values()) for(let i=0;i<grupo.length;i++){ const P=grupo[i];
    for(let j=i+1;j<grupo.length;j++){ const Q=grupo[j];
      if(P.n===Q.n||P.L!==Q.L) continue;
      const pk=Math.min(P.i,Q.i)+'-'+Math.max(P.i,Q.i); if(pares.has(pk)) continue; pares.add(pk);
      const w=Math.min(P.r.right,Q.r.right)-Math.max(P.r.left,Q.r.left); if(w<=3) continue;
      const h=Math.min(P.r.bottom,Q.r.bottom)-Math.max(P.r.top,Q.r.top); if(h<=3) continue;
      if(w*h<0.2*Math.min(P.r.width*P.r.height,Q.r.width*Q.r.height)) continue;
      const key=desc(P.el)+'|'+desc(Q.el); if(vistos.has(key)) continue; vistos.add(key);
      add('montados',P.el,{txt:P.n.textContent.trim().slice(0,30),con:Q.n.textContent.trim().slice(0,30),otro:desc(Q.el)});
    }
  }
  const nComp=comp?[...root.querySelectorAll(comp)].filter(e=>visible(e)&&e.getBoundingClientRect().width>0).length:null;
  return {nTxt,nInp,nComp,vw,fs:document.documentElement.getAttribute('data-fs')||'normal',out};
}; 1`;
