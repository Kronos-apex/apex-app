import { readFileSync, writeFileSync } from 'node:fs';
import { CURADA } from './curada.mjs';
const foods = JSON.parse(readFileSync('./sr-macros.json','utf8'));
const port = JSON.parse(readFileSync('./sr-porciones.json','utf8'));
const RUIDO = ['baby food','babyfood','restaurant','fast food','school lunch','infant formula'];
// Sinónimos de la propia USDA: 'tbsp' y 'tablespoon' son la misma medida y aparecen mezclados.
const SIN = { tablespoon:['tablespoon','tbsp'], teaspoon:['teaspoon','tsp'], cup:['cup'], oz:['oz'],
  medium:['medium'], large:['large'], slice:['slice'], fruit:['fruit'], clove:['clove'] };
// Por PALABRA, no por subcadena: buscando 'wing' (ala) el filtro aceptaba «ste-wing» y devolvia
// gallina de guisar en vez de ala de pollo. Un sustantivo dentro de otro es un falso positivo
// silencioso — y aqui un falso positivo es un alimento equivocado en el plato de alguien.
const pal = (d, w) => {
  const esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(^|[^a-z])' + esc + '([^a-z]|$)').test(d);
};
const sinResolver = [], sinMedida = [], resueltos = [];
for (const it of CURADA) {
  const qs = it.q.map(s=>s.toLowerCase()), nos = (it.no||[]).map(s=>s.toLowerCase()).concat(RUIDO);
  let c = it.fdc ? foods.filter(f=>f.id===it.fdc) : foods.filter(f=>{
    const d = f.desc.toLowerCase();
    if (it.cat && f.cat !== it.cat) return false;
    return qs.every(w=>pal(d,w)) && !nos.some(w=>pal(d,w));
  });
  c.sort((a,b)=>a.desc.length-b.desc.length || a.desc.localeCompare(b.desc));
  if (!c.length) { sinResolver.push(it.es+'  ← '+(it.fdc||it.q.join(' + '))); continue; }
  const f = c[0];
  // ESTRICTO: si la medida pedida no existe para ese alimento, NO se usa otra. Pegar el gramaje
  // de una taza a una etiqueta que dice «cucharada» es exactamente el bug de la avena (15 g
  // declarados contra 5,6 g reales: la persona servía un tercio).
  const alias = SIN[it.porc] || [it.porc.toLowerCase()];
  const ps = port[f.id] || [];
  // `porcNo` descarta variantes de la MISMA medida que no sirven (p. ej. «1 cup, with hulls,
  // edible yield» de las semillas: es el rendimiento de una taza con cáscara, no una taza).
  const pno = (it.porcNo || []).map(s => s.toLowerCase());
  const p = ps.find(x => {
    const t = (x.unidad + ' ' + x.desc).toLowerCase();
    return alias.some(a => t.includes(a)) && !pno.some(a => t.includes(a));
  });
  if (!p) sinMedida.push(it.es+'  (pedía «'+it.porc+'»; tiene: '+ps.slice(0,4).map(x=>x.cant+' '+x.unidad+' '+x.desc).join(' | ')+')');
  resueltos.push({ es: it.es, fdc: f.id, desc: f.desc, cat: f.cat, kcal: f.kcal, p: f.p, c: f.c, f: f.f,
    g: p ? Math.round(p.g) : null, label: it.label, medida: p ? (p.cant+' '+p.unidad+' '+p.desc).trim() : null });
}
writeFileSync('./resueltos.json', JSON.stringify(resueltos,null,1),'utf8');
console.log('resueltos:', resueltos.length, '· sin registro:', sinResolver.length, '· SIN MEDIDA CASERA:', sinMedida.length);
if (sinResolver.length){ console.log('\nSIN REGISTRO:'); sinResolver.forEach(s=>console.log('  '+s)); }
if (sinMedida.length){ console.log('\n⚠️  SIN LA MEDIDA PEDIDA (no se les inventa gramaje):'); sinMedida.forEach(s=>console.log('  '+s)); }
