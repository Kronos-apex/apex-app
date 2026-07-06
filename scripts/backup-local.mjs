// ═══════════════════════════════════════════════════════════════════════
// AVI — Backup local de Supabase (copia FUERA del proyecto cloud)
// ───────────────────────────────────────────────────────────────────────
// Exporta user_data + apex_data + push_subscriptions + cuentas auth a un
// JSON fechado en Desktop\AVI\backups\. Complementa al snapshot diario
// interno (apex_daily_backup, pg_cron): si el proyecto Supabase se pierde
// (cuenta, pausa del free tier, error humano), esta copia sobrevive.
//
// Uso:      node scripts/backup-local.mjs
// Programado: Tarea de Windows "AVI backup Supabase" (diaria 8:00 pm,
//             corre al encender si la PC estaba apagada a esa hora).
//
// Requiere la SERVICE ROLE KEY en:  %USERPROFILE%\.avi\service-role.key
// (Supabase Dashboard → Project Settings → API keys → service_role).
// Esa clave NUNCA va en el repo ni en el frontend — solo en ese archivo.
// ═══════════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const SB_URL = 'https://eoebhrxbokyllqalyecj.supabase.co';
const KEY_FILE = join(homedir(), '.avi', 'service-role.key');
const OUT_DIR = join(homedir(), 'Desktop', 'AVI', 'backups');
const KEEP_FILES = 45; // ~45 días de exports (~40 MB); los más viejos se podan

function die(msg) { console.error('❌ ' + msg); process.exit(1); }

let key;
try { key = readFileSync(KEY_FILE, 'utf8').trim(); }
catch { die(`No existe ${KEY_FILE}\n   Pega ahí la service role key (Supabase Dashboard → Project Settings → API keys → service_role) y vuelve a correr.`); }
if (!key || key.length < 30) die(`${KEY_FILE} está vacío o no parece una service role key.`);

const HDRS = { apikey: key, Authorization: 'Bearer ' + key };

async function fetchTable(name) {
  const r = await fetch(`${SB_URL}/rest/v1/${name}?select=*`, { headers: HDRS });
  if (!r.ok) die(`Supabase respondió ${r.status} al leer ${name}: ${await r.text()}`);
  return r.json();
}

// Cuentas de auth (mapa uid↔email, necesario para restaurar): API admin, paginada.
async function fetchAuthUsers() {
  const users = [];
  for (let page = 1; page <= 20; page++) {
    const r = await fetch(`${SB_URL}/auth/v1/admin/users?page=${page}&per_page=100`, { headers: HDRS });
    if (!r.ok) die(`Supabase respondió ${r.status} al leer auth users: ${await r.text()}`);
    const batch = (await r.json()).users || [];
    // Solo lo necesario para restaurar/cruzar — sin tokens ni metadatos internos.
    users.push(...batch.map(u => ({
      id: u.id, email: u.email, created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at, confirmed_at: u.confirmed_at,
      providers: (u.identities || []).map(i => i.provider),
      user_metadata: u.user_metadata || {}
    })));
    if (batch.length < 100) break;
  }
  return users;
}

const [user_data, apex_data, push_subscriptions, auth_users] = await Promise.all([
  fetchTable('user_data'), fetchTable('apex_data'), fetchTable('push_subscriptions'), fetchAuthUsers()
]);

if (!user_data.length && !apex_data.length) die('Supabase devolvió 0 filas en user_data Y apex_data — no se guarda un backup vacío.');

const now = new Date();
const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
mkdirSync(OUT_DIR, { recursive: true });
const outFile = join(OUT_DIR, `avi-backup-${stamp}.json`);
writeFileSync(outFile, JSON.stringify({
  generated_at: now.toISOString(),
  supabase_project: 'eoebhrxbokyllqalyecj',
  counts: { user_data: user_data.length, apex_data: apex_data.length, push_subscriptions: push_subscriptions.length, auth_users: auth_users.length },
  user_data, apex_data, push_subscriptions, auth_users
}));

// Poda: conserva los KEEP_FILES exports más recientes.
const old = readdirSync(OUT_DIR)
  .filter(f => /^avi-backup-\d{4}-\d{2}-\d{2}\.json$/.test(f))
  .sort().reverse().slice(KEEP_FILES);
old.forEach(f => unlinkSync(join(OUT_DIR, f)));

const kb = Math.round(statSync(outFile).size / 1024);
console.log(`✅ Backup local: ${outFile} (${kb} KB) — user_data ${user_data.length} · apex_data ${apex_data.length} · push ${push_subscriptions.length} · auth ${auth_users.length}${old.length ? ` · podados ${old.length} viejos` : ''}`);
