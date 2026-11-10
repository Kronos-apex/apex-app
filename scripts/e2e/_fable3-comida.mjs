#!/usr/bin/env node
// _fable3-comida.mjs — matriz de extremos de la comida: sexo × edad × peso × altura × objetivo × actividad × embarazo.
// Solo LEE avi-core. Busca: plan bajo el basal o el mínimo por sexo, déficit en menores, déficit con peso bajo,
// embarazo bajo gasto × 1,05, y el día MÁS BAJO de la semana (no solo la base).   node scripts/e2e/_fable3-comida.mjs
import { join } from 'node:path';
import { createRequire } from 'node:module';
const RAIZ = join(import.meta.dirname, '..', '..');
const core = createRequire(join(RAIZ, 'x.js'))('./avi-core.js');
const OBJ = ['Perder grasa', 'Ganar músculo', 'Recomposición', 'Fuerza', 'Resistencia', 'Salud general'];
const rut = n => ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].slice(0, n).map((d, i) => ({ id: 'r' + i, day: d, name: i % 2 ? 'Pierna' : 'Torso', exercises: [{ id: 'e36', name: i % 2 ? 'Prensa de Pierna' : 'Press', muscle: i % 2 ? 'piernas' : 'pecho', sets: 3, reps: 10 }] }));
const H = {}; const anota = (k, d, sev) => { (H[k] = H[k] || []).push({ d, sev }); };
let n = 0;
for (const sex of ['F', 'M']) for (const age of [13, 15, 17, 18, 25, 45, 70, 85]) for (const height of [140, 150, 160, 175, 190])
  for (const bmi of [15, 17, 18.4, 20, 25, 30, 40, 50]) for (const goal of OBJ) for (const af of [1.2, 1.55, 1.9])
    for (const notes of sex === 'F' ? ['', 'estoy embarazada de 5 meses', 'postparto, doy pecho a mi bebe'] : ['']) {
      const weight = Math.round(bmi * (height / 100) ** 2 * 10) / 10;
      const c = { sex, age, height, weight, goal, activityFactor: af, notes, days: 3 };
      const est = core.nutritionEstimate(c); n++;
      const caso = `${sex} ${age}a ${height}cm ${weight}kg (IMC ${bmi}) «${goal}» act ${af}${notes ? ' · ' + notes : ''}`;
      if (!est) { anota('SIN_ESTIMACION', caso, 0); continue; }
      const base = core.nutBaseFor(c, null);
      const piso = Math.max(sex === 'M' ? 1500 : 1200, Math.round(est.tmb));
      const emb = /embarazada/.test(notes);
      if (base.kcalObj !== est.kcalObj) anota('BASE_DISTINTA_A_ESTIMACION', `${caso} → ${base.kcalObj} vs ${est.kcalObj}`, base.kcalObj - est.kcalObj);
      if (est.kcalObj < piso) anota('BAJO_EL_BASAL_O_MINIMO', `${caso} → ${est.kcalObj} < piso ${piso}`, piso - est.kcalObj);
      if (age < 18 && est.kcalObj < est.tdee) anota('MENOR_BAJO_SU_GASTO', `${caso} → ${est.kcalObj} < gasto ${est.tdee}`, est.tdee - est.kcalObj);
      if (emb && est.kcalObj < Math.round(est.tdee * 1.05) - 1) anota('EMBARAZO_BAJO_GASTOx1.05', `${caso} → ${est.kcalObj} < ${Math.round(est.tdee * 1.05)}`, est.tdee * 1.05 - est.kcalObj);
      if (!emb && age >= 18 && bmi < 18.5 && est.kcalObj < est.tdee) anota('DEFICIT_CON_PESO_BAJO(IMC<18,5)', `${caso} → ${est.kcalObj} (gasto ${est.tdee}, ${est.kcalObj - est.tdee}) rótulo «${est.label}»`, est.tdee - est.kcalObj);
      if (!emb && age >= 70 && est.kcalObj < est.tdee - 300) anota('DEFICIT_GRANDE_70+', `${caso} → ${est.kcalObj - est.tdee}`, est.tdee - est.kcalObj);
      if (est.macros && est.macros.carb_g < 100) anota('CARBO_MENOR_A_100g', `${caso} → ${est.macros.carb_g} g`, 100 - est.macros.carb_g);
      if (est.macros && est.macros.prot_g / weight > 2.6) anota('PROTEINA_MAYOR_A_2,6g/kg', `${caso} → ${est.macros.prot_g} g`, est.macros.prot_g / weight);
      // el día más bajo de la semana
      for (const dias of [0, 3, 5]) {
        let wk; try { wk = core.nutWeekTargets(base, rut(dias)); } catch (e) { anota('REVIENTA_SEMANA', caso + ' ' + e.message, 0); continue; }
        const lista = Array.isArray(wk) ? wk : (wk && (wk.days || wk.dias)) || [];
        const ks = lista.map(d => d && (d.kcal != null ? d.kcal : d.target && d.target.kcal)).filter(x => x > 0);
        if (!ks.length) { anota('SEMANA_SIN_NUMEROS', JSON.stringify(wk).slice(0, 200), 0); continue; }
        const min = Math.min(...ks);
        if (min < piso) anota('DIA_BAJO_EL_BASAL_O_MINIMO', `${caso} · ${dias} días → día más bajo ${min} < piso ${piso} (base ${base.kcalObj})`, piso - min);
        if (emb && min < est.tdee) anota('EMBARAZO_DIA_BAJO_SU_GASTO', `${caso} · ${dias} días → día ${min} < gasto ${est.tdee} (base ${base.kcalObj})`, est.tdee - min);
        if (age < 18 && min < est.tdee) anota('MENOR_DIA_BAJO_SU_GASTO', `${caso} · ${dias} días → día ${min} < gasto ${est.tdee} (base ${base.kcalObj})`, est.tdee - min);
      }
    }
