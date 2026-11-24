// Corre varios casos SAB de un arnés de a N a la vez y devuelve [{k,status,stderr}] por stdout (JSON).
// SOLO lo usa avi.test.js cuando corre en CI (process.env.CI): ahí hay 7 GB y ningún Chrome ajeno. En local los casos van EN SERIE
// (la PC del dueño tiene poca memoria). Uso: node _paralelo.cjs <script.cjs> <N> <caso1> <caso2> ...
'use strict';
const { spawn } = require('child_process');
const [script, n, ...casos] = process.argv.slice(2);
const res = [], cola = casos.slice(); let vivos = 0;
const lanzar = () => {
  while (vivos < Number(n) && cola.length) {
    const k = cola.shift(); vivos++;
    let err = '';
    const p = spawn(process.execPath, [script], { env: Object.assign({}, process.env, { SAB: k }) });
    p.stdout.on('data', () => {}); p.stderr.on('data', d => { err += d; });
    p.on('close', code => { vivos--; res.push({ k, status: code, stderr: err }); if (cola.length) lanzar(); else if (!vivos) process.stdout.write(JSON.stringify(res)); });
  }
};
lanzar();
