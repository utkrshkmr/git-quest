// ===================== GIT QUEST — UI =====================
(function () {
'use strict';
const { LV, CH, SANDBOX } = window.GQ_LEVELS;
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const HOME = Engine.HOME;

// ---------- persistence ----------
const SKEY = 'gitquest-v1';
let save = { stars: {}, xp: 0, sound: true };
try { const s = JSON.parse(localStorage.getItem(SKEY) || 'null'); if (s) save = Object.assign(save, s); } catch (e) {}
function persist() { try { localStorage.setItem(SKEY, JSON.stringify(save)); } catch (e) {} }
const totalXP = () => LV.reduce((a, l) => a + Math.round(l.xp * (save.stars[l.id] || 0) / 3), 0);
const maxXP = LV.reduce((a, l) => a + l.xp, 0);

// ---------- sound (tiny 8-bit blips) ----------
let ac = null;
function beep(seq) {
  if (!save.sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    let t = ac.currentTime;
    for (const [f, d, type] of seq) { const o = ac.createOscillator(), g = ac.createGain(); o.type = type || 'square'; o.frequency.value = f; g.gain.setValueAtTime(.05, t); g.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d); t += d * .8; }
  } catch (e) {}
}
const SFX = { key: () => beep([[880, .03]]), ok: () => beep([[660, .07], [990, .1]]), err: () => beep([[200, .12, 'sawtooth']]), goal: () => beep([[523, .08], [659, .08], [784, .12]]), clear: () => beep([[523, .1], [659, .1], [784, .1], [1047, .3]]), push: () => beep([[440, .05], [880, .08]]) };

// ---------- state ----------
let expCwd = [], E = null, cur = null, curIdx = -1, seen = new Set(), goalState = [], hintsUsed = 0, solUsed = false, cleared = false, lessonPage = 0, flashKeys = new Set(), hist = [], hpos = 0;

// ================= TITLE SCREEN =================
function showTitle() {
  $('#game').classList.add('hidden'); $('#title').classList.remove('hidden');
  try { history.replaceState(null, '', location.pathname); } catch (e) {}
  const doneN = LV.filter(l => save.stars[l.id]).length;
  const starN = LV.reduce((a, l) => a + (save.stars[l.id] || 0), 0);
  const nextIdx = LV.findIndex(l => !save.stars[l.id]);
  if ($('#nStages')) $('#nStages').textContent = LV.length;
  $('#scoreline').innerHTML = `<div>XP <b>${totalXP()}</b> / ${maxXP}</div><div>STAGES <b>${doneN}</b> / ${LV.length}</div><div>STARS <b>${starN}</b> / ${LV.length * 3}</div>`;
  let h = '';
  CH.forEach((name, ci) => {
    const ls = LV.map((l, i) => [l, i]).filter(([l]) => l.ch === ci);
    h += `<div class="chapter"><h3>WORLD ${ci + 1} · ${name}<span>${ls.filter(([l]) => save.stars[l.id]).length}/${ls.length}</span></h3><div class="stages">`;
    for (const [l, i] of ls) {
      const s = save.stars[l.id] || 0;
      h += `<div class="stage ${s ? 'done' : ''} ${i === nextIdx ? 'next' : ''} ${l.id === 'pages' ? 'boss' : ''} ${l.drill ? 'drill' : ''}" data-i="${i}"><div class="n">STAGE ${String(i + 1).padStart(2, '0')}${l.id === 'pages' ? ' · BOSS' : l.drill ? ' · PRACTICE' : ''}</div><div class="t">${esc(l.title)}</div><div class="s">${[1, 2, 3].map(k => `<span class="${k <= s ? 'on' : ''}">★</span>`).join('')}</div></div>`;
    }
    h += '</div></div>';
  });
  $('#worldmap').innerHTML = h;
  document.querySelectorAll('.stage').forEach(el => el.onclick = () => { SFX.ok(); startLevel(+el.dataset.i); });
  $('#startBtn').textContent = nextIdx < 0 ? '▶ PLAY AGAIN' : nextIdx === 0 ? '▶ PRESS START' : '▶ CONTINUE · STAGE ' + (nextIdx + 1);
  $('#startBtn').onclick = () => { SFX.ok(); startLevel(nextIdx < 0 ? 0 : nextIdx); };
  $('#sandboxBtn').onclick = () => { SFX.ok(); startLevel(-1); };
}

// ================= LEVEL FLOW =================
function startLevel(i) {
  curIdx = i; cur = i < 0 ? SANDBOX : LV[i];
  $('#title').classList.add('hidden'); $('#game').classList.remove('hidden');
  try { history.replaceState(null, '', '#stage-' + cur.id); } catch (e) {}
  hintsUsed = 0; solUsed = false;
  resetWorld();
  if (cur.lesson.length) openLesson(0); else { closeOv(); introFlash(); }
}
function resetWorld() {
  E = new Engine(); cur.setup(E); seen = new Set(Object.keys(E.commits)); cleared = false;
  expCwd = []; try { const t = new Engine(); t.realtime = false; cur.setup(t); for (const c of cur.solution) { expCwd.push(t.cwd); t.run(c); t.settle(true); } } catch (e) {}
  goalState = cur.goals.map(() => false); flashKeys.clear();
  $('#termout').innerHTML = '';
  termSys('━━ ' + (curIdx >= 0 ? 'STAGE ' + (curIdx + 1) + ': ' : '') + cur.title.toUpperCase() + ' ━━');
  termSys(cur.story);
  termSys('Objectives are on the left; the yellow 🎯 NEXT bar above the prompt always shows the next one. Type help for shell basics.');
  renderHUD(); renderMission(); renderDash(); updatePrompt(); checkGoals(true);
  setTimeout(() => $('#cmd').focus(), 50);
}
function renderHUD() {
  $('#stgName').innerHTML = curIdx >= 0 ? `STAGE ${String(curIdx + 1).padStart(2, '0')} <span>· ${esc(cur.title.toUpperCase())}</span>` : '<span>FREE PLAY SANDBOX</span>';
  $('#xpTxt').textContent = 'XP ' + totalXP();
  $('#xpFill').style.width = (100 * totalXP() / maxXP) + '%';
  $('#soundBtn').textContent = save.sound ? '🔊' : '🔇';
  $('#lessonBtn').disabled = !cur.lesson.length;
  $('#prevBtn').disabled = curIdx <= 0; $('#nextBtn').disabled = curIdx < 0 || curIdx >= LV.length - 1;
}
function renderMission() {
  const cmds = cur.lesson.flatMap(p => p.cmds || []);
  let h = `<div class="card"><div class="mission-top"><h4>🎯 MISSION</h4>${curIdx >= 0 ? `<span class="badge yel">${cur.xp} XP</span>` : ''}</div><div class="story">${esc(cur.story)}</div></div>`;
  if (cur.goals.length) h += `<div class="card"><h4>OBJECTIVES</h4><ul class="goals" id="goalList">${cur.goals.map((g, i) => `<li data-g="${i}"><span class="box"></span><span>${esc(g.t)}</span></li>`).join('')}</ul></div>`;
  h += `<div class="card"><h4>💡 HELP</h4><div class="btnrow"><button class="yel" id="hintBtn">HINT ${cur.hints.length ? '(' + Math.min(hintsUsed, cur.hints.length) + '/' + cur.hints.length + ')' : ''}</button>${cur.solution.length ? '<button class="ghost" id="solBtn">SOLUTION</button>' : ''}<button class="ghost" id="resetBtn">↺ RESET</button></div><div id="hintBox">${cur.hints.slice(0, hintsUsed).map(x => `<div class="hint">${esc(x)}</div>`).join('')}</div><div id="solBox"></div></div>`;
  if (cmds.length) h += `<div class="card moves"><h4>🕹 YOUR MOVES</h4>${cmds.map(([c, d]) => `<div class="mv"><span class="chips"><span class="chip" data-c="${esc(c)}">${esc(c)}</span></span><small>${d}</small></div>`).join('')}</div>`;
  $('#mission').innerHTML = h;
  $('#hintBtn').onclick = () => { if (hintsUsed < cur.hints.length) { hintsUsed++; SFX.key(); renderMission(); } };
  if ($('#solBtn')) $('#solBtn').onclick = () => {
    const b = $('#solBtn');
    if (!solUsed && b.dataset.arm !== '1') { b.dataset.arm = '1'; b.textContent = 'SURE? −2★'; b.classList.replace('ghost', 'mag'); return; }
    solUsed = true; showSolution();
  };
  $('#resetBtn').onclick = () => { SFX.err(); resetWorld(); };
  bindChips($('#mission'));
  if (solUsed) showSolution();
  paintGoals(false);
}
function showSolution() {
  $('#solBox').innerHTML = `<div class="hint" style="color:var(--ink)">Click each move in order:</div><div class="chips" style="margin-top:8px">${cur.solution.map(c => `<span class="chip" data-c="${esc(c)}">${esc(c)}</span>`).join('')}</div>`;
  if ($('#solBtn')) $('#solBtn').remove();
  bindChips($('#solBox'));
}
function bindChips(root) { root.querySelectorAll('.chip[data-c]').forEach(el => el.onclick = () => { const c = $('#cmd'); c.value = el.dataset.c; c.focus(); SFX.key(); }); }

function checkGoals(silent) {
  let newly = false;
  cur.goals.forEach((g, i) => { let ok = false; try { ok = !!g.ok(E); } catch (e) {} if (ok && !goalState[i]) { newly = true; goalState[i] = 'just'; } else if (!ok) goalState[i] = false; });
  paintGoals(!silent && newly);
  if (!silent && newly) SFX.goal();
  if (cur.goals.length && goalState.every(Boolean) && !cleared) { cleared = true; const go = () => { if (!$('#ov').classList.contains('hidden')) { setTimeout(go, 400); return; } stageClear(); }; setTimeout(go, 700); }
}
function paintGoals(anim) {
  document.querySelectorAll('#goalList li').forEach(li => { const s = goalState[+li.dataset.g]; li.classList.toggle('ok', !!s); li.classList.toggle('just', anim && s === 'just'); });
  goalState = goalState.map(s => s ? true : false);
  paintQuestbar(anim);
}
function paintQuestbar(anim) {
  const qb = $('#questbar'); if (!qb || !cur) return;
  if (!cur.goals.length) { qb.innerHTML = `<span class="lbl">FREE PLAY</span><span class="txt">No objectives — experiment with any command. Type help to start.</span>`; qb.className = ''; return; }
  const n = goalState.filter(Boolean).length, i = goalState.findIndex(s => !s);
  qb.className = i < 0 ? 'done' : '';
  qb.innerHTML = i < 0 ? `<span class="lbl">★ CLEAR</span><span class="txt">All objectives complete!</span><span class="cnt">${n}/${n}</span>`
    : `<span class="lbl">🎯 NEXT</span><span class="txt">${esc(cur.goals[i].t)}</span><span class="cnt">${n}/${cur.goals.length} · click for a hint</span>`;
  qb.title = 'Your current objective — the full list is in the MISSION panel';
  if (anim) { qb.classList.remove('bump'); void qb.offsetWidth; qb.classList.add('bump'); }
}
function introFlash() { const m = $('#mission'); m.classList.remove('intro'); void m.offsetWidth; m.classList.add('intro'); setTimeout(() => m.classList.remove('intro'), 2600); }
function stageClear() {
  const stars = solUsed ? 1 : hintsUsed >= 2 ? 2 : 3;
  const prev = save.stars[cur.id] || 0;
  if (stars > prev) save.stars[cur.id] = stars;
  persist(); renderHUD(); SFX.clear(); confetti();
  const last = curIdx === LV.length - 1;
  openOv(`<div class="modal clear-box"><div class="kick">${last ? 'FINAL BOSS DEFEATED' : 'STAGE ' + (curIdx + 1)}</div><div class="big">${last ? '🏆 YOU WIN! 🏆' : 'STAGE CLEAR!'}</div>
  <div class="stars">${[1, 2, 3].map(k => `<span class="${k <= stars ? 'on' : ''}">★</span>`).join('')}</div>
  <p>+${Math.round(cur.xp * stars / 3)} XP ${stars < 3 ? '<br><small style="color:var(--dim)">' + (solUsed ? 'Solution used' : 'Hints used') + ' — replay without help for 3★</small>' : ''}</p>
  ${last ? '<p>You went from <b>pwd</b> to deploying a live website with GitHub Actions. That is the real workflow software engineers use every day. Go build something!</p>' : ''}
  <div class="foot" style="justify-content:center"><button class="ghost" id="ovMap">◀ MAP</button><button class="ghost" id="ovStay">KEEP PLAYING</button>${!last ? '<button class="lime" id="ovNext">NEXT STAGE ▶</button>' : '<button class="yel" id="ovSand">FREE PLAY ▶</button>'}</div></div>`);
  $('#ovMap').onclick = () => { closeOv(); showTitle(); };
  $('#ovStay').onclick = () => { closeOv(); $('#cmd').focus(); };
  if ($('#ovNext')) $('#ovNext').onclick = () => { closeOv(); startLevel(curIdx + 1); };
  if ($('#ovSand')) $('#ovSand').onclick = () => { closeOv(); startLevel(-1); };
}
function confetti() { const cols = ['#ffe14d', '#ff2bd6', '#00eaff', '#39ff88', '#ff9b2f']; for (let i = 0; i < 70; i++) { const d = document.createElement('div'); d.className = 'confetti'; d.style.left = Math.random() * 100 + 'vw'; d.style.top = (-10 - Math.random() * 30) + 'px'; d.style.background = cols[i % cols.length]; d.style.animationDelay = Math.random() * .6 + 's'; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); } }
function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2300); }

