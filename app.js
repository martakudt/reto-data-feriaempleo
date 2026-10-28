// ============ REGLAS DEL JUEGO ============
const POINTS_CORRECT = 100;
const POINTS_SPEED = 50;          // bonus máximo si respondes al instante
const FEEDBACK_MS = 1500;         // tiempo que se ve el acierto/fallo antes de pasar
const SECTION_INTRO_MS = 1600;
const RANKING_SIZE = 20;
const STAND_SIZE = 10;
const MAX_SCORE = QUESTIONS.length * (POINTS_CORRECT + POINTS_SPEED);

// ============ ALMACENAMIENTO ============
// leaderboard/{id}: público (nombre y puntuación). contacts/{id}: privado (email y LinkedIn).
// id = hash del email, así cada email solo puede participar una vez.
const store = firebaseConfig.apiKey ? firestoreStore() : localStore();

function firestoreStore() {
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  return {
    async hasPlayed(id) {
      if (firebase.auth && firebase.auth().currentUser) return false; // la admin puede repetir para hacer pruebas
      return (await db.collection('leaderboard').doc(id).get()).exists;
    },
    async save(id, entry, contact) {
      const createdAt = firebase.firestore.FieldValue.serverTimestamp();
      const batch = db.batch();
      batch.set(db.collection('leaderboard').doc(id), { ...entry, createdAt });
      batch.set(db.collection('contacts').doc(id), { ...contact, createdAt });
      try {
        await batch.commit();
      } catch (err) {
        // Las reglas no permiten sobrescribir: el email ya tenía una puntuación
        if (err.code === 'permission-denied') throw new Error('already-played');
        throw err;
      }
    },
    watch(cb) {
      return db.collection('leaderboard').onSnapshot(
        snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
        err => console.error('Ranking:', err)
      );
    }
  };
}

function localStore() {
  const KEY = 'reto-data-demo';
  const listeners = new Set();
  const read = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || { leaderboard: {}, contacts: {} }; }
    catch (_) { return { leaderboard: {}, contacts: {} }; }
  };
  const list = () => Object.entries(read().leaderboard).map(([id, e]) => ({ id, ...e }));
  const notify = () => listeners.forEach(cb => cb(list()));
  window.addEventListener('storage', e => { if (e.key === KEY) notify(); });
  document.getElementById('demo-banner').hidden = false;

  return {
    async hasPlayed(id) { return id in read().leaderboard; },
    async save(id, entry, contact) {
      const data = read();
      if (id in data.leaderboard) throw new Error('already-played');
      const createdAt = Date.now();
      data.leaderboard[id] = { ...entry, createdAt };
      data.contacts[id] = { ...contact, createdAt };
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) {}
      notify();
    },
    watch(cb) {
      listeners.add(cb);
      cb(list());
      return () => listeners.delete(cb);
    }
  };
}

// ============ UTILIDADES ============
const $ = id => document.getElementById(id);

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatTime(ms) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function emailId(email) {
  const text = 'reto-data:' + email;
  if (window.crypto && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
  }
  // Sin contexto seguro (http en red local): hash sencillo, suficiente para la demo
  let h = 5381;
  for (const c of text) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0;
  return 'h' + h.toString(16);
}

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
}

