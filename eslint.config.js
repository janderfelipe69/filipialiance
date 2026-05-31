// ============================================================
// eslint.config.js — ESLint (flat config) para o Mercadão Aliance
//
// O projeto é vanilla JS, carregado via <script> síncronos no
// index.html, sem módulos (sourceType: "script"). Os módulos se
// comunicam por globais em `window.*`. Esta config foca em pegar
// BUGS REAIS (no-undef, no-dupe-keys, no-unreachable, etc.) e
// silencia regras de estilo — o objetivo é uma rede de segurança,
// não reformatar 58k linhas.
//
// Rodar:  npm run lint
// ============================================================
const js = require('@eslint/js');
const globals = require('globals');

// Globais que o próprio projeto define (window.*/global.* dentro de
// IIFEs) e referencia sem prefixo em outros arquivos. A lista é
// GERADA, não mantida à mão — regenere após adicionar novos módulos:
//
//   node -e 'const fs=require("fs");const names=new Set();const A=/(?:window|global|self|globalThis)\.([A-Za-z_]\w*)\s*=/g,D=/^(?:async\s+)?(?:var|let|const|function)\s+([A-Za-z_]\w*)/gm,P=/Object\.defineProperty\(\s*(?:window|global|self|globalThis)\s*,\s*[\x27"]([A-Za-z_]\w*)[\x27"]/g;for(const f of fs.readdirSync("js").filter(f=>f.endsWith(".js"))){const s=fs.readFileSync("js/"+f,"utf8");let m;while(m=A.exec(s))names.add(m[1]);while(m=D.exec(s))names.add(m[1]);while(m=P.exec(s))names.add(m[1]);}const r=new Set(["if","for","while","return","function","var","let","const"]);const o={};[...names].sort().forEach(n=>{if(!r.has(n))o[n]="writable"});fs.writeFileSync("eslint-globals.json",JSON.stringify(o,null,2)+"\n")'
//
const projectGlobals = require('./eslint-globals.json');

module.exports = [
  js.configs.recommended,
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...projectGlobals,
      },
    },
    rules: {
      // ── Bugs reais (mantidos como erro) ──
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-unreachable': 'error',
      'no-cond-assign': ['error', 'except-parens'],
      'no-dupe-else-if': 'error',
      'no-self-assign': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],

      // ── Ruído em código legado: rebaixado/desligado ──
      'no-unused-vars': ['warn', { args: 'none', varsIgnorePattern: '^_' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-undef': 'error',
      'no-redeclare': 'off', // padrão IIFE redeclara helpers entre arquivos
      'no-prototype-builtins': 'off',
      'no-control-regex': 'off',
      'no-useless-escape': 'off',
      'no-fallthrough': 'off',
    },
  },
];
