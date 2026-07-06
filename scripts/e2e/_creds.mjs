// Credenciales de la cuenta de PRUEBA para los harnesses E2E.
// NUNCA hardcodear aquí (el repo es público): se leen de
//   %USERPROFILE%\.avi\e2e-creds.json   → {"email":"...","pass":"..."}
// o de las variables de entorno AVI_E2E_EMAIL / AVI_E2E_PASS.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

let email = process.env.AVI_E2E_EMAIL || '';
let pass = process.env.AVI_E2E_PASS || '';
if (!email || !pass) {
  try {
    const j = JSON.parse(readFileSync(join(homedir(), '.avi', 'e2e-creds.json'), 'utf8'));
    email = email || j.email || '';
    pass = pass || j.pass || '';
  } catch {}
}
if (!email || !pass) {
  console.error('❌ Faltan credenciales E2E: crea %USERPROFILE%\\.avi\\e2e-creds.json con {"email":"...","pass":"..."} o exporta AVI_E2E_EMAIL / AVI_E2E_PASS.');
  process.exit(1);
}
export const EMAIL = email, PASS = pass;