const KEYWORDS = {
  sql: new Set(['SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'COUNT', 'AVG', 'NULL']),
  python: new Set(['def', 'return', 'for', 'in', 'if', 'print', 'range', 'sorted', 'list', 'zip'])
};

function highlight(code, section) {
  const keywords = KEYWORDS[section] || new Set();
  return code.split(/("[^"\n]*"|'[^'\n]*'|\b\d+\b|\b[A-Za-z_]+\b)/).map((part, i) => {
    const safe = escapeHtml(part);
    if (i % 2 === 0 || !part) return safe;
    if (/^["']/.test(part)) return `<span class="str">${safe}</span>`;
    if (/^\d/.test(part)) return `<span class="num">${safe}</span>`;
    if (keywords.has(part)) return `<span class="kw">${safe}</span>`;
    return safe;
  }).join('');
}

function sqlTableHtml() {
  const head = SQL_TABLE.columns.map(c => `<th>${c}</th>`).join('');
  const rows = SQL_TABLE.rows.map(r =>
    `<tr>${r.map(v => v === null ? '<td class="null">NULL</td>' : `<td>${escapeHtml(v)}</td>`).join('')}</tr>`
  ).join('');
  return `<p class="sql-caption">Tabla ${SQL_TABLE.name}</p><table class="sql-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`;
}

// ============ NAVEGACIÓN ============
const VIEWS = ['login', 'home', 'register', 'section', 'quiz', 'result', 'ranking', 'stand'];

function show(view) {
  VIEWS.forEach(v => { $('view-' + v).hidden = v !== view; });
  window.scrollTo(0, 0);
  if (view === 'ranking') renderRanking();
  if (view === 'stand') renderStand();
}

function go(view) {
  if (view !== 'quiz' && view !== 'section') stopQuiz();
  show(view);
  const hash = view === 'ranking' ? '#ranking' : view === 'stand' ? '#pantalla' : '';
  if (location.hash !== hash) history.pushState(null, '', hash || location.pathname + location.search);
}

function route() {
  stopQuiz();
  if (locked) return show('login');
  const hash = location.hash.slice(1);
  show(hash === 'ranking' ? 'ranking' : hash === 'pantalla' ? 'stand' : 'home');
}

window.addEventListener('popstate', route);

// ============ REGISTRO ============
let player = null;

[['f-interest', INTERESTS], ['f-status', STATUSES]].forEach(([id, list]) => {
  $(id).insertAdjacentHTML('beforeend', list.map(v => `<option>${escapeHtml(v)}</option>`).join(''));
});

$('register-form').addEventListener('submit', async e => {
  e.preventDefault();
  const name = $('f-name').value.trim().replace(/\s+/g, ' ');
  const email = $('f-email').value.trim().toLowerCase();
  let linkedin = $('f-linkedin').value.trim();
  const interest = $('f-interest').value;
  const status = $('f-status').value;
  const consent = $('f-consent').checked;

  const fail = (msg, field) => {
    $('register-error').textContent = msg;
    document.querySelectorAll('.form-input').forEach(el => el.classList.toggle('error', el === field));
    if (field) field.focus();
  };

  if (name.length < 2) return fail('Escribe tu nombre.', $('f-name'));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Revisa el email.', $('f-email'));
  if (linkedin && !/linkedin\./i.test(linkedin)) return fail('Pega la URL de tu perfil de LinkedIn.', $('f-linkedin'));
  if (!interest) return fail('Elige qué te interesa más.', $('f-interest'));
  if (!status) return fail('Dinos en qué momento estás.', $('f-status'));
  if (!consent) return fail('Necesitamos tu consentimiento para guardar la puntuación.', null);
  if (linkedin && !/^https?:\/\//i.test(linkedin)) linkedin = 'https://' + linkedin;
  fail('', null);

  const btn = $('register-btn');
  btn.disabled = true;
  btn.textContent = 'Comprobando…';
  try {
    const id = await emailId(email);
    let played = false;
    try { played = await withTimeout(store.hasPlayed(id), 5000); } catch (_) { /* sin conexión: se comprueba al guardar */ }
    if (played) return fail('Este email ya ha participado. ¡Busca tu nombre en el ranking!', $('f-email'));
    player = { id, name, email, linkedin, interest, status, consent };
    startQuiz();
  } finally {
    btn.disabled = false;
    btn.textContent = '¡Vamos! →';
  }
});

// ============ QUIZ ============
let quiz = null;

function startQuiz() {
  quiz = {
    i: 0,
    score: 0,
    answers: [],
    options: QUESTIONS.map(q => shuffle(q.options.map((text, idx) => ({ text, correct: idx === q.answer })))),
    timers: [],
    locked: true
  };
  nextStep();
}

function stopQuiz() {
  if (!quiz) return;
  quiz.timers.forEach(clearTimeout);
  quiz = null;
}

function later(fn, ms) {
  quiz.timers.push(setTimeout(fn, ms));
}

function nextStep() {
  if (quiz.i >= QUESTIONS.length) return finishQuiz();
  const q = QUESTIONS[quiz.i];
  const prev = QUESTIONS[quiz.i - 1];
  if (!prev || prev.section !== q.section) {
    const keys = Object.keys(SECTIONS);
    const s = SECTIONS[q.section];
    $('section-n').textContent = `Ronda ${keys.indexOf(q.section) + 1} de ${keys.length}`;
    $('section-t').textContent = s.label;
    $('section-d').textContent = s.desc;
    show('section');
    later(renderQuestion, SECTION_INTRO_MS);
  } else {
    renderQuestion();
  }
}

function renderQuestion() {
  const q = QUESTIONS[quiz.i];
  const opts = quiz.options[quiz.i];
  const mono = q.section !== 'ml';

  $('q-section').textContent = SECTIONS[q.section].label;
  $('q-progress').textContent = `${quiz.i + 1} / ${QUESTIONS.length}`;
  $('q-score').textContent = `${quiz.score} pts`;
  $('q-body').innerHTML = `
    ${q.table ? sqlTableHtml() : ''}
    ${q.code ? `<pre class="code">${highlight(q.code, q.section)}</pre>` : ''}
    <p class="q-prompt">${escapeHtml(q.prompt)}</p>
    <div class="options">
      ${opts.map((o, k) => `
        <button class="option" data-k="${k}">
          <span class="option-key">${'ABCD'[k]}</span>
          <span class="option-text${mono ? ' mono' : ''}">${escapeHtml(o.text)}</span>
        </button>`).join('')}
    </div>
    <p class="feedback" id="q-feedback" hidden></p>`;
  $('q-body').querySelectorAll('.option').forEach(btn => {
    btn.addEventListener('click', () => answer(Number(btn.dataset.k)));
  });
  show('quiz');

  const bar = $('q-timer');
  bar.classList.remove('running', 'paused');
  void bar.offsetWidth; // reinicia la animación
  bar.style.animationDuration = q.time + 's';
  bar.classList.add('running');

  quiz.locked = false;
  quiz.qStart = performance.now();
  later(() => answer(-1), q.time * 1000);
}

function answer(k) {
  if (!quiz || quiz.locked) return;
  quiz.locked = true;
  quiz.timers.forEach(clearTimeout);
  quiz.timers = [];

  const q = QUESTIONS[quiz.i];
  const opts = quiz.options[quiz.i];
  const limit = q.time * 1000;
  const ms = Math.min(performance.now() - quiz.qStart, limit);
  const correct = k >= 0 && opts[k].correct;
  const points = correct ? POINTS_CORRECT + Math.round(POINTS_SPEED * (1 - ms / limit)) : 0;

  quiz.score += points;
  quiz.answers.push({ choice: k >= 0 ? opts[k].text : null, correct, points, ms });

  $('q-timer').classList.add('paused');
  $('q-score').textContent = `${quiz.score} pts`;
  $('q-body').querySelectorAll('.option').forEach((btn, idx) => {
    btn.disabled = true;
    if (opts[idx].correct) btn.classList.add('correct');
    else if (idx === k) btn.classList.add('wrong');
    else btn.classList.add('dim');
  });

  const fb = $('q-feedback');
  fb.innerHTML = correct
    ? `<strong class="ok">¡Correcto! +${points} pts</strong>`
    : `<strong class="ko">${k < 0 ? '¡Tiempo!' : 'Casi…'}</strong> La buena está en verde.`;
  fb.hidden = false;

  later(() => { quiz.i++; nextStep(); }, correct ? FEEDBACK_MS : FEEDBACK_MS + 600);
}

document.addEventListener('keydown', e => {
  if (!quiz || quiz.locked || $('view-quiz').hidden) return;
  const k = 'abcd'.indexOf(e.key.toLowerCase());
  const n = '1234'.indexOf(e.key);
  if (k >= 0 || n >= 0) answer(k >= 0 ? k : n);
});

// ============ RESULTADO ============
let lastResult = null;

function finishQuiz() {
  const correct = quiz.answers.filter(a => a.correct).length;
  const timeMs = Math.round(quiz.answers.reduce((t, a) => t + a.ms, 0));
  lastResult = { id: player.id, score: quiz.score, correct, timeMs, answers: quiz.answers, bySection: correctBySection(quiz.answers) };
  stopQuiz();

  const ratio = correct / QUESTIONS.length;
  $('r-title').innerHTML = ratio >= 0.8 ? 'Nivel <span>experto</span>'
    : ratio >= 0.5 ? '¡Muy <span>bien!</span>'
    : 'Buen <span>intento</span>';
  renderReview();
  renderResultStats();
  show('result');
  saveResult();
}

// Aciertos por ronda: { sql: n, ml: n, python: n }
function correctBySection(answers) {
  const out = Object.fromEntries(Object.keys(SECTIONS).map(s => [s, 0]));
  QUESTIONS.forEach((q, i) => { if (answers[i].correct) out[q.section]++; });
  return out;
}

async function saveResult() {
  const r = lastResult;
  const entry = { name: player.name, score: r.score, correct: r.correct, timeMs: r.timeMs };
  const contact = {
    ...entry, ...r.bySection,
    email: player.email, linkedin: player.linkedin,
    interest: player.interest, status: player.status, consent: player.consent
  };
  $('r-error').textContent = 'Guardando tu puntuación…';
  try {
    await store.save(player.id, entry, contact);
    $('r-error').textContent = '';
    r.saved = true;
  } catch (err) {
    console.error(err);
    $('r-error').innerHTML = err.message === 'already-played'
      ? 'Este email ya había participado: en el ranking cuenta tu primera puntuación.'
      : 'No se ha podido guardar. Revisa la conexión y <button class="btn btn-outline-light" onclick="saveResult()">Reintentar</button>';
  }
  renderResultStats();
}

function renderResultStats() {
  const r = lastResult;
  if (!r) return;
  const pos = r.saved ? sortedEntries().findIndex(e => e.id === r.id) + 1 : 0;
  $('r-stats').innerHTML = `
    <div class="stat featured">
      <div class="stat-label">Puntuación</div>
      <div class="stat-value">${r.score}<span> / ${MAX_SCORE}</span></div>
    </div>
    <div class="stat">
      <div class="stat-label">Aciertos</div>
      <div class="stat-value">${r.correct}<span>/${QUESTIONS.length}</span></div>
    </div>
    <div class="stat">
      <div class="stat-label">Tiempo</div>
      <div class="stat-value">${formatTime(r.timeMs)}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Posición</div>
      <div class="stat-value">${pos ? `#${pos}<span> de ${entries.length}</span>` : '–'}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Por rondas</div>
      <div class="stat-value" style="font-size:18px">${Object.keys(SECTIONS).map(s =>
        `${SECTIONS[s].short} ${r.bySection[s]}/${QUESTIONS.filter(q => q.section === s).length}`
      ).join('<br>')}</div>
    </div>`;
}

function renderReview() {
  $('r-review').innerHTML = QUESTIONS.map((q, i) => {
    const a = lastResult.answers[i];
    const right = q.options[q.answer];
    const title = q.code ? q.code.split('\n')[0] : q.prompt;
    return `
      <details class="review-item">
        <summary>
          <span class="review-mark ${a.correct ? 'ok' : 'ko'}">${a.correct ? '✓' : '✗'}</span>
          <span class="review-q">${escapeHtml(title)}</span>
          <span class="review-pts">+${a.points}</span>
        </summary>
        <div class="review-body">
          ${q.code ? `<pre class="code">${highlight(q.code, q.section)}</pre>` : ''}
          ${a.correct ? '' : `<p>Tu respuesta: <strong>${a.choice === null ? 'sin responder' : escapeHtml(a.choice)}</strong></p>`}
          <p>Correcta: <strong>${escapeHtml(right)}</strong></p>
          <p>${escapeHtml(q.explain)}</p>
        </div>
      </details>`;
  }).join('');
}

// ============ RANKING ============
let entries = [];

function sortedEntries() {
  const t = e => (e.createdAt && e.createdAt.toMillis ? e.createdAt.toMillis() : e.createdAt) || Infinity;
  return entries.slice().sort((a, b) => b.score - a.score || a.timeMs - b.timeMs || t(a) - t(b));
}

function rankRow(e, pos, meId) {
  return `
    <li class="rank${e.id === meId ? ' me' : ''}">
      <span class="rank-pos">${pos}</span>
      <span class="rank-name">${escapeHtml(e.name)}</span>
      <span class="rank-meta">${e.correct}/${QUESTIONS.length} · ${formatTime(e.timeMs)}</span>
      <span class="rank-score">${e.score}</span>
    </li>`;
}

function rankingHtml(size) {
  const sorted = sortedEntries();
  if (!sorted.length) return '<li class="ranking-empty">Todavía no hay nadie. ¡Sé la primera persona!</li>';
  const meId = lastResult && lastResult.saved ? lastResult.id : null;
  let html = sorted.slice(0, size).map((e, i) => rankRow(e, i + 1, meId)).join('');
  const myPos = sorted.findIndex(e => e.id === meId);
  if (myPos >= size) html += `<li class="ranking-gap">···</li>` + rankRow(sorted[myPos], myPos + 1, meId);
  return html;
}

function participants() {
  return entries.length === 1 ? '1 participante' : `${entries.length} participantes`;
}

function renderRanking() {
  $('ranking-list').innerHTML = rankingHtml(RANKING_SIZE);
  $('ranking-count').textContent = participants() + ' · se actualiza en directo';
}

let qrDone = false;
function renderStand() {
  if (!qrDone && window.QRCode) {
    const url = location.origin + location.pathname;
    new QRCode($('stand-qr'), { text: url, width: 240, height: 240, colorDark: '#0D0D0D', colorLight: '#FFFFFF', correctLevel: QRCode.CorrectLevel.M });
    $('stand-url').textContent = url.replace(/^https?:\/\//, '');
    qrDone = true;
  }
  $('stand-list').innerHTML = rankingHtml(STAND_SIZE);
  $('stand-count').textContent = participants();
}

// ============ ARRANQUE ============
// En modo preview (PREVIEW en config.js) solo entra la admin hasta que se abra el reto
let locked = PREVIEW && !!firebaseConfig.apiKey;

function start() {
  locked = false;
  store.watch(list => {
    entries = list;
    if (!$('view-ranking').hidden) renderRanking();
    if (!$('view-stand').hidden) renderStand();
    if (!$('view-result').hidden) renderResultStats();
  });
  route();
}

if (locked) {
  firebase.auth().onAuthStateChanged(user => { if (user && locked) start(); else if (!user) route(); });
  $('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await firebase.auth().signInWithEmailAndPassword($('l-email').value.trim(), $('l-pass').value);
    } catch (_) {
      $('login-error').textContent = 'Email o contraseña incorrectos.';
    }
  });
} else {
  start();
}