// ================= OVERLAYS =================
function openOv(html) { const o = $('#ov'); o.innerHTML = html; o.classList.remove('hidden'); }
function closeOv() { $('#ov').classList.add('hidden'); $('#ov').innerHTML = ''; }
function openLesson(p) {
  lessonPage = p; const L = cur.lesson, pg = L[p];
  openOv(`<div class="modal"><div class="kick">${curIdx >= 0 ? 'STAGE ' + (curIdx + 1) + ' · ' : ''}TRAINING ${p + 1}/${L.length}</div><h2>${esc(pg.h)}</h2><p>${pg.p}</p>${pg.viz ? `<div class="viz">${pg.viz}</div>` : ''}
  ${pg.cmds ? `<div class="cmdlist">${pg.cmds.map(([c, d]) => `<div class="mv"><span class="chips"><span class="chip">${esc(c)}</span></span><small>${d}</small></div>`).join('')}</div>` : ''}
  ${pg.tip ? `<div class="tip">${pg.tip}</div>` : ''}
  <div class="foot"><div class="dots">${L.map((_, i) => `<i class="${i === p ? 'on' : ''}"></i>`).join('')}</div><div class="btnrow">${p > 0 ? '<button class="ghost" id="lPrev">◀ BACK</button>' : ''}${p < L.length - 1 ? '<button id="lNext">NEXT ▶</button>' : '<button class="lime" id="lGo">START MISSION ▶</button>'}</div></div></div>`);
  if ($('#lPrev')) $('#lPrev').onclick = () => { SFX.key(); openLesson(p - 1); };
  if ($('#lNext')) $('#lNext').onclick = () => { SFX.key(); openLesson(p + 1); };
  if ($('#lGo')) { $('#lGo').onclick = () => { SFX.ok(); closeOv(); introFlash(); paintQuestbar(true); $('#cmd').focus(); }; setTimeout(() => $('#lGo') && $('#lGo').focus(), 30); }
  else setTimeout(() => $('#lNext') && $('#lNext').focus(), 30);
}
function openEditor(path, content) {
  openOv(`<div class="modal" id="editor"><div class="kick">NANO-TRON 3000</div><h2>✎ ${esc(E.pretty(path))}</h2><textarea id="edTa" spellcheck="false"></textarea><div class="foot"><small style="color:var(--dim)">Ctrl+S save · Esc cancel</small><div class="btnrow"><button class="ghost" id="edX">CANCEL</button><button class="lime" id="edS">SAVE ✔</button></div></div></div>`);
  const ta = $('#edTa'); ta.value = content; ta.focus();
  const doSave = () => { E.saveFile(path, ta.value.endsWith('\n') || !ta.value ? ta.value : ta.value + '\n'); closeOv(); termLine([{ t: '[ Wrote ' + Engine.splitLines(ta.value).length + ' lines to ' + E.pretty(path) + ' ]', c: 'ok' }]); after(); $('#cmd').focus(); };
  $('#edS').onclick = doSave; $('#edX').onclick = () => { closeOv(); $('#cmd').focus(); };
  ta.onkeydown = ev => { if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') { ev.preventDefault(); doSave(); } if (ev.key === 'Escape') { closeOv(); $('#cmd').focus(); } if (ev.key === 'Tab') { ev.preventDefault(); const s = ta.selectionStart; ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = s + 2; } };
}
function openSite(g) {
  const files = g.pages.site ? g.pages.site.files : null;
  let html = files && files['index.html'];
  if (!html) html = '<body style="font-family:sans-serif;text-align:center;padding:4em"><h1 style="font-size:5em;margin:0">404</h1><p><b>There isn\'t a GitHub Pages site here.</b></p></body>';
  else html = html.replace(/<link[^>]*href=["']([^"']+\.css)["'][^>]*>/g, (m, f) => files[f.replace(/^\.?\//, '')] !== undefined ? '<style>' + files[f.replace(/^\.?\//, '')] + '</style>' : m);
  openOv(`<div class="browser"><div class="bar"><span>🔒</span><span class="url">${esc(g.pages.url)}</span><button class="mag" id="bX">✕</button></div><iframe sandbox="" id="siteFrame"></iframe></div>`);
  $('#siteFrame').srcdoc = html;
  $('#bX').onclick = () => { closeOv(); $('#cmd').focus(); };
  if (files) { E.lv = E.lv || {}; E.lv.opened = true; checkGoals(); }
}
function openMoves() {
  const upto = curIdx < 0 ? LV.length : curIdx + 1;
  const all = []; const seenC = new Set();
  LV.slice(0, upto).forEach(l => l.lesson.forEach(p => (p.cmds || []).forEach(([c, d]) => { if (!seenC.has(c)) { seenC.add(c); all.push([c, d, l.title]); } })));
  openOv(`<div class="modal"><div class="kick">CHEAT SHEET</div><h2>📜 MOVE LIST</h2><p style="margin:4px 0 10px">Every command unlocked so far. Click one to paste it into the terminal.</p><div class="cmdlist">${all.map(([c, d, t]) => `<div class="mv"><span class="chips"><span class="chip" data-c="${esc(c)}">${esc(c)}</span></span><small>${d}<br><i style="color:#5a5e9c">${esc(t)}</i></small></div>`).join('')}</div><div class="foot"><span></span><button id="mvX">CLOSE</button></div></div>`);
  bindChips($('#ov')); $('#ov').querySelectorAll('.chip').forEach(c => c.addEventListener('click', closeOv));
  $('#mvX').onclick = closeOv;
}

// ================= TERMINAL =================
function termLine(lines) {
  const out = $('#termout'); const frag = document.createDocumentFragment();
  for (const l of lines) {
    const d = document.createElement('div'); d.className = 'l' + (l.c ? ' c-' + l.c : '');
    if (l.parts) l.parts.forEach(p => { const s = document.createElement('span'); if (p.c) s.className = 'c-' + p.c; s.textContent = p.t; d.appendChild(s); });
    else d.textContent = l.t;
    if (l.paste) { d.style.cursor = 'pointer'; d.title = 'Click to paste'; d.onclick = () => { $('#cmd').value = l.paste; $('#cmd').focus(); }; }
    frag.appendChild(d);
  }
  out.appendChild(frag);
  while (out.childNodes.length > 1500) out.removeChild(out.firstChild);
  out.scrollTop = out.scrollHeight;
}
function termSys(t) { termLine([{ t, c: 'sys' }]); }
function promptParts() {
  const r = E.findRepo(); let b = '';
  if (r) b = r.head.branch !== undefined ? ' (' + r.head.branch + (r.merging ? '|MERGING' : '') + ')' : ' (' + r.head.detached + '…)';
  return [{ t: 'you@laptop', c: 'u' }, { t: ' ' + E.pretty(E.cwd), c: 'p' }, { t: b, c: 'b' }, { t: ' $', c: '' }];
}
function updatePrompt() { $('#prompt').innerHTML = promptParts().map(p => `<span class="${p.c}">${esc(p.t)}</span>`).join(''); }
function runCmd(line) {
  const pp = promptParts();
  termLine([{ t: '', parts: pp.map(p => ({ t: p.t, c: p.c === 'u' ? 'ok' : p.c === 'p' ? 'cy' : p.c === 'b' ? 'mag' : '' })).concat([{ t: ' ' + line, c: 'cmd' }]) }]);
  if (!line.trim()) return;
  hist.push(line); hpos = hist.length;
  const evBefore = E.events.length;
  const res = E.run(line);
  let clear = false;
  for (const a of res.actions) {
    if (a.type === 'clear') clear = true;
    if (a.type === 'edit') setTimeout(() => openEditor(a.path, a.content), 30);
    if (a.type === 'open') handleOpen(a.url);
    if (a.type === 'focus-gh') flashCard('G:' + a.key);
  }
  if (clear) $('#termout').innerHTML = '';
  else termLine(res.lines);
  res.ok === false ? SFX.err() : SFX.key();
  if (res.ok === false && !clear) smartHint(line);
  const evs = E.events.slice(evBefore);
  for (const ev of evs) {
    if (['push', 'gh-create', 'fork', 'pr-merged', 'release', 'sync'].includes(ev.type) && ev.key) flashKeys.add(ev.key);
    if (ev.type === 'push') SFX.push();
  }
  after(evs);
}
// ---------- smart hint: where am I + what to type next ----------
function whereAmI() {
  const r = E.findRepo(); let w = 'You are in ' + E.pretty(E.cwd);
  if (!r) w += ' — not inside a git repository';
  else if (r.bare) w += ' — inside the bare repository ' + E.pretty(r.root);
  else w += ' — inside the git repo ' + E.pretty(r.root) + (r.head.branch !== undefined ? ', on branch ' + r.head.branch : ', detached HEAD') + (r.merging ? ' (merge in progress)' : '');
  return w;
}
function goalsDone(e) { return cur.goals.filter(g => { try { return !!g.ok(e); } catch (x) { return false; } }).length; }
function lookahead(fromCwd, k) {
  const t = E.snapshot(); if (fromCwd) t.cwd = fromCwd;
  for (const c of cur.solution.slice(k)) { t.run(c); t.settle(true); }
  return goalsDone(t);
}
function suggestNext(failed) {
  const sol = cur.solution, need = cur.goals.length;
  if (!sol.length || !need) return null;
  const pick = (k, cdTo) => ({ cmd: sol[k], cd: cdTo });
  // 1) latest step from which the rest of the solution still finishes the stage, from where you are
  for (let k = sol.length - 1; k >= 0; k--) { if (sol[k] === failed) continue; if (lookahead(null, k) === need) return pick(k); }
  // 2) same, but after moving to the folder that step expects
  for (let k = sol.length - 1; k >= 0; k--) { const d = expCwd[k]; if (!d || d === E.cwd || !E.isDir(d)) continue; if (lookahead(d, k) === need) return pick(k, d); }
  // 3) best effort: the step that gets the most goals done
  let best = -1, bk = 0; for (let k = 0; k < sol.length; k++) { const n = lookahead(null, k); if (n > best) { best = n; bk = k; } }
  return pick(bk);
}
function smartHint(failed) {
  const lines = [{ t: '💡 ' + whereAmI(), c: 'warn' }];
  const i = goalState.findIndex(s => !s);
  if (cur.goals.length && i >= 0) {
    lines.push({ t: '💡 Next objective: ' + cur.goals[i].t, c: 'warn' });
    let s = null; try { s = suggestNext(failed.trim()); } catch (e) {}
    if (s && s.cd) {
      const rel = E.pretty(s.cd);
      lines.push({ t: '💡 That step happens in ' + rel + '. First type:  cd ' + rel + '   (click to paste)', c: 'cy', paste: 'cd ' + rel });
      lines.push({ t: '   then:  ' + s.cmd + '   (click to paste)', c: 'cy', paste: s.cmd });
    } else if (s) lines.push({ t: '💡 Try typing:  ' + s.cmd + '   (click to paste)', c: 'cy', paste: s.cmd });
  } else if (!cur.goals.length) lines.push({ t: '💡 Stuck? Type help for shell basics, git help or gh help for the rest.', c: 'warn' });
  termLine(lines);
}
function handleOpen(url) {
  const g = Object.values(E.gh).find(x => x.pages.enabled && url.replace(/\/?$/, '/').startsWith(x.pages.url));
  if (g && !g.deleted) { setTimeout(() => openSite(g), 200); return; }
  const k = Engine.ghKeyFromUrl(url);
  if (k && E.gh[k]) { flashCard('G:' + k); return; }
  if (/github\.io/.test(url)) { setTimeout(() => openSite({ pages: { url, site: null } }), 200); return; }
  termLine([{ t: '(simulator) Only GitHub repo pages and GitHub Pages sites can be opened here.', c: 'dim' }]);
}
function after(evs) {
  renderDash(evs || []); updatePrompt(); checkGoals();
}
function onKey(ev) {
  const c = $('#cmd');
  if (ev.key === 'Enter') { const v = c.value; c.value = ''; runCmd(v); return; }
  if (ev.key === 'ArrowUp') { if (hpos > 0) { hpos--; c.value = hist[hpos]; setTimeout(() => c.setSelectionRange(c.value.length, c.value.length)); } ev.preventDefault(); return; }
  if (ev.key === 'ArrowDown') { if (hpos < hist.length) { hpos++; c.value = hist[hpos] || ''; } ev.preventDefault(); return; }
  if (ev.key === 'Tab') {
    ev.preventDefault();
    const v = c.value; const hits = E.complete(v); if (!hits.length) return;
    const words = v.split(/\s+/); const last = words[words.length - 1];
    let pre = hits[0]; for (const h of hits) { let i = 0; while (i < pre.length && pre[i] === h[i]) i++; pre = pre.slice(0, i); }
    if (hits.length === 1) pre = hits[0] + (hits[0].endsWith('/') ? '' : ' ');
    else if (pre === last) { termLine([{ t: hits.join('   '), c: 'dim' }]); return; }
    words[words.length - 1] = pre; c.value = words.join(' ');
    return;
  }
  if (ev.ctrlKey && ev.key.toLowerCase() === 'l') { ev.preventDefault(); $('#termout').innerHTML = ''; return; }
  if (ev.ctrlKey && ev.key.toLowerCase() === 'c' && !window.getSelection().toString()) { termLine([{ t: '', parts: promptParts().map(p => ({ t: p.t, c: 'dim' })).concat([{ t: ' ' + c.value + '^C', c: 'dim' }]) }]); c.value = ''; }
}

// ================= DASHBOARD =================
const LANE_COLORS = ['#00eaff', '#ff2bd6', '#39ff88', '#ff9b2f', '#a070ff', '#ffe14d', '#3da5ff'];
function graphSVG(refs, opts) {
  // refs: [{name,id,kind:'branch'|'remote'|'tag'|'head', cur:bool}]
  const tips = refs.filter(r => r.id).map(r => r.id);
  if (!tips.length) return `<div class="empty">${opts.emptyText || 'No commits yet'}</div>`;
  const all = new Set(); tips.forEach(t => E.ancestors(t).forEach(x => all.add(x)));
  let list = [...all].map(id => E.commits[id]).sort((a, b) => a.t - b.t);
  const MAX = 14; const trunc = list.length > MAX; if (trunc) list = list.slice(-MAX);
  const shown = new Set(list.map(c => c.id));
  // lanes
  const lane = {}; let nl = 0; const laneColor = [];
  const order = refs.filter(r => r.kind === 'branch' || r.kind === 'remote' || r.kind === 'head').concat(refs.filter(r => r.kind === 'tag'));
  for (const r of order) {
    if (!r.id) continue; let c = r.id, used = false;
    while (c && shown.has(c) && lane[c] === undefined) { lane[c] = nl; used = true; c = E.commits[c].parents[0]; }
    if (used) { laneColor[nl] = r.kind === 'remote' ? '#7d82c0' : r.kind === 'tag' ? '#ffe14d' : LANE_COLORS[nl % LANE_COLORS.length]; nl++; }
  }
  list.forEach(c => { if (lane[c.id] === undefined) { lane[c.id] = nl; laneColor[nl] = '#7d82c0'; nl++; } });
  // labels per commit
  const labels = {}; refs.forEach(r => { if (r.id && shown.has(r.id) && r.kind !== 'tag') (labels[r.id] = labels[r.id] || []).push(r); });
  const tagsAt = {}; refs.forEach(r => { if (r.id && shown.has(r.id) && r.kind === 'tag') (tagsAt[r.id] = tagsAt[r.id] || []).push(r); });
  const laneFlags = new Array(nl).fill(0), laneTags = new Array(nl).fill(0);
  Object.keys(labels).forEach(id => laneFlags[lane[id]] = Math.max(laneFlags[lane[id]], labels[id].length));
  Object.keys(tagsAt).forEach(id => laneTags[lane[id]] = Math.max(laneTags[lane[id]], tagsAt[id].length));
  const STEP = 74, BW = 40, BH = 24, X0 = trunc ? 52 : 28;
  const laneY = []; let y = 6;
  for (let l = 0; l < nl; l++) { y += laneFlags[l] * 17 + 4; laneY[l] = y; y += BH + 16 + laneTags[l] * 16 + 8; }
  const H = y + 2;
  const xOf = {}; list.forEach((c, i) => xOf[c.id] = X0 + i * STEP);
  const W = X0 + list.length * STEP + 60;
  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg"><defs><marker id="ah" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#8a8fd0"/></marker></defs>`;
  if (trunc) s += `<text x="8" y="${laneY[0] + BH / 2 + 4}" fill="#6b70a8" font-size="13" font-family="sans-serif">⋯</text>`;
  // edges
  for (const c of list) {
    const x2 = xOf[c.id], y2 = laneY[lane[c.id]] + BH / 2;
    c.parents.forEach((p, pi) => {
      if (!shown.has(p)) { if (pi === 0) s += `<line x1="${x2 - 26}" y1="${y2}" x2="${x2 - 2}" y2="${y2}" stroke="#555a90" stroke-dasharray="3 3" stroke-width="2"/>`; return; }
      const x1 = xOf[p] + BW, y1 = laneY[lane[p]] + BH / 2;
      const mx = (x1 + x2 - 2) / 2;
      s += `<path d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2 - 3},${y2}" fill="none" stroke="${laneColor[lane[c.id]]}88" stroke-width="2.5" marker-end="url(#ah)"/>`;
    });
  }
  // nodes
  for (const c of list) {
    const x = xOf[c.id], yy = laneY[lane[c.id]], col = laneColor[lane[c.id]];
    const merge = c.parents.length > 1; const isNew = !seen.has(c.id);
    const head = (labels[c.id] || []).some(r => r.cur || r.kind === 'head');
    const msg = c.msg.split('\n')[0];
    s += `<g class="cnode${isNew ? ' pop' : ''}"><title>${esc(c.id + ' · ' + msg + '\n' + c.author)}</title>`;
    if (head) s += `<rect x="${x - 4}" y="${yy - 4}" width="${BW + 8}" height="${BH + 8}" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 3"/>`;
    s += `<rect x="${x}" y="${yy}" width="${BW}" height="${BH}" fill="${col}" stroke="${merge ? '#ffe14d' : '#000'}" stroke-width="${merge ? 3 : 2}"/>`;
    s += `<text x="${x + BW / 2}" y="${yy + 16}" text-anchor="middle" font-size="11" font-family="VT323,monospace" font-weight="bold" fill="#05051a">${merge ? '⑂' : ''}${c.id.slice(0, 4)}</text>`;
    s += `<text x="${x + BW / 2}" y="${yy + BH + 13}" text-anchor="middle" font-size="10.5" font-family="Chakra Petch,sans-serif" fill="#b9bdf0">${esc(msg.length > 12 ? msg.slice(0, 11) + '…' : msg)}</text>`;
    (labels[c.id] || []).forEach((r, k) => {
      const t = (r.cur ? '★ ' : '') + r.name; const w = t.length * 6.4 + 14; const ly = yy - 6 - (k + 1) * 17 + 4;
      const fill = r.kind === 'remote' ? '#1d1f4d' : r.kind === 'head' ? '#ff2bd6' : r.cur ? '#ffffff' : '#39ff88';
      const tc = r.kind === 'remote' ? '#a3a8e8' : r.kind === 'head' ? '#fff' : '#05051a';
      s += `<path d="M${x},${ly} h${w} l-6,7.5 l6,7.5 h-${w} z" fill="${fill}" ${r.kind === 'remote' ? 'stroke="#7d82c0" stroke-dasharray="3 2"' : ''}/><text x="${x + 5}" y="${ly + 11.5}" font-size="11" font-family="Chakra Petch,sans-serif" font-weight="700" fill="${tc}">${esc(t)}</text>`;
    });
    (tagsAt[c.id] || []).forEach((r, k) => { const t = '🏷 ' + r.name; const w = t.length * 6.2 + 10; const ty = yy + BH + 18 + k * 16; s += `<rect x="${x}" y="${ty}" width="${w}" height="14" fill="#ffe14d"/><text x="${x + 4}" y="${ty + 11}" font-size="10.5" font-family="Chakra Petch,sans-serif" font-weight="700" fill="#05051a">${esc(t)}</text>`; });
    s += '</g>';
  }
  return s + '</svg>';
}
function collapseUntracked(paths, idx) {
  const out = []; const done = new Set();
  for (const p of paths) { const seg = p.split('/')[0]; let d = p; if (p.includes('/') && !Object.keys(idx).some(x => x.startsWith(seg + '/'))) d = seg + '/'; if (!done.has(d)) { done.add(d); out.push(d); } }
  return out;
}
function tilesHTML(arr, cap) {
  cap = cap || 12; const more = arr.length - cap;
  return arr.slice(0, cap).map(([t, c, title]) => `<span class="tile ${c}" title="${esc(title || t)}">${esc(t)}</span>`).join('') + (more > 0 ? `<span class="tile ign">+${more} more</span>` : '');
}
function localCard(r) {
  const name = E.pretty(r.root);
  let h = `<div class="repo" id="${cardId('L:' + r.root)}" data-card="L:${esc(r.root)}"><div class="repo-h"><span class="nm">🕰 ${esc(name)}</span>`;
  if (r.bare) h += `<span class="badge">bare mirror</span>`;
  else if (r.head.branch !== undefined) h += `<span class="badge ok">★ HEAD → ${esc(r.head.branch)}</span>`;
  else h += `<span class="badge mag">detached HEAD @ ${r.head.detached}</span>`;
  const hid = E.headId(r); const up = r.head.branch !== undefined && r.upstream[r.head.branch];
  if (up && r.rrefs[up] && hid) { const a = E.count(hid, r.rrefs[up]), b = E.count(r.rrefs[up], hid); if (a) h += `<span class="badge cy">⇧ ${a} to push</span>`; if (b) h += `<span class="badge warn">⇩ ${b} to pull</span>`; if (!a && !b) h += `<span class="badge">✓ in sync with ${esc(up)}</span>`; }
  if (r.merging) h += `<span class="badge mag">⚔ MERGING</span>`;
  if (r.stash.length) h += `<span class="badge yel">🎒 stash ×${r.stash.length}</span>`;
  h += '</div>';
  if (!r.bare) {
    const st = E.status(r); const conf = new Set(st.conflicts);
    const work = [], stage = [], repoT = [];
    collapseUntracked(st.untracked, st.idx).forEach(p => work.push([p, 'red', p + ' — new, untracked']));
    st.unstaged.modified.filter(p => !conf.has(p)).forEach(p => work.push([p, 'orange', p + ' — modified']));
    st.unstaged.deleted.forEach(p => work.push([p, 'gray', p + ' — deleted']));
    st.conflicts.forEach(p => work.push(['⚔ ' + p, 'pink', p + ' — CONFLICT']));
    collapseUntracked(st.ignored, st.idx).forEach(p => work.push(['🚫 ' + p, 'ign', p + ' — ignored by .gitignore']));
    st.staged.added.filter(p => !conf.has(p)).forEach(p => stage.push(['+ ' + p, 'green', p + ' — new file staged']));
    st.staged.modified.filter(p => !conf.has(p)).forEach(p => stage.push(['✎ ' + p, 'green', p + ' — change staged']));
    st.staged.deleted.forEach(p => stage.push(['✖ ' + p, 'green', p + ' — deletion staged']));
    Object.keys(st.head).sort().forEach(p => repoT.push([p, 'blue', p + ' — saved in the last commit']));
    h += `<div class="lanes"><div class="lane"><b>WORKING DIR</b><div class="tiles">${work.length ? tilesHTML(work) : '<small style="color:#5a5e9c">clean ✓</small>'}</div></div><div class="lflow" title="git add">➜</div><div class="lane"><b>STAGING</b><div class="tiles">${stage.length ? tilesHTML(stage) : '<small style="color:#5a5e9c">empty</small>'}</div></div><div class="lflow" title="git commit">➜</div><div class="lane"><b>LAST COMMIT</b><div class="tiles">${repoT.length ? tilesHTML(repoT, 10) : '<small style="color:#5a5e9c">nothing yet</small>'}</div></div></div>`;
  }
  const refs = [];
  const bnames = Object.keys(r.branches).sort((a, b) => (a === 'main' ? -1 : b === 'main' ? 1 : 0));
  bnames.forEach(b => refs.push({ name: b, id: r.branches[b], kind: 'branch', cur: r.head.branch === b && !r.bare }));
  if (r.head.detached) refs.push({ name: 'HEAD', id: r.head.detached, kind: 'head' });
  Object.keys(r.rrefs).forEach(k => refs.push({ name: k, id: r.rrefs[k], kind: 'remote' }));
  Object.keys(r.tags).forEach(t => refs.push({ name: t, id: r.tags[t].id, kind: 'tag' }));
  h += `<div class="graph">${graphSVG(refs, { emptyText: 'No commits yet — make your first commit!' })}</div>`;
  const rem = Object.keys(r.remotes);
  if (rem.length) h += `<div class="ghfoot">${rem.map(n => `<span class="badge cy" title="${esc(r.remotes[n])}">🔗 ${esc(n)} → ${esc(Engine.ghKeyFromUrl(r.remotes[n]) || r.remotes[n])}${/^git@/.test(r.remotes[n]) ? ' (ssh)' : ''}</span>`).join('')}</div>`;
  return h + '</div>';
}
function ghCard(g) {
  let h = `<div class="repo gh ${g.deleted ? 'dead' : ''} ${flashKeys.has(g.key) ? 'flash' : ''}" id="${cardId('G:' + g.key)}" data-card="G:${esc(g.key)}"><div class="repo-h"><span class="nm">${g.deleted ? '💀' : '📦'} ${esc(g.key)}</span>`;
  if (g.deleted) h += `<span class="badge bad">DELETED</span>`;
  h += `<span class="badge ${g.vis === 'public' ? 'ok' : 'warn'}">${g.vis === 'public' ? '🌍 public' : '🔒 ' + g.vis}</span>`;
  if (g.forkOf) h += `<span class="badge mag">⑂ fork of ${esc(g.forkOf)}</span>`;
  if (g.stars) h += `<span class="badge yel">⭐ ${g.stars}</span>`;
  h += '</div>';
  if (g.deleted) return h + '</div>';
  const refs = [];
  Object.keys(g.branches).sort((a, b) => (a === g.def ? -1 : b === g.def ? 1 : 0)).forEach(b => refs.push({ name: b, id: g.branches[b], kind: 'branch', cur: false }));
  Object.keys(g.tags).forEach(t => refs.push({ name: t, id: g.tags[t].id, kind: 'tag' }));
  h += `<div class="graph">${graphSVG(refs, { emptyText: 'Empty repository — push something!' })}</div><div class="ghfoot">`;
  const oi = g.issues.filter(i => i.state === 'OPEN').length, ci = g.issues.length - oi;
  if (g.issues.length) h += `<span class="badge ${oi ? 'bad' : 'ok'}" title="${esc(g.issues.map(i => '#' + i.num + ' ' + i.title + ' [' + i.state + ']').join('\n'))}">🐛 issues: ${oi} open · ${ci} closed</span>`;
  g.prs.slice(-3).forEach(p => h += `<span class="badge ${p.state === 'OPEN' ? 'ok' : p.state === 'MERGED' ? 'mag' : ''}" title="${esc(p.title)}">⇄ PR #${p.num} ${p.state.toLowerCase()}</span>`);
  if (g.releases.length) h += `<span class="badge yel">🚀 release ${esc(g.releases[0].tag)}</span>`;
  const run = g.runs[0];
  if (run) h += `<span class="badge ${run.status !== 'completed' ? 'warn' : run.conclusion === 'success' ? 'ok' : 'bad'}">🤖 ${esc(run.wf)}: ${run.status !== 'completed' ? (run.status === 'queued' ? '◷ queued' : '◐ running…') : run.conclusion === 'success' ? '✓ passed' : '✗ failed'}</span>`;
  if (g.pages.enabled) h += g.pages.site ? `<button class="lime" data-site="${esc(g.key)}">🌐 VISIT SITE</button>` : `<span class="badge cy">🌐 Pages on (${g.pages.type === 'workflow' ? 'Actions' : 'branch'}) — not deployed yet</span>`;
  else if (g.owner === 'you' && E.workflows(E.tree(g.branches[g.def])).some(w => w.deploy)) h += `<button class="ghost" data-pages="${esc(g.key)}" ${g.vis !== 'public' ? 'disabled title="Pages is free for public repos"' : ''}>⚙ SETTINGS → PAGES</button>`;
  return h + '</div></div>';
}
const cardId = k => 'c_' + k.replace(/[^\w]/g, '_');
function fileTree() {
  const here = E.cwd;
  const repoRoots = new Set(Object.keys(E.repos));
  let top = HOME; while (!(here === top || here.startsWith(top + '/')) && top !== '/') top = E.parent(top);
  const walk = (dir, depth) => {
    let kids = E.children(dir).filter(k => k !== '.git');
    const isHere = dir === here;
    let h = `<div class="fd ${isHere ? 'here' : ''}"><span>${repoRoots.has(dir) ? '🕰 ' : '📁 '}${esc(dir === HOME ? '~' : dir === '/' ? '' : dir === top ? dir : E.base(dir))}/</span>`;
    if (repoRoots.has(dir) && !isHere && !here.startsWith(dir + '/')) return h + `<div class="in"><span class="ff dot">git repo · see card</span></div></div>`;
    if (depth > 3) return h + '<div class="in"><span class="ff dot">…</span></div></div>';
    const dirs = kids.filter(k => E.isDir(dir + '/' + k)), files = kids.filter(k => !E.isDir(dir + '/' + k));
    h += '<div class="in">';
    dirs.slice(0, 10).forEach(d => h += walk(dir + '/' + d, depth + 1));
    files.slice(0, 10).forEach(f => h += `<span class="ff ${f.startsWith('.') ? 'dot' : ''}">${esc(f)}</span>`);
    if (kids.length > 20) h += `<span class="ff dot">+${kids.length - 20}</span>`;
    return h + '</div></div>';
  };
  return `<div class="ftree">${walk(top, 0)}</div>`;
}
function renderDash(evs) {
  const locals = Object.values(E.repos).sort((a, b) => a.root.localeCompare(b.root));
  const ghs = Object.values(E.gh).sort((a, b) => a.created - b.created);
  let L = `<div class="zone" id="zL"><div class="zone-h">💻 YOUR LAPTOP <span class="tag">📍 ${esc(E.pretty(E.cwd))}</span></div>${fileTree()}`;
  L += locals.length ? locals.map(localCard).join('') : '';
  L += '</div>';
  let G = `<div class="zone" id="zG"><div class="zone-h">☁ GITHUB.COM <span class="tag ${E.auth.ok ? 'good' : ''}">${E.auth.ok ? '✓ logged in as @you' + (E.ssh.added ? ' · 🔑 ssh' : '') : '🔒 not logged in'}</span></div>`;
  G += ghs.length ? ghs.map(ghCard).join('') : `<div class="empty-zone">Nothing on GitHub yet.<br>Repos you create, clone or fork will appear here.</div>`;
  G += '</div>';
  $('#dashGrid').innerHTML = L + G;
  // mark seen commits
  Object.keys(E.commits).forEach(id => seen.add(id));
  document.querySelectorAll('[data-site]').forEach(b => b.onclick = () => openSite(E.gh[b.dataset.site]));
  document.querySelectorAll('[data-pages]').forEach(b => b.onclick = () => {
    const k = b.dataset.pages; E.enablePages(k, 'workflow');
    termLine([{ t: '(you clicked Settings → Pages → Build and deployment → Source: GitHub Actions on ' + k + ')', c: 'mag' }, { t: '✓ GitHub Pages enabled. Your site will be at ' + E.gh[k].pages.url + ' after the next successful deploy run.', c: 'ok' }, { t: 'hint: trigger it with git push or  gh workflow run pages.yml', c: 'dim' }]);
    SFX.ok(); after();
  });
  requestAnimationFrame(drawWires);
  const fk = [...flashKeys]; if (fk.length) setTimeout(() => { fk.forEach(k => flashKeys.delete(k)); document.querySelectorAll('.repo.flash').forEach(x => x.classList.remove('flash')); }, 1400);
  if (evs && evs.length) { const scrollTo = evs.find(x => x.key && E.gh[x.key]); if (scrollTo) { const el = document.getElementById(cardId('G:' + scrollTo.key)); el && el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } }
}
function drawWires() {
  const svg = $('#wires'), host = $('#dash');
  if (!svg || !host) return;
  const hb = host.getBoundingClientRect();
  svg.setAttribute('width', host.scrollWidth); svg.setAttribute('height', host.scrollHeight);
  const pos = el => { const b = el.getBoundingClientRect(); return { l: b.left - hb.left + host.scrollLeft, r: b.right - hb.left + host.scrollLeft, t: b.top - hb.top + host.scrollTop, b: b.bottom - hb.top + host.scrollTop }; };
  let s = '<defs><marker id="wa" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#ff2bd6"/></marker><marker id="wb" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#ffe14d"/></marker><marker id="wf" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#a070ff"/></marker></defs>';
  let k = 0;
  for (const r of Object.values(E.repos)) {
    const a = document.getElementById(cardId('L:' + r.root)); if (!a) continue;
    for (const [n, url] of Object.entries(r.remotes)) {
      const key = Engine.ghKeyFromUrl(url); const b = key && document.getElementById(cardId('G:' + key)); if (!b) continue;
      const A = pos(a), B = pos(b); const col = n === 'origin' ? '#ff2bd6' : '#ffe14d';
      let d, lx, ly;
      if (B.l > A.r - 10) { const y1 = A.t + 22 + k * 10, y2 = B.t + 22; const x1 = A.r, x2 = B.l; d = `M${x1 + 2},${y1} C${x1 + 40},${y1} ${x2 - 40},${y2} ${x2 - 2},${y2}`; lx = x1 + 34; ly = y1 - 6; }
      else { const x1 = (A.l + A.r) / 2 + k * 14, y1 = A.b, x2 = (B.l + B.r) / 2, y2 = B.t; d = `M${x1},${y1} C${x1},${y1 + 40} ${x2},${y2 - 40} ${x2},${y2 - 2}`; lx = (x1 + x2) / 2 + 6; ly = (y1 + y2) / 2; }
      s += `<path d="${d}" stroke="${col}" stroke-width="2.5" fill="none" stroke-dasharray="7 5" marker-start="url(#${n === 'origin' ? 'wa' : 'wb'})" marker-end="url(#${n === 'origin' ? 'wa' : 'wb'})"><animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1s" repeatCount="indefinite"/></path><text x="${lx}" y="${ly}" fill="${col}" font-size="9" font-family="Press Start 2P,monospace" text-anchor="middle" paint-order="stroke" stroke="#06061a" stroke-width="4">${esc(n)}</text>`;
      k++;
    }
  }
  for (const g of Object.values(E.gh)) {
    if (!g.forkOf || g.deleted) continue;
    const a = document.getElementById(cardId('G:' + g.forkOf)), b = document.getElementById(cardId('G:' + g.key)); if (!a || !b) continue;
    const A = pos(a), B = pos(b); const x1 = A.r - 70, x2 = B.r - 70;
    if (B.t > A.b) s += `<path d="M${x1},${A.b} C${x1},${A.b + 20} ${x2},${B.t - 20} ${x2},${B.t - 2}" stroke="#a070ff" stroke-width="3" fill="none" marker-end="url(#wf)"/><text x="${x1 - 10}" y="${(A.b + B.t) / 2 + 4}" fill="#a070ff" font-size="9" text-anchor="end" font-family="Press Start 2P,monospace">⑂ fork</text>`;
  }
  svg.innerHTML = s;
}

// ================= WIRING =================
function init() {
  $('#cmd').addEventListener('keydown', onKey);
  $('#term').addEventListener('mouseup', () => { if (!window.getSelection().toString()) $('#cmd').focus(); });
  $('#mapBtn').onclick = () => { SFX.key(); showTitle(); };
  $('#questbar').onclick = () => { if (cur && hintsUsed < cur.hints.length && goalState.some(s => !s)) { hintsUsed++; SFX.key(); renderMission(); const hb = $('#hintBox'); hb && hb.lastElementChild && hb.lastElementChild.scrollIntoView({ block: 'nearest' }); } $('#cmd').focus(); };
  $('#lessonBtn').onclick = () => { if (cur.lesson.length) openLesson(0); };
  $('#movesBtn').onclick = openMoves;
  $('#soundBtn').onclick = () => { save.sound = !save.sound; persist(); renderHUD(); };
  $('#prevBtn').onclick = () => { if (curIdx > 0) startLevel(curIdx - 1); };
  $('#nextBtn').onclick = () => { if (curIdx < LV.length - 1) startLevel(curIdx + 1); };
  $('#dash').addEventListener('scroll', () => requestAnimationFrame(drawWires));
  window.addEventListener('resize', () => requestAnimationFrame(drawWires));
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && !$('#ov').classList.contains('hidden') && !$('#edTa')) { closeOv(); $('#cmd') && $('#cmd').focus(); } });
  setInterval(() => { if (E && E.settle()) { renderDash([]); checkGoals(); const done = Object.values(E.gh).flatMap(g => g.runs).filter(x => x.status === 'completed' && !x._told); done.forEach(x => x._told = true); const r = done[0]; if (r) { toast(r.conclusion === 'success' ? '🤖 ' + r.wf + ' ✓ PASSED' : '🤖 ' + r.wf + ' ✗ FAILED'); r.conclusion === 'success' ? SFX.ok() : SFX.err(); } } }, 800);
  window.addEventListener('hashchange', () => { const h = (location.hash || '').match(/^#stage-([\w-]+)$/); if (!h || (cur && cur.id === h[1])) return; const i = LV.findIndex(l => l.id === h[1]); if (i >= 0 || h[1] === 'sandbox') { closeOv(); startLevel(i); } });
  const m = (location.hash || '').match(/^#stage-([\w-]+)$/);
  if (m) { const i = LV.findIndex(l => l.id === m[1]); if (i >= 0 || m[1] === 'sandbox') { startLevel(i); return; } }
  showTitle();
}
window.addEventListener('DOMContentLoaded', init);
})();