console.log('casos:', n);
for (const [k, l] of Object.entries(H)) { l.sort((a, b) => b.sev - a.sev); console.log(`\n❌ ${k}: ${l.length} casos. Peores:`); l.slice(0, 4).forEach(x => console.log('    ' + x.d)); }
// embarazo escrito como no se lee + «Perder grasa»
console.log('\n── embarazo que la nota NO lee, con «Perder grasa» (F 28a 160cm 70kg act 1,55) ──');
for (const notes of ['estoy embarazada', 'embarasada de 4 meses', 'enbarazada', 'estoy encinta', 'tengo 20 semanas', 'estoy esperando', 'mi esposo y yo esperamos un bebe']) {
  const e = core.nutritionEstimate({ sex: 'F', age: 28, height: 160, weight: 70, goal: 'Perder grasa', activityFactor: 1.55, notes });
  console.log(`  «${notes}» → ${e.kcalObj} kcal (gasto ${e.tdee}, ${e.kcalObj - e.tdee}) «${e.label.slice(0, 60)}»`);
}
// v728 vigencia
console.log('\n── v728 vigencia ──');
const D = 86400000, t0 = Date.parse('2026-01-01T12:00:00Z');
console.log(' sello al crear con «hipertension»:', core.limitReviewStamp('', 'hipertension', null, 'AHORA'), '· misma condición otra redacción:', core.limitReviewStamp('hipertension', 'soy hipertensa, tomo losartan', 'VIEJO', 'AHORA'), '· cambia:', core.limitReviewStamp('hipertension', 'hipertension y osteoporosis', 'VIEJO', 'AHORA'), '· se quita:', core.limitReviewStamp('hipertension', '', 'VIEJO', 'AHORA'), '· solo zona (rodilla):', core.limitReviewStamp('', 'dolor de rodilla', null, 'AHORA'));
for (const [nota, d] of [['embarazada', 89], ['embarazada', 90], ['hipertension', 179], ['hipertension', 180], ['osteoporosis', 180], ['diastasis', 90], ['dolor de rodilla', 400], ['embarasada', 400]]) {
  const c = { selfReg: true, notes: nota, limitReviewedAt: new Date(t0).toISOString() };
  const r = core.limitReview(c, t0 + d * D), a = core.limitReviewAsk(c, t0 + d * D);
  console.log(`  «${nota}» a los ${d} días → coach: ${r ? 'REVISAR ' + JSON.stringify(r.conds) : 'nada'} · ella: ${a ? '«' + core.limitReviewAskText(a).slice(0, 90) + '»' : 'nada'}`);
}
const c2 = { selfReg: true, notes: 'hipertension' }; console.log('  sin fecha (cuenta vieja):', JSON.stringify(core.limitReview(c2, t0)));
const c3 = { selfReg: true, notes: 'embarazada', limitReviewedAt: new Date(t0).toISOString(), limitAsk: { at: new Date(t0 + 95 * D).toISOString(), r: 'cambio' } };
console.log('  tras responder «Cambió» (día 100): claves siguen', JSON.stringify(core.limitationsFor(c3, t0 + 100 * D).keys), '· le vuelve a preguntar:', !!core.limitReviewAsk(c3, t0 + 100 * D), '· día 200:', !!core.limitReviewAsk(c3, t0 + 200 * D));
