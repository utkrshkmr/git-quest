// ===================== GIT QUEST — simulated shell + git + gh engine =====================
(function (root) {
'use strict';
const HOME = '/home/you';
const ME = 'you';

const cp = o => JSON.parse(JSON.stringify(o));
function ghKeyFromUrl(u) {
  if (!u) return null;
  u = String(u).trim();
  let m = u.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/) ||
          u.match(/^(?:ssh:\/\/)?git@github\.com[:\/]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
  return m ? m[1] + '/' + m[2] : null;
}
const isSsh = u => /git@github\.com/.test(u || '');
const ghUrl = key => 'https://github.com/' + key + '.git';
function diffTrees(a, b) {
  const r = { added: [], modified: [], deleted: [] };
  for (const k of Object.keys(b)) { if (!(k in a)) r.added.push(k); else if (a[k] !== b[k]) r.modified.push(k); }
  for (const k of Object.keys(a)) if (!(k in b)) r.deleted.push(k);
  for (const x in r) r[x].sort();
  return r;
}
const sameTree = (a, b) => { const d = diffTrees(a, b); return !d.added.length && !d.modified.length && !d.deleted.length; };
function splitLines(s) { if (s === undefined || s === null) return []; const a = s.split('\n'); if (a.length && a[a.length - 1] === '') a.pop(); return a; }
function lineDiff(a, b) {
  const A = splitLines(a), B = splitLines(b), n = A.length, m = B.length;
  const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = []; let i = 0, j = 0;
  while (i < n && j < m) { if (A[i] === B[j]) { out.push([' ', A[i]]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) { out.push(['-', A[i]]); i++; } else { out.push(['+', B[j]]); j++; } }
  while (i < n) out.push(['-', A[i++]]); while (j < m) out.push(['+', B[j++]]);
  return out;
}
function lev(a, b) { const d = []; for (let i = 0; i <= a.length; i++) { d[i] = [i]; } for (let j = 0; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; }

function tokenize(line) {
  const toks = []; let cur = null, i = 0;
  const push = () => { if (cur !== null) { toks.push({ w: cur }); cur = null; } };
  while (i < line.length) {
    const ch = line[i];
    if (ch === '"' || ch === "'") {
      const q = ch; let j = i + 1, s = '';
      while (j < line.length && line[j] !== q) {
        if (q === '"' && line[j] === '\\' && j + 1 < line.length && '"\\$`'.includes(line[j + 1])) { s += line[j + 1]; j += 2; continue; }
        s += line[j]; j++;
      }
      if (j >= line.length) throw new Error('unexpected EOF while looking for matching ' + q);
      cur = (cur || '') + s; i = j + 1; continue;
    }
    if (ch === ' ' || ch === '\t') { push(); i++; continue; }
    if (ch === '&' && line[i + 1] === '&') { push(); toks.push({ op: '&&' }); i += 2; continue; }
    if (ch === '|' && line[i + 1] === '|') { push(); toks.push({ op: '||' }); i += 2; continue; }
    if (ch === '|') { push(); toks.push({ op: '|' }); i++; continue; }
    if (ch === ';') { push(); toks.push({ op: ';' }); i++; continue; }
    if (ch === '>') { push(); if (line[i + 1] === '>') { toks.push({ op: '>>' }); i += 2; } else { toks.push({ op: '>' }); i++; } continue; }
    if (ch === '\\' && i + 1 < line.length) { cur = (cur || '') + line[i + 1]; i += 2; continue; }
    cur = (cur || '') + ch; i++;
  }
  push(); return toks;
}

// generic flag parser. valued: set of flags that take a value.
function parseArgs(args, valued) {
  valued = new Set(valued || []);
  const pos = [], f = {}, multi = {};
  const set = (k, v) => { if (f[k] !== undefined && valued.has(k)) { (multi[k] = multi[k] || [f[k]]).push(v); } f[k] = v; };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--') { pos.push(...args.slice(i + 1)); f['--'] = true; break; }
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq > 0) set(a.slice(0, eq), a.slice(eq + 1));
      else if (valued.has(a)) { set(a, args[i + 1]); i++; }
      else f[a] = true;
    } else if (a.startsWith('-') && a.length > 1 && !/^-\d+$/.test(a)) {
      if (valued.has(a)) { set(a, args[i + 1]); i++; continue; }
      const chars = a.slice(1).split('');
      for (let c = 0; c < chars.length; c++) {
        const k = '-' + chars[c];
        if (valued.has(k)) { const rest = chars.slice(c + 1).join(''); if (rest) set(k, rest); else { set(k, args[i + 1]); i++; } break; }
        f[k] = true;
      }
    } else pos.push(a);
  }
  f._multi = multi;
  return { pos, f };
}

class Fatal extends Error {}

function Engine() { this.reset(); }
Engine.prototype = {
  reset() {
    this.fs = { '/': { d: 1 } }; this.repos = {}; this.commits = {}; this.gh = {}; this.cwd = HOME;
    this.config = {}; this.auth = { ok: false, scopes: [] }; this.ssh = { key: false, added: false };
    this.clock = 0; this.runSeq = 1000; this.history = []; this.testRules = []; this.events = [];
    this.mkdirp(HOME); this.out = []; this.actions = []; this.realtime = true;
  },
  tick() { return ++this.clock; },
  // ---------- output ----------
  p(text, c) { String(text).split('\n').forEach(t => this.out.push({ t, c: c || '' })); },
  err(text) { this.p(text, 'err'); },
  die(text) { this.err(text); throw new Fatal(text); },
  ev(type, data) { this.events.push(Object.assign({ type, at: Date.now() }, data || {})); },
  // ---------- fs ----------
  norm(p, base) {
    if (p === undefined || p === null || p === '') return base || this.cwd;
    if (p === '~' || p.startsWith('~/')) p = HOME + p.slice(1);
    if (!p.startsWith('/')) p = (base || this.cwd) + '/' + p;
    const parts = [];
    for (const s of p.split('/')) { if (!s || s === '.') continue; if (s === '..') parts.pop(); else parts.push(s); }
    return '/' + parts.join('/');
  },
  parent(p) { const i = p.lastIndexOf('/'); return i <= 0 ? '/' : p.slice(0, i); },
  base(p) { return p.slice(p.lastIndexOf('/') + 1); },
  isDir(p) { return !!(this.fs[p] && this.fs[p].d); },
  isFile(p) { return !!(this.fs[p] && !this.fs[p].d); },
  exists(p) { return !!this.fs[p]; },
  mkdirp(p) { const parts = p.split('/').filter(Boolean); let cur = ''; for (const s of parts) { cur += '/' + s; if (!this.fs[cur]) this.fs[cur] = { d: 1 }; } },
  write(p, c) { this.mkdirp(this.parent(p)); this.fs[p] = { c: c }; },
  read(p) { return this.fs[p] && !this.fs[p].d ? this.fs[p].c : undefined; },
  children(dir) { const pre = dir === '/' ? '/' : dir + '/'; const out = []; for (const k in this.fs) { if (k !== dir && k.startsWith(pre) && k.indexOf('/', pre.length) < 0) out.push(k.slice(pre.length)); } return out.sort(); },
  rmTree(p) { const pre = p + '/'; for (const k of Object.keys(this.fs)) if (k === p || k.startsWith(pre)) delete this.fs[k]; for (const r of Object.keys(this.repos)) if (r === p || r.startsWith(pre)) delete this.repos[r]; },
  pretty(p) { return p === HOME ? '~' : p.startsWith(HOME + '/') ? '~' + p.slice(HOME.length) : p; },
  // ---------- repo helpers ----------
  findRepo(dir) { let d = dir || this.cwd; while (true) { if (this.repos[d]) return this.repos[d]; if (d === '/') return null; d = this.parent(d); } },
  needRepo() { const r = this.findRepo(); if (!r) this.die('fatal: not a git repository (or any of the parent directories): .git'); return r; },
  needWork(r) { if (r.bare) this.die('fatal: this operation must be run in a work tree'); },
  newRepo(rootPath, bare, branch) {
    const r = { root: rootPath, bare: !!bare, branches: {}, head: { branch: branch || this.config['init.defaultbranch'] || 'main' }, index: {}, remotes: {}, rrefs: {}, tags: {}, stash: [], merging: null, upstream: {}, reflog: [], prev: null };
    this.repos[rootPath] = r; this.mkdirp(rootPath);
    if (bare) { ['HEAD', 'config', 'description'].forEach(f => this.write(rootPath + '/' + f, f === 'HEAD' ? 'ref: refs/heads/main\n' : '')); ['objects', 'refs', 'hooks'].forEach(d => this.mkdirp(rootPath + '/' + d)); }
    else { this.mkdirp(rootPath + '/.git'); }
    return r;
  },
  headId(r) { return r.head.branch !== undefined ? r.branches[r.head.branch] : r.head.detached; },
  curBranch(r) { return r.head.branch; },
  tree(id) { return id && this.commits[id] ? this.commits[id].tree : {}; },
  work(r) {
    const pre = r.root + '/', w = {};
    const nested = Object.keys(this.repos).filter(x => x !== r.root && x.startsWith(pre)).map(x => x + '/');
    for (const p in this.fs) {
      if (!p.startsWith(pre) || this.fs[p].d) continue;
      const rel = p.slice(pre.length);
      if (rel === '.git' || rel.startsWith('.git/')) continue;
      if (nested.some(n => p.startsWith(n))) continue;
      w[rel] = this.fs[p].c;
    }
    return w;
  },
  setWork(r, rel, c) {
    const abs = r.root + '/' + rel;
    if (c === undefined) {
      delete this.fs[abs];
      let d = this.parent(abs);
      while (d !== r.root && d.startsWith(r.root) && this.children(d).length === 0) { delete this.fs[d]; d = this.parent(d); }
    } else this.write(abs, c);
  },
  ignorer(text) {
    const pats = splitLines(text || '').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
    const rx = g => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]').replace(/\u0000/g, '.*') + '$');
    const tests = pats.map(pt => {
      let neg = false; if (pt.startsWith('!')) { neg = true; pt = pt.slice(1); }
      const dirOnly = pt.endsWith('/'); if (dirOnly) pt = pt.slice(0, -1);
      const anchored = pt.startsWith('/'); if (anchored) pt = pt.slice(1);
      const re = rx(pt);
      return { neg, fn: rel => {
        const segs = rel.split('/');
        if (anchored || pt.includes('/')) { for (let i = 1; i <= segs.length; i++) { if (re.test(segs.slice(0, i).join('/')) && (!dirOnly || i < segs.length)) return true; } return false; }
        for (let i = 0; i < segs.length; i++) { if (re.test(segs[i]) && (!dirOnly || i < segs.length - 1)) return true; }
        return false;
      } };
    });
    return rel => { let ig = false; for (const t of tests) if (t.fn(rel)) ig = !t.neg; return ig; };
  },
  status(r) {
    const head = this.tree(this.headId(r)), idx = r.index, w = this.work(r), ign = this.ignorer(w['.gitignore']);
    const staged = diffTrees(head, idx);
    const unstaged = { modified: [], deleted: [] }; const untracked = [], ignored = [];
    for (const p of Object.keys(idx).sort()) { if (!(p in w)) unstaged.deleted.push(p); else if (w[p] !== idx[p]) unstaged.modified.push(p); }
    for (const p of Object.keys(w).sort()) if (!(p in idx)) (ign(p) ? ignored : untracked).push(p);
    const conflicts = r.merging ? r.merging.conflicts.slice() : [];
    const clean = !staged.added.length && !staged.modified.length && !staged.deleted.length && !unstaged.modified.length && !unstaged.deleted.length;
    return { staged, unstaged, untracked, ignored, conflicts, clean, head, idx, w };
  },
  // ---------- commit graph ----------
  newId() { let s; do { s = ''; for (let i = 0; i < 7; i++) s += '0123456789abcdef'[Math.random() * 16 | 0]; } while (this.commits[s]); return s; },
  mkCommit(msg, parents, tree, author) {
    const id = this.newId();
    this.commits[id] = { id, msg, parents: parents.filter(Boolean), tree: cp(tree), author: author || this.me(), t: this.tick() };
    return id;
  },
  me() { return (this.config['user.name'] || 'you') + ' <' + (this.config['user.email'] || 'you@example.com') + '>'; },
  ancestors(id) { const s = new Set(); const st = id ? [id] : []; while (st.length) { const x = st.pop(); if (s.has(x)) continue; s.add(x); (this.commits[x] ? this.commits[x].parents : []).forEach(p => st.push(p)); } return s; },
  isAnc(a, b) { return !!a && this.ancestors(b).has(a); },
  mergeBase(a, b) { const A = this.ancestors(a); let best = null; for (const x of this.ancestors(b)) if (A.has(x) && (!best || this.commits[x].t > this.commits[best].t)) best = x; return best; },
  count(fromId, notId) { const n = this.ancestors(notId); let c = 0; for (const x of this.ancestors(fromId)) if (!n.has(x)) c++; return c; },
  resolve(r, ref, quiet) {
    if (!ref) return null;
    const m = ref.match(/^(.*?)((?:[~^]\d*)*)$/); let base = m[1], suf = m[2], id = null;
    if (base === 'HEAD' || base === '@') id = this.headId(r);
    else if (r.branches[base] !== undefined) id = r.branches[base];
    else if (r.rrefs[base]) id = r.rrefs[base];
    else if (r.tags[base]) id = r.tags[base].id;
    else if (r.rrefs['origin/' + base] && base.includes('/') === false && false) id = null;
    else if (/^[0-9a-f]{4,40}$/.test(base)) { const ms = Object.keys(this.commits).filter(k => k.startsWith(base) || base.startsWith(k)); if (ms.length === 1) id = ms[0]; }
    else { const rl = base.match(/^HEAD@\{(\d+)\}$/); if (rl) { const e = r.reflog[r.reflog.length - 1 - (+rl[1])]; id = e ? e.id : null; } }
    if (!id) { if (quiet) return null; this.die("fatal: ambiguous argument '" + ref + "': unknown revision or path not in the working tree."); }
    const toks = suf.match(/[~^]\d*/g) || [];
    for (const t of toks) {
      const n = t.length > 1 ? +t.slice(1) : 1;
      if (t[0] === '~') { for (let i = 0; i < n; i++) { id = this.commits[id] && this.commits[id].parents[0]; if (!id) { if (quiet) return null; this.die("fatal: ambiguous argument '" + ref + "': unknown revision"); } } }
      else { id = n === 0 ? id : this.commits[id].parents[n - 1]; if (!id) { if (quiet) return null; this.die("fatal: ambiguous argument '" + ref + "': unknown revision"); } }
    }
    return id;
  },
  setHead(r, id, why) {
    if (r.head.branch !== undefined) r.branches[r.head.branch] = id; else r.head.detached = id;
    r.reflog.push({ id, msg: why });
  },
  reflogMove(r, why) { r.reflog.push({ id: this.headId(r), msg: why }); },
  decorate(r, id, isGh) {
    const out = [];
    if (r) {
      if (r.head.detached === id) out.push('HEAD');
      for (const b of Object.keys(r.branches)) if (r.branches[b] === id) out.push(r.head.branch === b ? 'HEAD -> ' + b : b);
      for (const b of Object.keys(r.rrefs)) if (r.rrefs[b] === id) out.push(b);
      for (const t of Object.keys(r.tags)) if (r.tags[t].id === id) out.push('tag: ' + t);
    }
    return out;
  },
  // move worktree+index from current HEAD tree to target tree (checkout semantics)
  checkoutTree(r, fromTree, toTree, force) {
    const st = this.status(r);
    const paths = new Set([...Object.keys(fromTree), ...Object.keys(toTree)]);
    const blocked = [];
    for (const p of paths) {
      if (fromTree[p] === toTree[p]) continue;
      const dirtyIdx = st.idx[p] !== fromTree[p];
      const dirtyW = st.w[p] !== st.idx[p];
      if (!force && (dirtyIdx || dirtyW) && (p in st.idx || p in fromTree)) blocked.push(p);
      else if (!force && !(p in fromTree) && (p in st.w) && st.w[p] !== toTree[p]) blocked.push(p); // untracked would be overwritten
    }
    if (blocked.length) {
      this.die('error: Your local changes to the following files would be overwritten by checkout:\n' + blocked.map(b => '\t' + b).join('\n') + '\nPlease commit your changes or stash them before you switch branches.\nAborting');
    }
    const newIdx = cp(toTree);
    if (!force) for (const p of Object.keys(st.idx)) if (fromTree[p] === toTree[p] && st.idx[p] !== fromTree[p]) newIdx[p] = st.idx[p];
    if (!force) for (const p of Object.keys(fromTree)) if (!(p in st.idx) && fromTree[p] === toTree[p]) delete newIdx[p];
    for (const p of paths) {
      if (!force && fromTree[p] === toTree[p]) continue;
      this.setWork(r, p, toTree[p]);
    }
    if (force) { for (const p of Object.keys(st.idx)) if (!(p in toTree) && !(p in fromTree)) { /* keep staged-new? drop on hard */ this.setWork(r, p, undefined); } }
    r.index = newIdx;
  },
  merge3(baseT, oursT, theirsT, oursName, theirsName) {
    const res = {}, conflicts = [], markers = {};
    const paths = new Set([...Object.keys(baseT), ...Object.keys(oursT), ...Object.keys(theirsT)]);
    for (const p of [...paths].sort()) {
      const b = baseT[p], o = oursT[p], t = theirsT[p];
      let v;
      if (o === t) v = o; else if (b === o) v = t; else if (b === t) v = o;
      else {
        conflicts.push(p);
        if (o !== undefined && t !== undefined) v = '<<<<<<< ' + oursName + '\n' + splitLines(o).join('\n') + '\n=======\n' + splitLines(t).join('\n') + '\n>>>>>>> ' + theirsName + '\n';
        else v = o !== undefined ? o : t;
        markers[p] = v; continue;
      }
      if (v !== undefined) res[p] = v;
    }
    return { res, conflicts, markers };
  },
  applyChange(cur, from, to) { // apply diff(from->to) onto cur; returns {tree, conflicts}
    const out = cp(cur), conflicts = [];
    const d = diffTrees(from, to);
    for (const p of [...d.added, ...d.modified, ...d.deleted]) {
      if (cur[p] !== from[p] && cur[p] !== to[p]) { conflicts.push(p); continue; }
      if (to[p] === undefined) delete out[p]; else out[p] = to[p];
    }
    return { tree: out, conflicts };
  },
  stat(fromT, toT) {
    const d = diffTrees(fromT, toT); const lines = []; let ins = 0, del = 0;
    for (const p of [...d.added, ...d.modified, ...d.deleted].sort()) {
      const ld = lineDiff(fromT[p], toT[p]); const a = ld.filter(x => x[0] === '+').length, r = ld.filter(x => x[0] === '-').length; ins += a; del += r;
      lines.push(' ' + p + ' | ' + (a + r) + ' ' + '+'.repeat(Math.min(a, 20)) + '-'.repeat(Math.min(r, 20)));
    }
    const n = lines.length;
    if (n) lines.push(' ' + n + ' file' + (n > 1 ? 's' : '') + ' changed' + (ins ? ', ' + ins + ' insertion' + (ins > 1 ? 's' : '') + '(+)' : '') + (del ? ', ' + del + ' deletion' + (del > 1 ? 's' : '') + '(-)' : ''));
    d.added.forEach(p => lines.push(' create mode 100644 ' + p)); d.deleted.forEach(p => lines.push(' delete mode 100644 ' + p));
    return lines.join('\n');
  },
  printDiff(fromT, toT, paths) {
    const d = diffTrees(fromT, toT);
    let all = [...d.added, ...d.modified, ...d.deleted].sort();
    if (paths && paths.length) all = all.filter(p => paths.some(x => p === x || p.startsWith(x + '/')));
    for (const p of all) {
      this.p('diff --git a/' + p + ' b/' + p, 'b');
      if (fromT[p] === undefined) this.p('new file mode 100644', 'b');
      if (toT[p] === undefined) this.p('deleted file mode 100644', 'b');
      this.p('--- ' + (fromT[p] === undefined ? '/dev/null' : 'a/' + p), 'b');
      this.p('+++ ' + (toT[p] === undefined ? '/dev/null' : 'b/' + p), 'b');
      this.p('@@ @@', 'cy');
      for (const [k, l] of lineDiff(fromT[p], toT[p])) this.p(k + l, k === '+' ? 'ok' : k === '-' ? 'err' : '');
    }
  },
  // ---------- GitHub model ----------
  ghCreate(key, o) {
    o = o || {};
    const [owner, name] = key.split('/');
    const g = { key, owner, name, branches: {}, tags: {}, def: o.def || 'main', vis: o.vis || 'public', forkOf: o.forkOf || null, desc: o.desc || '', issues: [], prs: [], releases: [], runs: [], pages: { enabled: false, type: null, site: null, url: null }, deleted: false, num: 0, stars: o.stars || 0, created: this.tick() };
    this.gh[key] = g; return g;
  },
  ghGet(key) { const g = this.gh[key]; return g && !g.deleted ? g : null; },
  ghCommit(key, branch, msg, files, del, author) {
    const g = this.gh[key]; const parent = g.branches[branch]; const t = cp(this.tree(parent));
    Object.assign(t, files || {}); (del || []).forEach(p => delete t[p]);
    const id = this.mkCommit(msg, [parent], t, author || 'Octocat <octocat@github.com>'); g.branches[branch] = id; return id;
  },
  canSee(g) { return g && !g.deleted && (g.vis === 'public' || g.owner === ME); },
  canWrite(g) { return g.owner === ME; },
  remoteGh(r, name, forWrite) {
    let url = r.remotes[name];
    if (url === undefined) {
      if (ghKeyFromUrl(name)) url = name;
      else this.die("fatal: '" + name + "' does not appear to be a git repository\nfatal: Could not read from remote repository.\n\nPlease make sure you have the correct access rights\nand the repository exists.");
    }
    const key = ghKeyFromUrl(url); const g = this.gh[key];
    if (!key || !this.canSee(g)) this.die('remote: Repository not found.\nfatal: repository \'' + url + '\' not found');
    if (forWrite) {
      if (isSsh(url)) { if (!this.ssh.added) this.die('git@github.com: Permission denied (publickey).\nfatal: Could not read from remote repository.\n\nPlease make sure you have the correct access rights\nand the repository exists.'); }
      else if (!this.auth.ok) this.die("remote: Support for password authentication was removed on August 13, 2021.\nfatal: Authentication failed for '" + url + "'\nhint (simulator): log in first with  gh auth login");
      if (!this.canWrite(g)) this.die('remote: Permission to ' + key + '.git denied to ' + ME + '.\nfatal: unable to access \'' + url + '\': The requested URL returned error: 403');
    } else if (isSsh(url) && !this.ssh.added) this.die('git@github.com: Permission denied (publickey).\nfatal: Could not read from remote repository.');
    return { g, url, key };
  },
  // push side effects
  afterPush(g, branch, oldId, newId) {
    if (!newId) return;
    if (branch === g.def) {
      const old = this.ancestors(oldId);
      for (const id of this.ancestors(newId)) {
        if (old.has(id)) continue;
        const msg = this.commits[id].msg; const re = /\b(close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi; let m;
        while ((m = re.exec(msg))) { const it = g.issues.find(x => x.num === +m[2]); if (it && it.state === 'OPEN') { it.state = 'CLOSED'; it.closedBy = id; this.ev('issue-closed', { key: g.key, num: it.num }); } }
      }
    }
    this.triggerWorkflows(g, 'push', branch, newId);
  },
  workflows(tree) {
    const out = [];
    for (const p of Object.keys(tree)) {
      const m = p.match(/^\.github\/workflows\/([^/]+\.ya?ml)$/); if (!m) continue;
      out.push(this.parseWf(m[1], tree[p]));
    }
    return out;
  },
  parseWf(file, y) {
    const name = ((y.match(/^name:\s*["']?(.+?)["']?\s*$/m) || [])[1]) || file;
    const onIdx = y.search(/^on:/m); const jobsIdx = y.search(/^jobs:/m);
    const onSec = onIdx >= 0 ? y.slice(onIdx, jobsIdx > onIdx ? jobsIdx : undefined) : '';
    const trig = { push: /\bpush\b/.test(onSec), pr: /\bpull_request\b/.test(onSec), dispatch: /\bworkflow_dispatch\b/.test(onSec) };
    let branches = null; const bm = onSec.match(/branches:\s*\[([^\]]*)\]/); if (bm) branches = bm[1].split(',').map(s => s.trim().replace(/["']/g, '')).filter(Boolean);
    else { const bm2 = onSec.match(/branches:\s*\n((?:\s+-\s*.+\n?)+)/); if (bm2) branches = bm2[1].split('\n').map(s => s.replace(/^\s*-\s*/, '').trim().replace(/["']/g, '')).filter(Boolean); }
    const steps = []; const lines = y.split('\n'); let cur = null;
    for (const l of lines) {
      const sm = l.match(/^\s*-\s+(name|uses|run):\s*(.+)$/);
      if (sm) { cur = { name: null, uses: null, run: null }; steps.push(cur); cur[sm[1]] = sm[2].trim().replace(/^["']|["']$/g, ''); continue; }
      const km = l.match(/^\s+(name|uses|run|path):\s*(.+)$/); if (km && cur && (km[1] !== 'name' || !cur.name)) cur[km[1]] = km[2].trim().replace(/^["']|["']$/g, '');
    }
    return { file, name, trig, branches, steps, deploy: /actions\/deploy-pages/.test(y), upload: /upload-pages-artifact/.test(y), path: ((y.match(/upload-pages-artifact[\s\S]*?path:\s*["']?([^"'\n]+)/) || [])[1] || '.').trim() };
  },
  triggerWorkflows(g, event, branch, id) {
    const tree = this.tree(id);
    for (const wf of this.workflows(tree)) {
      const ok = (event === 'push' && wf.trig.push && (!wf.branches || wf.branches.includes(branch))) || (event === 'dispatch' && wf.trig.dispatch);
      if (ok) this.createRun(g, wf, id, branch, event === 'dispatch' ? 'workflow_dispatch' : 'push');
    }
    if (event === 'push' && g.pages.enabled && g.pages.type === 'legacy' && branch === g.pages.branch) {
      this.createRun(g, { file: 'pages-build-deployment', name: 'pages-build-deployment', steps: [{ name: 'build' }, { name: 'deploy' }], legacy: true, path: g.pages.path || '.' }, id, branch, 'dynamic');
    }
  },
  createRun(g, wf, id, branch, event) {
    const tree = this.tree(id); const steps = []; let ok = true;
    const log = (name, lines, good) => { steps.push({ name, lines: lines || [], ok: good !== false && ok }); if (good === false) ok = false; };
    if (wf.legacy) {
      const files = this.subtree(tree, wf.path);
      log('build', ['Building site from ' + branch + ' ' + wf.path]);
      log('deploy', ['Deployed to ' + g.pages.url]);
      const run = this.pushRun(g, wf, id, branch, event, steps, true); run.site = files; return run;
    }
    log('Set up job', ['Runner: ubuntu-latest', 'Operating System: Ubuntu 24.04']);
    let site = null;
    for (const s of wf.steps) {
      const name = s.name || (s.uses ? 'Run ' + s.uses : 'Run ' + s.run);
      if (!ok) { steps.push({ name, lines: [], ok: null }); continue; }
      if (s.uses && /checkout/.test(s.uses)) log(name, ['Syncing repository: ' + g.key, 'Checked out ' + id.slice(0, 7)]);
      else if (s.uses && /setup-node|setup-python/.test(s.uses)) log(name, ['Toolchain installed ✓']);
      else if (s.uses && /configure-pages/.test(s.uses)) {
        if (!(g.pages.enabled && g.pages.type === 'workflow')) log(name, ['Error: Get Pages site failed. Please verify that the repository has Pages enabled and configured to build using GitHub Actions, or consider exploring the `enablement` parameter for this action.', 'Error: HttpError: Not Found'], false);
        else log(name, ['Pages site found: ' + g.pages.url]);
      }
      else if (s.uses && /upload-pages-artifact/.test(s.uses)) {
        const files = this.subtree(tree, wf.path);
        if (!Object.keys(files).length) log(name, ['Error: tar: ' + wf.path + ': Cannot stat: No such file or directory'], false);
        else { site = files; log(name, ['Packaging ' + Object.keys(files).length + ' file(s) from "' + wf.path + '"', 'Artifact github-pages uploaded']); }
      }
      else if (s.uses && /deploy-pages/.test(s.uses)) {
        if (!(g.pages.enabled && g.pages.type === 'workflow')) log(name, ['Error: Failed to create deployment (status: 404). Ensure GitHub Pages has been enabled: Settings → Pages → Source: GitHub Actions'], false);
        else log(name, ['Created deployment for ' + id.slice(0, 7), 'Reported success!', '🚀 ' + g.pages.url]);
      }
      else if (s.run) {
        if (/\b(test|pytest)\b/.test(s.run) && this.testRules.length) {
          const lines = ['$ ' + s.run]; let pass = true;
          for (const t of this.testRules) { const r = t.check(tree); if (r === true) lines.push('  ✓ ' + t.name); else { pass = false; lines.push('  ✗ ' + t.name); if (typeof r === 'string') lines.push('      ' + r); } }
          lines.push(pass ? 'All tests passed.' : 'Error: Process completed with exit code 1.');
          log(name, lines, pass);
        } else log(name, ['$ ' + s.run, s.run.startsWith('echo ') ? s.run.slice(5).replace(/^["']|["']$/g, '') : 'done']);
      } else log(name, ['done']);
    }
    log('Complete job', ['Cleaning up orphan processes']);
    const run = this.pushRun(g, wf, id, branch, event, steps, ok);
    if (wf.deploy && site) run.site = site;
    return run;
  },
  pushRun(g, wf, id, branch, event, steps, ok) {
    const run = { id: ++this.runSeq, wf: wf.name, file: wf.file, commit: id, title: this.commits[id].msg.split('\n')[0], branch, event, steps, result: ok ? 'success' : 'failure', status: 'queued', conclusion: null, at: Date.now(), doneAt: Date.now() + (this.realtime ? 5000 : 0), key: g.key };
    g.runs.unshift(run); this.ev('run', { key: g.key, id: run.id });
    return run;
  },
  settle(force) {
    let changed = false;
    for (const g of Object.values(this.gh)) for (const run of g.runs) {
      if (run.status === 'completed') continue;
      if (force || Date.now() >= run.doneAt) {
        run.status = 'completed'; run.conclusion = run.result; changed = true;
        if (run.result === 'success' && run.site && g.pages.enabled) { g.pages.site = { files: run.site, commit: run.commit }; this.ev('deployed', { key: g.key }); }
      } else if (Date.now() >= run.at + 1200) { if (run.status !== 'in_progress') { run.status = 'in_progress'; changed = true; } }
    }
    return changed;
  },
  subtree(tree, path) {
    path = (path || '.').replace(/^\.\/?/, '').replace(/\/$/, '');
    const out = {};
    for (const p of Object.keys(tree)) { if (p.startsWith('.github/')) continue; if (!path) out[p] = tree[p]; else if (p.startsWith(path + '/')) out[p.slice(path.length + 1)] = tree[p]; }
    return out;
  },
  // ---------- command execution ----------
  run(line) {
    this.out = []; this.actions = [];
    line = line.trim();
    if (!line) return { lines: [], actions: [] };
    this.history.push(line);
    let toks;
    try { toks = tokenize(line); } catch (e) { this.err('bash: ' + e.message); return { lines: this.out, actions: this.actions }; }
    const segs = [[]], ops = [];
    for (const t of toks) { if (t.op === '&&' || t.op === '||' || t.op === ';') { segs.push([]); ops.push(t.op); } else segs[segs.length - 1].push(t); }
    let ok = true;
    for (let k = 0; k < segs.length; k++) {
      if (k > 0) { const op = ops[k - 1]; if (op === '&&' && !ok) continue; if (op === '||' && ok) continue; }
      ok = this.runSeg(segs[k]);
    }
    this.settle();
    for (const h of this.hooks || []) { try { h(this); } catch (e) {} }
    return { lines: this.out, actions: this.actions, ok };
  },
  runSeg(seg) {
    if (!seg.length) return true;
    if (seg.some(t => t.op === '|')) { this.err('bash (simulator): pipes | are not supported here — run the commands one at a time'); return false; }
    let redir = null; const words = [];
    for (let i = 0; i < seg.length; i++) {
      const t = seg[i];
      if (t.op === '>' || t.op === '>>') { const f = seg[i + 1]; if (!f || f.op) { this.err("bash: syntax error near unexpected token `newline'"); return false; } redir = { mode: t.op, file: f.w }; i++; }
      else words.push(t.w);
    }
    const saved = this.out; if (redir) this.out = [];
    const at = this.cwd, atRepo = (this.findRepo() || {}).root || null;
    let ok;
    try { ok = this.exec(words); } catch (e) { if (e instanceof Fatal) ok = false; else { this.err('internal simulator error: ' + e.message); if (typeof console !== 'undefined') console.error(e); ok = false; } }
    (this.cmdlog = this.cmdlog || []).push({ cmd: words.join(' '), cwd: at, repo: atRepo, ok: ok !== false });
    if (redir) {
      const good = this.out.filter(l => l.c !== 'err'), bad = this.out.filter(l => l.c === 'err');
      this.out = saved.concat(bad);
      const text = good.map(l => l.t).join('\n') + (good.length ? '\n' : '');
      const abs = this.norm(redir.file);
      if (this.isDir(abs)) { this.err('bash: ' + redir.file + ': Is a directory'); return false; }
      if (!this.isDir(this.parent(abs))) { this.err('bash: ' + redir.file + ': No such file or directory'); return false; }
      this.write(abs, redir.mode === '>>' ? (this.read(abs) || '') + text : text);
    }
    return ok !== false;
  },
  exec(w) {
    const cmd = w[0], a = w.slice(1);
    if (/^[A-Za-z_]+=/.test(cmd)) { this.err('bash (simulator): variables are not supported'); return false; }
    const sh = this.shell[cmd];
    if (sh) return sh.call(this, a);
    if (cmd === 'git') return this.git(a);
    if (cmd === 'gh') return this.ghCli(a);
    const known = Object.keys(this.shell).concat(['git', 'gh']);
    const close = known.filter(k => lev(k, cmd) <= 1);
    this.err(cmd + ': command not found' + (close.length ? '\n  did you mean: ' + close.join(', ') + ' ?' : ''));
    return false;
  },
  saveFile(path, content) { const abs = this.norm(path); this.write(abs, content); },
  // independent copy of the world (used to look ahead for hints); runs never wait in real time
  snapshot() {
    const e = new Engine();
    for (const k of ['fs', 'repos', 'commits', 'gh', 'cwd', 'prevCwd', 'config', 'auth', 'ssh', 'clock', 'runSeq', 'history', 'lv', 'visited', 'readFiles', 'cmdlog']) if (this[k] !== undefined) e[k] = JSON.parse(JSON.stringify(this[k]));
    e.testRules = this.testRules; e.hooks = this.hooks; e.realtime = false; e.events = [];
    return e;
  },
};

// =================== SHELL ===================
Engine.prototype.shell = {
  help() {
    this.p('GIT QUEST terminal — a safe, simulated Linux shell.', 'hi');
    this.p('Shell:  pwd  ls [-a]  cd  mkdir [-p]  touch  cat  echo "text" > file  rm [-r]  mv  cp  tree  nano <file>  clear');
    this.p('Git:    git <command>        (try: git help)');
    this.p('GitHub: gh <command>         (try: gh help)');
    this.p('Tips:   ↑/↓ history · Tab completes · chain with &&');
  },
  clear() { this.actions.push({ type: 'clear' }); },
  pwd() { this.p(this.cwd); },
  whoami() { this.p('you'); },
  date() { this.p(new Date().toString()); },
  exit() { this.p('Nice try 😄 — there is no escape from Git Quest. (Use the menu to switch levels.)', 'warn'); },
  history() { this.history.forEach((h, i) => this.p(String(i + 1).padStart(4) + '  ' + h)); },
  ls(a) {
    const { pos, f } = parseArgs(a);
    const all = f['-a'] || f['-A'], long = f['-l'];
    const targets = pos.length ? pos : ['.'];
    for (const t of targets) {
      const p = this.norm(t);
      if (!this.exists(p)) { this.err("ls: cannot access '" + t + "': No such file or directory"); continue; }
      if (targets.length > 1) this.p(t + ':');
      if (this.isFile(p)) { this.p(t); continue; }
      let kids = this.children(p); if (!all) kids = kids.filter(k => !k.startsWith('.'));
      if (all) kids = ['.', '..'].concat(kids);
      if (!kids.length) continue;
      const fmt = k => { const full = this.norm(k, p); return this.isDir(full) ? k + '/' : k; };
      if (long) kids.forEach(k => { const full = this.norm(k, p); const d = this.isDir(full); this.p((d ? 'drwxr-xr-x' : '-rw-r--r--') + '  you  ' + String(d ? 4096 : (this.read(full) || '').length).padStart(6) + '  ' + fmt(k), d ? 'dir' : ''); });
      else this.out.push({ t: kids.map(fmt).join('   '), c: '', parts: kids.flatMap((k, i) => [{ t: (i ? '   ' : '') + fmt(k), c: this.isDir(this.norm(k, p)) ? 'dir' : '' }]) });
    }
  },
  cd(a) {
    const t = a[0] === '-' ? (this.prevCwd || this.cwd) : a[0];
    const p = this.norm(t || '~');
    if (!this.exists(p)) this.die('bash: cd: ' + a[0] + ': No such file or directory');
    if (!this.isDir(p)) this.die('bash: cd: ' + a[0] + ': Not a directory');
    this.prevCwd = this.cwd; this.cwd = p; (this.visited = this.visited || []).push(p);
  },
  mkdir(a) {
    const { pos, f } = parseArgs(a);
    if (!pos.length) this.die('mkdir: missing operand');
    for (const d of pos) {
      const p = this.norm(d);
      if (this.exists(p)) { if (!f['-p']) this.die("mkdir: cannot create directory '" + d + "': File exists"); continue; }
      if (!f['-p'] && !this.isDir(this.parent(p))) this.die("mkdir: cannot create directory '" + d + "': No such file or directory");
      this.mkdirp(p);
    }
  },
  touch(a) {
    if (!a.length) this.die('touch: missing file operand');
    for (const x of a) { const p = this.norm(x); if (this.isDir(p)) continue; if (!this.isDir(this.parent(p))) this.die("touch: cannot touch '" + x + "': No such file or directory"); if (!this.exists(p)) this.write(p, ''); }
  },
  cat(a) {
    if (!a.length) this.die('cat: missing file operand');
    for (const x of a) { const p = this.norm(x); if (this.isDir(p)) { this.err('cat: ' + x + ': Is a directory'); continue; } const c = this.read(p); if (c === undefined) { this.err('cat: ' + x + ': No such file or directory'); continue; } (this.readFiles = this.readFiles || []).push(p); splitLines(c).forEach(l => this.p(l, /^(<<<<<<<|=======|>>>>>>>)/.test(l) ? 'warn' : '')); }
  },
  echo(a) {
    let e = false, n = false; while (a[0] === '-e' || a[0] === '-n') { if (a[0] === '-e') e = true; else n = true; a = a.slice(1); }
    let s = a.join(' '); if (e) s = s.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
    this.p(s);
  },
  rm(a) {
    const { pos, f } = parseArgs(a);
    const rec = f['-r'] || f['-R'] || f['--recursive'], force = f['-f'];
    if (!pos.length) this.die('rm: missing operand');
    for (const x of pos) {
      const p = this.norm(x);
      if (p === '/' || p === HOME) this.die("rm: refusing to remove '" + x + "' (the simulator protects you 😉)");
      if (!this.exists(p)) { if (!force) this.err("rm: cannot remove '" + x + "': No such file or directory"); continue; }
      if (this.isDir(p) && !rec) { this.err("rm: cannot remove '" + x + "': Is a directory"); continue; }
      if (this.cwd === p || this.cwd.startsWith(p + '/')) this.cwd = this.parent(p);
      if (this.base(p) === '.git' && this.repos[this.parent(p)]) delete this.repos[this.parent(p)];
      this.rmTree(p);
    }
  },
  mv(a) {
    if (a.length < 2) this.die('mv: missing destination file operand');
    const src = this.norm(a[0]); let dst = this.norm(a[1]);
    if (!this.exists(src)) this.die("mv: cannot stat '" + a[0] + "': No such file or directory");
    if (this.isDir(dst)) dst = dst + '/' + this.base(src);
    const pre = src + '/';
    for (const k of Object.keys(this.fs)) if (k === src || k.startsWith(pre)) { this.fs[dst + k.slice(src.length)] = this.fs[k]; delete this.fs[k]; }
    for (const r of Object.keys(this.repos)) if (r === src || r.startsWith(pre)) { const nr = dst + r.slice(src.length); this.repos[nr] = this.repos[r]; this.repos[nr].root = nr; delete this.repos[r]; }
    this.mkdirp(this.parent(dst));
  },
  cp(a) {
    const { pos, f } = parseArgs(a);
    if (pos.length < 2) this.die('cp: missing destination file operand');
    const src = this.norm(pos[0]); let dst = this.norm(pos[1]);
    if (!this.exists(src)) this.die("cp: cannot stat '" + pos[0] + "': No such file or directory");
    if (this.isDir(src) && !(f['-r'] || f['-R'])) this.die("cp: -r not specified; omitting directory '" + pos[0] + "'");
    if (this.isDir(dst)) dst = dst + '/' + this.base(src);
    else if (!this.isDir(this.parent(dst))) this.die("cp: cannot create regular file '" + pos[1] + "': No such file or directory");
    const pre = src + '/';
    for (const k of Object.keys(this.fs)) if (k === src || k.startsWith(pre)) this.fs[dst + k.slice(src.length)] = cp(this.fs[k]);
  },
  tree(a) {
    const rootP = this.norm(a[0] || '.');
    if (!this.isDir(rootP)) this.die(a[0] + ' [error opening dir]');
    this.p(a[0] || '.', 'dir');
    let nd = 0, nf = 0;
    const walk = (d, pre) => { const kids = this.children(d).filter(k => k !== '.git'); kids.forEach((k, i) => { const full = d + '/' + k; const last = i === kids.length - 1; const isd = this.isDir(full); this.p(pre + (last ? '└── ' : '├── ') + k, isd ? 'dir' : ''); if (isd) { nd++; walk(full, pre + (last ? '    ' : '│   ')); } else nf++; }); };
    walk(rootP === '/' ? '' : rootP, '');
    this.p('\n' + nd + ' directories, ' + nf + ' files');
  },
  nano(a) { if (!a[0]) this.die('nano: please give a file name, e.g.  nano README.md'); const p = this.norm(a[0]); if (this.isDir(p)) this.die(a[0] + ' is a directory'); if (!this.isDir(this.parent(p))) this.die('[ Directory ' + this.pretty(this.parent(p)) + ' does not exist ]'); this.actions.push({ type: 'edit', path: p, content: this.read(p) || '' }); },
  open(a) { if (!a[0]) this.die('open: missing URL'); this.actions.push({ type: 'open', url: a[0] }); this.p('Opening ' + a[0] + ' …'); },
  'ssh-keygen'(a) {
    const { f } = parseArgs(a, ['-t', '-C', '-f']);
    const type = f['-t'] || 'ed25519';
    this.mkdirp(HOME + '/.ssh');
    const file = HOME + '/.ssh/id_' + type;
    this.write(file, '-----BEGIN OPENSSH PRIVATE KEY-----\n(secret! never share this file)\n-----END OPENSSH PRIVATE KEY-----\n');
    this.write(file + '.pub', 'ssh-' + type + ' AAAAC3NzaC1lZDI1NTE5AAAAIGl0c2FzaW11bGF0ZWRrZXk ' + (f['-C'] || 'you@laptop') + '\n');
    this.ssh.key = true;
    this.p('Generating public/private ' + type + ' key pair.\nEnter file in which to save the key (' + file + '): \nEnter passphrase (empty for no passphrase): \nYour identification has been saved in ' + file + '\nYour public key has been saved in ' + file + '.pub\nThe key fingerprint is:\nSHA256:q1w2e3r4t5y6u7i8o9p0SIMULATED ' + (f['-C'] || 'you@laptop'));
  },
  ssh(a) {
    if (a.includes('-T') && a.some(x => /git@github\.com/.test(x))) {
      if (this.ssh.added) this.p("Hi you! You've successfully authenticated, but GitHub does not provide shell access.", 'ok');
      else this.die('git@github.com: Permission denied (publickey).');
      return;
    }
    this.die('ssh (simulator): only  ssh -T git@github.com  is supported');
  },
};
['code', 'vim', 'vi', 'edit', 'notepad'].forEach(k => Engine.prototype.shell[k] = Engine.prototype.shell.nano);
Engine.prototype.shell['xdg-open'] = Engine.prototype.shell.open;
['npm', 'node', 'python', 'python3', 'pip', 'sudo', 'apt', 'curl', 'wget', 'brew'].forEach(k => Engine.prototype.shell[k] = function () { this.err(k + ': not available in this simulator — Git Quest is all about git & gh!'); return false; });

// =================== GIT ===================
const GIT_CMDS = ['add', 'blame', 'branch', 'checkout', 'cherry-pick', 'clone', 'commit', 'config', 'diff', 'fetch', 'help', 'init', 'log', 'merge', 'mv', 'pull', 'push', 'rebase', 'reflog', 'remote', 'reset', 'restore', 'revert', 'rm', 'show', 'stash', 'status', 'switch', 'tag'];
Engine.prototype.git = function (a) {
  if (!a.length || a[0] === '--help' || a[0] === 'help') {
    this.p('usage: git <command> [<args>]\n\nstart a working area:   init  clone\nwork on changes:        add  mv  restore  rm\nexamine history:        status  log  diff  show  blame  reflog\ngrow & tweak history:   branch  switch  checkout  commit  merge  rebase  reset  revert  cherry-pick  stash  tag\ncollaborate:            remote  fetch  pull  push\nsetup:                  config');
    return;
  }
  if (a[0] === '--version' || a[0] === 'version') { this.p('git version 2.47.1'); return; }
  const sub = a[0], h = this['git_' + sub.replace('-', '_')];
  if (!h) { const close = GIT_CMDS.filter(c => lev(c, sub) <= 2); this.die("git: '" + sub + "' is not a git command. See 'git --help'." + (close.length ? '\n\nThe most similar command is\n\t' + close[0] : '')); }
  return h.call(this, a.slice(1));
};
Object.assign(Engine.prototype, {
  git_config(a) {
    const { pos, f } = parseArgs(a);
    if (f['--list'] || f['-l']) { Object.keys(this.config).sort().forEach(k => this.p(k + '=' + this.config[k])); return; }
    if (f['--unset']) { delete this.config[(pos[0] || '').toLowerCase()]; return; }
    if (!pos.length) this.die('usage: git config [--global] <name> [<value>]');
    const key = pos[0].toLowerCase();
    if (!/^[a-z]+\.[a-z.]+$/i.test(key)) this.die('error: key does not contain a section: ' + pos[0]);
    if (pos.length === 1) { if (this.config[key] === undefined) return false; this.p(this.config[key]); return; }
    this.config[key] = pos.slice(1).join(' ');
    this.ev('config', { key });
  },
  git_init(a) {
    const { pos, f } = parseArgs(a, ['-b', '--initial-branch']);
    const dir = this.norm(pos[0] || '.');
    if (!this.exists(dir)) this.mkdirp(dir);
    if (this.repos[dir]) { this.p('Reinitialized existing Git repository in ' + dir + '/.git/'); return; }
    this.newRepo(dir, !!f['--bare'], f['-b'] || f['--initial-branch']);
    if (!this.config['init.defaultbranch'] && !f['-b']) this.p("hint: Using 'main' as the name for the initial branch. (Older Git versions used 'master'.)\nhint: Configure it for all repos with:  git config --global init.defaultBranch main", 'dim');
    this.p('Initialized empty Git repository in ' + dir + (f['--bare'] ? '/' : '/.git/'));
    if (dir === HOME) this.p('⚠ Heads up: you just turned your WHOLE home folder into a repository!\n   Usually you want git init inside a project folder. To undo:  rm -rf .git   then  cd <project>  and run git init there.', 'warn');
    this.ev('init', { root: dir });
  },
  git_status(a) {
    const r = this.needRepo(); this.needWork(r);
    const { f } = parseArgs(a);
    const st = this.status(r);
    if (f['-s'] || f['--short']) {
      const rows = {};
      st.staged.added.forEach(p => rows[p] = 'A '); st.staged.modified.forEach(p => rows[p] = 'M '); st.staged.deleted.forEach(p => rows[p] = 'D ');
      st.unstaged.modified.forEach(p => rows[p] = (rows[p] || ' ')[0] + 'M'); st.unstaged.deleted.forEach(p => rows[p] = (rows[p] || ' ')[0] + 'D');
      st.conflicts.forEach(p => rows[p] = 'UU');
      Object.keys(rows).sort().forEach(p => this.p(rows[p] + ' ' + p, rows[p][0] !== ' ' ? 'ok' : 'err'));
      st.untracked.forEach(p => this.p('?? ' + p, 'err')); return;
    }
    if (r.head.branch !== undefined) this.p('On branch ' + r.head.branch); else this.p('HEAD detached at ' + r.head.detached, 'err');
    const hid = this.headId(r);
    const up = r.head.branch !== undefined && r.upstream[r.head.branch];
    if (up && hid) {
      const uid = r.rrefs[up];
      if (!uid) this.p("Your branch is based on '" + up + "', but the upstream is gone.");
      else {
        const ahead = this.count(hid, uid), behind = this.count(uid, hid);
        if (!ahead && !behind) this.p("Your branch is up to date with '" + up + "'.");
        else if (ahead && !behind) this.p("Your branch is ahead of '" + up + "' by " + ahead + ' commit' + (ahead > 1 ? 's' : '') + '.\n  (use "git push" to publish your local commits)');
        else if (!ahead && behind) this.p("Your branch is behind '" + up + "' by " + behind + ' commit' + (behind > 1 ? 's' : '') + ', and can be fast-forwarded.\n  (use "git pull" to update your local branch)');
        else this.p("Your branch and '" + up + "' have diverged,\nand have " + ahead + ' and ' + behind + ' different commits each, respectively.\n  (use "git pull" if you want to integrate the remote branch with yours)');
      }
    }
    if (!hid) this.p('\nNo commits yet');
    if (r.merging) {
      if (st.conflicts.length) this.p('\nYou have unmerged paths.\n  (fix conflicts and run "git commit")\n  (use "git merge --abort" to abort the merge)');
      else this.p('\nAll conflicts fixed but you are still merging.\n  (use "git commit" to conclude merge)');
    }
    const S = st.staged, conf = new Set(st.conflicts);
    const stagedList = [...S.added.map(p => ['new file:   ', p]), ...S.modified.map(p => ['modified:   ', p]), ...S.deleted.map(p => ['deleted:    ', p])].filter(x => !conf.has(x[1]));
    if (stagedList.length) { this.p('\nChanges to be committed:\n  (use "git restore --staged <file>..." to unstage)'); stagedList.forEach(([k, p]) => this.p('\t' + k + p, 'ok')); }
    if (conf.size) { this.p('\nUnmerged paths:\n  (use "git add <file>..." to mark resolution)'); [...conf].forEach(p => this.p('\tboth modified:   ' + p, 'err')); }
    const un = [...st.unstaged.modified.map(p => ['modified:   ', p]), ...st.unstaged.deleted.map(p => ['deleted:    ', p])].filter(x => !conf.has(x[1]));
    if (un.length) { this.p('\nChanges not staged for commit:\n  (use "git add <file>..." to update what will be committed)\n  (use "git restore <file>..." to discard changes in working directory)'); un.forEach(([k, p]) => this.p('\t' + k + p, 'err')); }
    if (st.untracked.length) {
      this.p('\nUntracked files:\n  (use "git add <file>..." to include in what will be committed)');
      const shown = new Set();
      st.untracked.forEach(p => { const seg = p.split('/')[0]; let d = p; if (p.includes('/') && !Object.keys(st.idx).some(x => x.startsWith(seg + '/'))) d = seg + '/'; if (!shown.has(d)) { shown.add(d); this.p('\t' + d, 'err'); } });
    }
    if (!stagedList.length && !un.length && !conf.size) {
      if (st.untracked.length) this.p('\nnothing added to commit but untracked files present (use "git add" to track)');
      else if (!hid) this.p('\nnothing to commit (create/copy files and use "git add" to track)');
      else this.p('\nnothing to commit, working tree clean');
    } else if (!stagedList.length && !conf.size) this.p('\nno changes added to commit (use "git add" and/or "git commit -a")');
  },
  relSpec(r, spec) { const abs = this.norm(spec); if (abs === r.root) return ''; if (!abs.startsWith(r.root + '/')) this.die("fatal: " + spec + ": '" + spec + "' is outside repository at '" + r.root + "'"); return abs.slice(r.root.length + 1); },
  matchSpec(paths, rel) { return paths.filter(p => rel === '' || p === rel || p.startsWith(rel + '/')); },
  git_add(a) {
    const r = this.needRepo(); this.needWork(r);
    const { pos, f } = parseArgs(a);
    const st = this.status(r); const w = st.w;
    let specs = pos; if (f['-A'] || f['--all']) specs = [r.root];
    if (f['-u']) specs = specs.length ? specs : [r.root];
    if (!specs.length) this.die("Nothing specified, nothing added.\nhint: Maybe you wanted to say 'git add .'?");
    const ign = this.ignorer(w['.gitignore']);
    const ignoredHit = [];
    for (const s of specs) {
      const rel = this.relSpec(r, s);
      const cand = new Set([...Object.keys(w), ...Object.keys(r.index)]);
      let hits = this.matchSpec([...cand], rel);
      if (f['-u']) hits = hits.filter(p => p in r.index);
      const explicit = rel !== '' && (rel in w) && !(rel in r.index) && ign(rel);
      if (explicit && !f['-f']) { ignoredHit.push(rel); continue; }
      hits = hits.filter(p => (p in r.index) || !ign(p) || f['-f']);
      if (!hits.length) { if (!this.matchSpec(Object.keys(w), rel).length) this.die("fatal: pathspec '" + s + "' did not match any files"); }
      for (const p of hits) { if (p in w) r.index[p] = w[p]; else delete r.index[p]; if (r.merging) { const i = r.merging.conflicts.indexOf(p); if (i >= 0) { r.merging.conflicts.splice(i, 1); if (/^(<<<<<<<|>>>>>>>)/m.test(w[p] || '')) this.p("warning: '" + p + "' still contains conflict markers (<<<<<<< / >>>>>>>) — did you finish editing it?", 'warn'); } } }
    }
    if (ignoredHit.length) this.die('The following paths are ignored by one of your .gitignore files:\n' + ignoredHit.join('\n') + '\nhint: Use -f if you really want to add them.');
    this.ev('add');
  },
  git_rm(a) {
    const r = this.needRepo(); this.needWork(r);
    const { pos, f } = parseArgs(a);
    if (!pos.length) this.die('usage: git rm [--cached] [-r] <file>...');
    for (const s of pos) {
      const rel = this.relSpec(r, s); const hits = this.matchSpec(Object.keys(r.index), rel);
      if (!hits.length) this.die("fatal: pathspec '" + s + "' did not match any files");
      if (hits.length > 1 && !f['-r'] && !(hits.length === 1)) { if (rel && !hits.includes(rel)) this.die("fatal: not removing '" + s + "' recursively without -r"); }
      for (const p of hits) { delete r.index[p]; if (!f['--cached']) this.setWork(r, p, undefined); this.p("rm '" + p + "'"); }
    }
  },
  git_mv(a) {
    const r = this.needRepo(); this.needWork(r);
    if (a.length < 2) this.die('usage: git mv <source> <destination>');
    const s = this.relSpec(r, a[0]); let d = this.relSpec(r, a[1]);
    if (!(s in r.index)) this.die('fatal: not under version control, source=' + a[0] + ', destination=' + a[1]);
    if (this.isDir(r.root + '/' + d)) d = d + '/' + this.base(s);
    const w = this.work(r); this.setWork(r, d, w[s]); this.setWork(r, s, undefined);
    r.index[d] = r.index[s]; delete r.index[s];
  },
  git_commit(a) {
    const r = this.needRepo(); this.needWork(r);
    const { f } = parseArgs(a, ['-m', '--message']);
    if (!this.config['user.name'] || !this.config['user.email']) this.die('Author identity unknown\n\n*** Please tell me who you are.\n\nRun\n\n  git config --global user.email "you@example.com"\n  git config --global user.name "Your Name"\n\nto set your account\'s default identity.\nfatal: unable to auto-detect email address (got \'you@laptop.(none)\')');
    let msgs = f._multi['-m'] || (f['-m'] !== undefined ? [f['-m']] : f['--message'] !== undefined ? [f['--message']] : []);
    if (msgs.some(m => m === undefined)) this.die("error: switch `m' requires a value");
    let msg = msgs.join('\n\n');
    if (f['-a'] || f['--all']) { const w = this.work(r); for (const p of Object.keys(r.index)) { if (p in w) r.index[p] = w[p]; else delete r.index[p]; } }
    if (r.merging && r.merging.conflicts.length) this.die('error: Committing is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use \'git add <file>\'\nhint: as appropriate to mark resolution and make a commit.\nfatal: Exiting because of an unresolved conflict.\n  unmerged: ' + r.merging.conflicts.join(', '));
    const hid = this.headId(r);
    if (f['--amend']) {
      if (!hid) this.die('fatal: You have nothing to amend.');
      const old = this.commits[hid];
      const id = this.mkCommit(msg || old.msg, old.parents, r.index);
      this.setHead(r, id, 'commit (amend): ' + (msg || old.msg).split('\n')[0]);
      this.p('[' + (r.head.branch || 'detached HEAD') + ' ' + id + '] ' + (msg || old.msg).split('\n')[0] + '\n Date: ' + new Date().toDateString());
      this.p(this.stat(this.tree(old.parents[0]), r.index));
      this.ev('commit'); return;
    }
    if (!msg && r.merging) msg = r.merging.msg;
    if (!msg) this.die('Aborting commit due to empty commit message.\nhint (simulator): there is no text editor here — always give a message with  -m "your message"');
    const head = this.tree(hid);
    if (!r.merging && sameTree(head, r.index) && !f['--allow-empty']) {
      const st = this.status(r);
      this.p((r.head.branch ? 'On branch ' + r.head.branch + '\n' : ''));
      if (st.unstaged.modified.length || st.unstaged.deleted.length) this.die('no changes added to commit (use "git add" and/or "git commit -a")');
      if (st.untracked.length) this.die('nothing added to commit but untracked files present (use "git add" to track)');
      this.die('nothing to commit, working tree clean');
    }
    const parents = r.merging ? [hid, r.merging.theirs] : [hid];
    const id = this.mkCommit(msg, parents, r.index);
    const wasMerge = !!r.merging; r.merging = null;
    this.setHead(r, id, (wasMerge ? 'commit (merge): ' : hid ? 'commit: ' : 'commit (initial): ') + msg.split('\n')[0]);
    this.p('[' + (r.head.branch !== undefined ? r.head.branch : 'detached HEAD') + (hid ? '' : ' (root-commit)') + ' ' + id + '] ' + msg.split('\n')[0], 'hi');
    this.p(this.stat(head, r.index));
    this.ev('commit', { id });
  },
  logList(r, startIds) {
    const seen = new Set(); for (const s of startIds) for (const x of this.ancestors(s)) seen.add(x);
    return [...seen].map(id => this.commits[id]).sort((x, y) => y.t - x.t);
  },
  git_log(a) {
    const r = this.needRepo();
    const { pos, f } = parseArgs(a, ['-n', '--author']);
    let n = Infinity; if (f['-n']) n = +f['-n']; const nf = a.find(x => /^-\d+$/.test(x)); if (nf) n = +nf.slice(1);
    let starts; if (f['--all']) starts = [...Object.values(r.branches), ...Object.values(r.rrefs), ...Object.values(r.tags).map(t => t.id), this.headId(r)].filter(Boolean);
    else { const refs = pos.filter(p => p !== '--'); starts = refs.length ? refs.map(x => this.resolve(r, x)) : [this.headId(r)]; }
    if (!starts[0]) this.die("fatal: your current branch '" + r.head.branch + "' does not have any commits yet");
    let list = this.logList(r, starts);
    if (f['--author']) list = list.filter(c => c.author.toLowerCase().includes(f['--author'].toLowerCase()));
    list = list.slice(0, n);
    const one = f['--oneline'], graph = f['--graph'];
    for (const c of list) {
      const dec = this.decorate(r, c.id); const ds = dec.length ? ' (' + dec.join(', ') + ')' : '';
      const g = graph ? (c.parents.length > 1 ? '*   ' : '* ') : '';
      if (one) { this.out.push({ t: g + c.id + ds + ' ' + c.msg.split('\n')[0], parts: [{ t: g, c: 'mag' }, { t: c.id, c: 'warn' }, { t: ds, c: 'cy' }, { t: ' ' + c.msg.split('\n')[0], c: '' }] }); continue; }
      this.out.push({ t: 'commit ' + c.id + ds, parts: [{ t: g + 'commit ' + c.id, c: 'warn' }, { t: ds, c: 'cy' }] });
      if (c.parents.length > 1) this.p('Merge: ' + c.parents.map(x => x.slice(0, 7)).join(' '));
      this.p('Author: ' + c.author);
      this.p('Date:   ' + this.fakeDate(c.t));
      this.p(''); c.msg.split('\n').forEach(l => this.p('    ' + l)); this.p('');
    }
  },
  fakeDate(t) { const d = new Date(Date.UTC(2026, 10, 2, 9, 0) + t * 37 * 60000); return d.toUTCString().replace('GMT', '+0000'); },
  git_show(a) {
    const r = this.needRepo();
    const { pos, f } = parseArgs(a);
    const ref = pos[0] || 'HEAD';
    if (r.tags[ref] && r.tags[ref].annot) { const t = r.tags[ref]; this.p('tag ' + ref, 'warn'); this.p('Tagger: ' + t.tagger + '\n\n' + t.msg + '\n'); }
    const id = this.resolve(r, ref); const c = this.commits[id];
    const dec = this.decorate(r, id);
    this.p('commit ' + id + (dec.length ? ' (' + dec.join(', ') + ')' : ''), 'warn');
    if (c.parents.length > 1) this.p('Merge: ' + c.parents.join(' '));
    this.p('Author: ' + c.author + '\nDate:   ' + this.fakeDate(c.t) + '\n');
    c.msg.split('\n').forEach(l => this.p('    ' + l)); this.p('');
    if (f['--stat']) this.p(this.stat(this.tree(c.parents[0]), c.tree));
    else if (c.parents.length < 2) this.printDiff(this.tree(c.parents[0]), c.tree);
  },
  git_diff(a) {
    const r = this.needRepo(); this.needWork(r);
    const { pos, f } = parseArgs(a);
    const files = f['--'] ? pos.filter(x => !this.resolve(r, x, true)) : [];
    let refs = pos.filter(x => !files.includes(x));
    const paths = []; const realRefs = [];
    for (const x of refs) { if (this.resolve(r, x, true)) realRefs.push(x); else paths.push(this.relSpec(r, x)); }
    const st = this.status(r);
    if (realRefs.length === 2) return this.printDiff(this.tree(this.resolve(r, realRefs[0])), this.tree(this.resolve(r, realRefs[1])), paths);
    if (realRefs.length === 1) { const rr = realRefs[0]; if (rr.includes('..')) { } return this.printDiff(this.tree(this.resolve(r, rr)), f['--staged'] || f['--cached'] ? st.idx : st.w, paths); }
    if (f['--staged'] || f['--cached']) return this.printDiff(st.head, st.idx, paths);
    const tracked = {}; for (const p of Object.keys(st.idx)) if (p in st.w) tracked[p] = st.w[p];
    this.printDiff(st.idx, tracked, paths);
  },
  git_blame(a) {
    const r = this.needRepo(); this.needWork(r);
    if (!a[0]) this.die('usage: git blame <file>');
    const rel = this.relSpec(r, a[a.length - 1]);
    const hid = this.headId(r);
    if (!(rel in this.tree(hid))) this.die("fatal: no such path '" + rel + "' in HEAD");
    const chain = []; let c = hid; while (c) { chain.unshift(c); c = this.commits[c].parents[0]; }
    let attr = [], prev;
    for (const id of chain) {
      const v = this.commits[id].tree[rel]; if (v === prev) continue;
      const d = lineDiff(prev, v); const nattr = []; let oi = 0;
      for (const [k] of d) { if (k === ' ') nattr.push(attr[oi++]); else if (k === '-') oi++; else nattr.push(id); }
      attr = nattr; prev = v;
    }
    splitLines(prev).forEach((l, i) => { const cm = this.commits[attr[i]]; const who = cm.author.replace(/\s*<.*>/, ''); this.out.push({ t: '', parts: [{ t: attr[i] + ' ', c: 'warn' }, { t: '(' + who.padEnd(10).slice(0, 10) + ' ' + String(i + 1).padStart(3) + ') ', c: 'cy' }, { t: l, c: '' }] }); });
  },
  git_reflog(a) {
    const r = this.needRepo();
    r.reflog.slice().reverse().forEach((e, i) => this.out.push({ t: '', parts: [{ t: e.id + ' ', c: 'warn' }, { t: 'HEAD@{' + i + '}: ', c: 'cy' }, { t: e.msg, c: '' }] }));
  },
  git_branch(a) {
    const r = this.needRepo();
    const { pos, f } = parseArgs(a, ['-m', '-M', '--set-upstream-to', '-u']);
    if (f['-d'] || f['-D'] || f['--delete']) {
      if (!pos.length) this.die('fatal: branch name required');
      for (const b of pos) {
        if (f['-r']) { if (!r.rrefs[b]) this.die("error: remote-tracking branch '" + b + "' not found."); delete r.rrefs[b]; this.p('Deleted remote-tracking branch ' + b + '.'); continue; }
        if (r.branches[b] === undefined) this.die("error: branch '" + b + "' not found.");
        if (r.head.branch === b) this.die("error: cannot delete branch '" + b + "' used by worktree at '" + r.root + "'\nhint: switch to another branch first, e.g.  git switch main");
        const up = r.upstream[b] && r.rrefs[r.upstream[b]];
        if (!f['-D'] && !this.isAnc(r.branches[b], this.headId(r)) && !(up && this.isAnc(r.branches[b], up))) this.die("error: the branch '" + b + "' is not fully merged.\nhint: If you are sure you want to delete it, run 'git branch -D " + b + "'");
        this.p('Deleted branch ' + b + ' (was ' + r.branches[b] + ').'); delete r.branches[b]; delete r.upstream[b];
      }
      this.ev('branch'); return;
    }
    if (f['-m'] !== undefined || f['-M'] !== undefined) {
      const arg = f['-m'] !== undefined ? f['-m'] : f['-M'];
      let from = r.head.branch, to = arg; if (pos.length) { from = arg; to = pos[0]; }
      if (r.branches[from] === undefined && !(from === r.head.branch && !this.headId(r))) this.die("error: refname refs/heads/" + from + " not found");
      if (r.branches[from] !== undefined) { r.branches[to] = r.branches[from]; delete r.branches[from]; }
      if (r.upstream[from]) { r.upstream[to] = r.upstream[from]; delete r.upstream[from]; }
      if (r.head.branch === from) r.head.branch = to; this.ev('branch'); return;
    }
    if (f['--set-upstream-to'] || f['-u']) { const up = f['--set-upstream-to'] || f['-u']; if (!r.rrefs[up]) this.die("error: the requested upstream branch '" + up + "' does not exist"); r.upstream[pos[0] || r.head.branch] = up; this.p("branch '" + (pos[0] || r.head.branch) + "' set up to track '" + up + "'."); return; }
    if (!pos.length) {
      const show = (name, local) => { const cur = local && r.head.branch === name; const line = (cur ? '* ' : '  ') + (local ? name : 'remotes/' + name); let extra = ''; if (f['-v'] || f['-vv']) { const id = local ? r.branches[name] : r.rrefs[name]; extra = ' ' + id + (f['-vv'] && local && r.upstream[name] ? ' [' + r.upstream[name] + ']' : '') + ' ' + this.commits[id].msg.split('\n')[0]; } this.p(line + extra, cur ? 'ok' : local ? '' : 'err'); };
      if (r.head.detached) this.p('* (HEAD detached at ' + r.head.detached + ')', 'err');
      if (!f['-r']) Object.keys(r.branches).sort().forEach(b => show(b, true));
      if (f['-a'] || f['-r']) Object.keys(r.rrefs).sort().forEach(b => show(b, false));
      return;
    }
    const name = pos[0];
    if (!/^[\w./-]+$/.test(name) || name.endsWith('/') || name.includes('..')) this.die("fatal: '" + name + "' is not a valid branch name");
    if (r.branches[name] !== undefined) this.die("fatal: a branch named '" + name + "' already exists");
    const start = this.resolve(r, pos[1] || 'HEAD', true);
    if (!start) this.die("fatal: not a valid object name: '" + (pos[1] || r.head.branch) + "'");
    r.branches[name] = start; this.ev('branch');
  },
  doSwitch(r, target, opts) {
    opts = opts || {};
    const fromT = this.tree(this.headId(r));
    let toId, branch;
    if (opts.create) {
      if (r.branches[target] !== undefined) this.die("fatal: a branch named '" + target + "' already exists");
      toId = opts.start ? this.resolve(r, opts.start) : this.headId(r);
      if (!toId) { r.head = { branch: target }; this.p("Switched to a new branch '" + target + "'"); return; }
      this.checkoutTree(r, fromT, this.tree(toId), opts.force);
      r.branches[target] = toId; if (opts.start && r.rrefs[opts.start]) r.upstream[target] = opts.start;
      r.prev = r.head.branch; r.head = { branch: target }; this.reflogMove(r, 'checkout: moving to ' + target);
      this.p("Switched to a new branch '" + target + "'"); this.ev('switch'); return;
    }
    if (target === '-') { if (!r.prev) this.die('fatal: no previous branch'); target = r.prev; }
    if (r.branches[target] !== undefined) { branch = target; toId = r.branches[target]; }
    else if (r.rrefs['origin/' + target] && !opts.detach) {
      toId = r.rrefs['origin/' + target]; this.checkoutTree(r, fromT, this.tree(toId), opts.force);
      r.branches[target] = toId; r.upstream[target] = 'origin/' + target; r.prev = r.head.branch; r.head = { branch: target }; this.reflogMove(r, 'checkout: moving to ' + target);
      this.p("branch '" + target + "' set up to track 'origin/" + target + "'.\nSwitched to a new branch '" + target + "'"); this.ev('switch'); return;
    } else {
      toId = this.resolve(r, target, true);
      if (!toId) return null;
      if (!opts.detach && opts.cmd === 'switch') this.die('fatal: a branch is expected, got commit \'' + target + "'\nhint: If you want to detach HEAD at the commit, try again with the --detach option.");
    }
    if (branch && r.head.branch === branch) { this.p("Already on '" + branch + "'"); return true; }
    this.checkoutTree(r, fromT, this.tree(toId), opts.force);
    r.prev = r.head.branch;
    if (branch) { r.head = { branch }; this.p("Switched to branch '" + branch + "'"); if (r.upstream[branch] && r.rrefs[r.upstream[branch]]) { const ah = this.count(toId, r.rrefs[r.upstream[branch]]), bh = this.count(r.rrefs[r.upstream[branch]], toId); if (!ah && !bh) this.p("Your branch is up to date with '" + r.upstream[branch] + "'."); else if (bh && !ah) this.p("Your branch is behind '" + r.upstream[branch] + "' by " + bh + " commit(s), and can be fast-forwarded."); } }
    else { r.head = { detached: toId }; this.p("Note: switching to '" + target + "'.\n\nYou are in 'detached HEAD' state. You can look around, make experimental\nchanges and commit them, and you can discard any commits you make in this\nstate without impacting any branches by switching back to a branch.\n\nHEAD is now at " + toId + ' ' + this.commits[toId].msg.split('\n')[0], 'warn'); }
    this.reflogMove(r, 'checkout: moving to ' + target);
    this.ev('switch'); return true;
  },
  git_switch(a) {
    const r = this.needRepo(); this.needWork(r);
    const { pos, f } = parseArgs(a, ['-c', '-C', '--create']);
    if (r.merging) this.die('fatal: You are in the middle of a merge — finish it (git commit) or abort it (git merge --abort) first.');
    const c = f['-c'] || f['--create'] || f['-C'];
    if (c) return this.doSwitch(r, c, { create: true, start: pos[0], cmd: 'switch' });
    if (!pos.length) this.die('fatal: missing branch or commit argument');
    const res = this.doSwitch(r, pos[0], { detach: f['--detach'], force: f['-f'] || f['--discard-changes'], cmd: 'switch' });
    if (res === null) this.die("fatal: invalid reference: " + pos[0]);
  },
  git_checkout(a) {
    const r = this.needRepo(); this.needWork(r);
    const { pos, f } = parseArgs(a, ['-b', '-B']);
    if (f['-b'] || f['-B']) { if (r.merging) this.die('error: you need to resolve your current index first'); return this.doSwitch(r, f['-b'] || f['-B'], { create: true, start: pos[0] }); }
    if (!pos.length) this.die('usage: git checkout <branch>  |  git checkout -- <file>');
    if (!f['--'] && pos.length === 1) {
      const res = this.doSwitch(r, pos[0], { force: f['-f'], detach: true });
      if (res !== null) return;
    }
    let src = r.index; let files = pos;
    if (!f['--'] && pos.length > 1 && this.resolve(r, pos[0], true)) { src = this.tree(this.resolve(r, pos[0])); files = pos.slice(1); }
    for (const s of files) {
      const rel = this.relSpec(r, s); const hits = this.matchSpec(Object.keys(src), rel);
      if (!hits.length) this.die("error: pathspec '" + s + "' did not match any file(s) known to git");
      for (const p of hits) { this.setWork(r, p, src[p]); if (src !== r.index) r.index[p] = src[p]; }
    }
    this.p('Updated ' + files.length + ' path' + (files.length > 1 ? 's' : '') + (src === r.index ? ' from the index' : ''));
    this.ev('restore');
  },
  git_restore(a) {
    const r = this.needRepo(); this.needWork(r);
    const { pos, f } = parseArgs(a, ['--source', '-s']);
    if (!pos.length) this.die('fatal: you must specify path(s) to restore');
    const staged = f['--staged'] || f['-S'], wt = f['--worktree'] || f['-W'] || !staged;
    const srcRef = f['--source'] || f['-s'];
    for (const s of pos) {
      const rel = this.relSpec(r, s);
      const head = this.tree(this.headId(r));
      if (staged) {
        const srcT = srcRef ? this.tree(this.resolve(r, srcRef)) : head;
        const hits = this.matchSpec([...new Set([...Object.keys(r.index), ...Object.keys(srcT)])], rel);
        if (!hits.length) this.die("error: pathspec '" + s + "' did not match any file(s) known to git");
        for (const p of hits) { if (p in srcT) r.index[p] = srcT[p]; else delete r.index[p]; }
      }
      if (wt && !(staged && !(f['--worktree'] || f['-W']))) {
        const srcT = srcRef ? this.tree(this.resolve(r, srcRef)) : r.index;
        const hits = this.matchSpec(Object.keys(srcT), rel);
        if (!hits.length) this.die("error: pathspec '" + s + "' did not match any file(s) known to git");
        for (const p of hits) this.setWork(r, p, srcT[p]);
      }
    }
    this.ev('restore');
  },
  git_merge(a) {
    const r = this.needRepo(); this.needWork(r);
    const { pos, f } = parseArgs(a, ['-m']);
    if (f['--abort']) {
      if (!r.merging) this.die('fatal: There is no merge to abort (MERGE_HEAD missing).');
      const ht = this.tree(this.headId(r)); const w = this.work(r);
      for (const p of new Set([...Object.keys(w), ...Object.keys(r.index), ...Object.keys(ht)])) { if (p in ht) this.setWork(r, p, ht[p]); else if (p in r.index) this.setWork(r, p, undefined); }
      r.index = cp(ht); r.merging = null; this.p('Merge aborted.'); this.ev('merge'); return;
    }
    if (r.merging) this.die('error: Merging is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use \'git add/rm <file>\'\nfatal: Exiting because of an unresolved conflict.');
    if (!pos.length) this.die('fatal: No remote for the current branch.\nhint: name the branch to merge, e.g.  git merge feature');
    const theirs = this.resolve(r, pos[0]); return this.doMerge(r, theirs, pos[0], f);
  },
  doMerge(r, theirs, name, f) {
    f = f || {};
    const ours = this.headId(r);
    if (this.isAnc(theirs, ours)) { this.p('Already up to date.'); return true; }
    const st = this.status(r);
    if (!st.clean) this.die('error: Your local changes would be overwritten by merge.\nPlease commit your changes or stash them before you merge.\nAborting');
    if (!ours || (this.isAnc(ours, theirs) && !f['--no-ff'])) {
      if (f['--ff-only'] === false) { }
      this.p('Updating ' + (ours || '0000000') + '..' + theirs + '\nFast-forward');
      this.p(this.stat(this.tree(ours), this.tree(theirs)));
      this.checkoutTree(r, this.tree(ours), this.tree(theirs));
      this.setHead(r, theirs, 'merge ' + name + ': Fast-forward'); this.ev('merge'); return true;
    }
    if (f['--ff-only']) this.die('fatal: Not possible to fast-forward, aborting.');
    const base = this.mergeBase(ours, theirs);
    const m = this.merge3(this.tree(base), this.tree(ours), this.tree(theirs), 'HEAD', name);
    const msg = f['-m'] || "Merge branch '" + name.replace(/^origin\//, '') + "'" + (name.startsWith('origin/') ? " of " + (r.remotes.origin || 'origin') : '') + (r.head.branch && r.head.branch !== 'main' && r.head.branch !== 'master' ? ' into ' + r.head.branch : '');
    if (m.conflicts.length) {
      const newIdx = cp(m.res);
      for (const p of m.conflicts) { if (this.tree(ours)[p] !== undefined) newIdx[p] = this.tree(ours)[p]; }
      for (const p of new Set([...Object.keys(this.tree(ours)), ...Object.keys(m.res), ...m.conflicts])) this.setWork(r, p, m.conflicts.includes(p) ? m.markers[p] : m.res[p]);
      r.index = newIdx; r.merging = { theirs, msg, conflicts: m.conflicts.slice() };
      m.conflicts.forEach(p => this.p('Auto-merging ' + p + '\nCONFLICT (content): Merge conflict in ' + p, 'err'));
      this.p('Automatic merge failed; fix conflicts and then commit the result.', 'err');
      this.ev('conflict'); return false;
    }
    this.checkoutTree(r, this.tree(ours), m.res);
    const id = this.mkCommit(msg, [ours, theirs], m.res);
    this.setHead(r, id, 'merge ' + name + ': Merge made by the \'ort\' strategy.');
    this.p("Merge made by the 'ort' strategy.");
    this.p(this.stat(this.tree(ours), m.res));
    this.ev('merge'); return true;
  },
  replay(r, upstreamId, ontoName) {
    const ours = this.headId(r);
    const up = this.ancestors(upstreamId);
    const list = []; let c = ours;
    while (c && !up.has(c)) { list.unshift(c); c = this.commits[c].parents[0]; }
    if (!list.length) return { id: upstreamId, n: 0 };
    let cur = upstreamId, curT = this.tree(upstreamId);
    for (const id of list) {
      const cm = this.commits[id];
      if (cm.parents.length > 1) continue;
      const res = this.applyChange(curT, this.tree(cm.parents[0]), cm.tree);
      if (res.conflicts.length) return { conflict: res.conflicts, commit: id };
      cur = this.mkCommit(cm.msg, [cur], res.tree, cm.author); curT = res.tree;
    }
    return { id: cur, n: list.length };
  },
  git_rebase(a) {
    const r = this.needRepo(); this.needWork(r);
    const { pos, f } = parseArgs(a);
    if (f['-i'] || f['--interactive']) this.die('interactive rebase needs a text editor — not supported in this simulator (in real life it is super useful for squashing commits!)');
    if (f['--abort'] || f['--continue']) this.die('fatal: No rebase in progress?');
    if (!pos.length) this.die('usage: git rebase <upstream-branch>   e.g.  git rebase main');
    if (r.head.branch === undefined) this.die('fatal: cannot rebase in detached HEAD state (in this simulator)');
    if (!this.status(r).clean) this.die('error: cannot rebase: You have unstaged changes.\nerror: Please commit or stash them.');
    const upId = this.resolve(r, pos[0]); const ours = this.headId(r);
    if (this.isAnc(upId, ours)) { this.p('Current branch ' + r.head.branch + ' is up to date.'); return; }
    const res = this.replay(r, upId, pos[0]);
    if (res.conflict) this.die('error: could not apply ' + res.commit + '... ' + this.commits[res.commit].msg + '\nCONFLICT (content): Merge conflict in ' + res.conflict.join(', ') + '\nhint (simulator): rebases with conflicts are not supported here — the rebase was aborted, nothing changed.\nhint: Use  git merge ' + pos[0] + '  instead and resolve the conflict.');
    this.checkoutTree(r, this.tree(ours), this.tree(res.id));
    this.setHead(r, res.id, 'rebase (finish): refs/heads/' + r.head.branch + ' onto ' + upId);
    this.p('Successfully rebased and updated refs/heads/' + r.head.branch + '.', 'ok');
    this.ev('rebase');
  },
  git_cherry_pick(a) {
    const r = this.needRepo(); this.needWork(r);
    if (!a.length) this.die('usage: git cherry-pick <commit>');
    if (!this.status(r).clean) this.die('error: your local changes would be overwritten by cherry-pick.\nhint: commit your changes or stash them to proceed.');
    for (const ref of a) {
      const id = this.resolve(r, ref); const cm = this.commits[id];
      if (cm.parents.length > 1) this.die('error: commit ' + id + ' is a merge but no -m option was given.');
      const ours = this.headId(r);
      const res = this.applyChange(this.tree(ours), this.tree(cm.parents[0]), cm.tree);
      if (res.conflicts.length) this.die('error: could not apply ' + id + '... ' + cm.msg + '\nCONFLICT in ' + res.conflicts.join(', ') + ' (cherry-pick with conflicts is not supported in the simulator)');
      if (sameTree(res.tree, this.tree(ours))) { this.p('The previous cherry-pick is now empty, possibly due to conflict resolution.'); continue; }
      const nid = this.mkCommit(cm.msg, [ours], res.tree, cm.author);
      this.checkoutTree(r, this.tree(ours), res.tree);
      this.setHead(r, nid, 'cherry-pick: ' + cm.msg.split('\n')[0]);
      this.p('[' + r.head.branch + ' ' + nid + '] ' + cm.msg.split('\n')[0], 'hi'); this.p(this.stat(this.tree(ours), res.tree));
    }
    this.ev('cherry');
  },
  git_revert(a) {
    const r = this.needRepo(); this.needWork(r);
    const { pos, f } = parseArgs(a);
    if (!pos.length) this.die('usage: git revert <commit>');
    if (!this.status(r).clean) this.die('error: your local changes would be overwritten by revert.\nhint: commit your changes or stash them to proceed.');
    const id = this.resolve(r, pos[0]); const cm = this.commits[id];
    if (cm.parents.length > 1) this.die('error: commit ' + id + ' is a merge but no -m option was given.');
    const ours = this.headId(r);
    const res = this.applyChange(this.tree(ours), cm.tree, this.tree(cm.parents[0]));
    if (res.conflicts.length) this.die('error: could not revert ' + id + '... CONFLICT in ' + res.conflicts.join(', '));
    const msg = 'Revert "' + cm.msg.split('\n')[0] + '"\n\nThis reverts commit ' + id + '.';
    const nid = this.mkCommit(msg, [ours], res.tree);
    this.checkoutTree(r, this.tree(ours), res.tree);
    this.setHead(r, nid, 'revert: ' + msg.split('\n')[0]);
    this.p('[' + r.head.branch + ' ' + nid + '] Revert "' + cm.msg.split('\n')[0] + '"', 'hi'); this.p(this.stat(this.tree(ours), res.tree));
    this.ev('revert');
  },
  git_reset(a) {
    const r = this.needRepo(); this.needWork(r);
    const { pos, f } = parseArgs(a);
    const mode = f['--hard'] ? 'hard' : f['--soft'] ? 'soft' : 'mixed';
    if (pos.length && !this.resolve(r, pos[0], true) || pos.length > 1) {
      // path form: unstage
      const files = this.resolve(r, pos[0], true) ? pos.slice(1) : pos;
      const head = this.tree(this.headId(r));
      for (const s of files) { const rel = this.relSpec(r, s); for (const p of this.matchSpec([...new Set([...Object.keys(r.index), ...Object.keys(head)])], rel)) { if (p in head) r.index[p] = head[p]; else delete r.index[p]; } }
      this.p('Unstaged changes after reset.'); this.ev('restore'); return;
    }
    const target = this.resolve(r, pos[0] || 'HEAD');
    const before = this.headId(r);
    if (mode === 'hard') {
      const tt = this.tree(target); const st = this.status(r);
      for (const p of new Set([...Object.keys(st.idx), ...Object.keys(st.head), ...Object.keys(tt)])) { if (p in tt) this.setWork(r, p, tt[p]); else if (p in st.idx || p in st.head) this.setWork(r, p, undefined); }
      r.index = cp(tt); r.merging = null;
    } else if (mode === 'mixed') r.index = cp(this.tree(target));
    this.setHead(r, target, 'reset: moving to ' + (pos[0] || 'HEAD'));
    if (mode === 'hard') this.p('HEAD is now at ' + target + ' ' + this.commits[target].msg.split('\n')[0]);
    else if (mode === 'mixed' && before !== target) { const st = this.status(r); const l = [...st.unstaged.modified.map(p => 'M\t' + p), ...st.unstaged.deleted.map(p => 'D\t' + p)]; if (l.length) this.p('Unstaged changes after reset:\n' + l.join('\n')); }
    this.ev('reset');
  },
  git_stash(a) {
    const r = this.needRepo(); this.needWork(r);
    const sub = a[0] && !a[0].startsWith('-') ? a[0] : 'push';
    const rest = sub === a[0] ? a.slice(1) : a;
    const { f } = parseArgs(rest, ['-m', '--message']);
    const hid = this.headId(r);
    if (sub === 'push' || sub === 'save') {
      const st = this.status(r);
      const untracked = f['-u'] || f['--include-untracked'];
      if (st.clean && !(untracked && st.untracked.length)) { this.p('No local changes to save'); return; }
      const work = {}; for (const p of Object.keys(st.idx)) if (p in st.w) work[p] = st.w[p];
      const ut = {}; if (untracked) st.untracked.forEach(p => { ut[p] = st.w[p]; this.setWork(r, p, undefined); });
      const msg = (f['-m'] || f['--message']) ? 'On ' + r.head.branch + ': ' + (f['-m'] || f['--message']) : 'WIP on ' + r.head.branch + ': ' + hid + ' ' + this.commits[hid].msg.split('\n')[0];
      r.stash.unshift({ msg, base: hid, idx: cp(st.idx), work, ut });
      for (const p of new Set([...Object.keys(st.idx), ...Object.keys(st.head)])) this.setWork(r, p, st.head[p]);
      r.index = cp(st.head);
      this.p('Saved working directory and index state ' + msg); this.ev('stash'); return;
    }
    if (sub === 'list') { r.stash.forEach((s, i) => this.p('stash@{' + i + '}: ' + s.msg)); return; }
    if (sub === 'drop') { if (!r.stash.length) this.die('No stash entries found.'); const s = r.stash.shift(); this.p('Dropped refs/stash@{0} (' + s.msg + ')'); this.ev('stash'); return; }
    if (sub === 'clear') { r.stash = []; this.ev('stash'); return; }
    if (sub === 'show') { if (!r.stash.length) this.die('No stash entries found.'); const s = r.stash[0]; this.p(this.stat(this.tree(s.base), s.work)); return; }
    if (sub === 'pop' || sub === 'apply') {
      if (!r.stash.length) this.die('No stash entries found.');
      const s = r.stash[0]; const st = this.status(r); const baseT = this.tree(s.base);
      const changed = diffTrees(baseT, s.work);
      const touch = [...changed.added, ...changed.modified, ...changed.deleted];
      const dirty = touch.filter(p => st.w[p] !== st.head[p] || st.idx[p] !== st.head[p]);
      if (dirty.length) this.die('error: Your local changes to the following files would be overwritten by merge:\n\t' + dirty.join('\n\t') + '\nPlease commit your changes or stash them before you merge.\nAborting');
      const res = this.applyChange(st.head, baseT, s.work);
      if (res.conflicts.length) this.die('CONFLICT (content): Merge conflict in ' + res.conflicts.join(', ') + '\n(simulator) stash could not be applied cleanly; the stash entry is kept.');
      for (const p of touch) this.setWork(r, p, res.tree[p]);
      for (const p of Object.keys(s.ut || {})) this.setWork(r, p, s.ut[p]);
      const sd = diffTrees(baseT, s.idx); for (const p of [...sd.added, ...sd.modified]) r.index[p] = s.idx[p];
      this.p('On branch ' + r.head.branch);
      if (sub === 'pop') { r.stash.shift(); this.p('Dropped refs/stash@{0}'); }
      this.p('(changes restored to your working directory)', 'ok'); this.ev('stash'); return;
    }
    this.die("error: unknown subcommand: '" + sub + "'");
  },
  git_tag(a) {
    const r = this.needRepo();
    const { pos, f } = parseArgs(a, ['-m', '-a']);
    if (f['-d']) { for (const t of pos) { if (!r.tags[t]) this.die("error: tag '" + t + "' not found."); this.p("Deleted tag '" + t + "' (was " + r.tags[t].id + ')'); delete r.tags[t]; } this.ev('tag'); return; }
    let name = typeof f['-a'] === 'string' ? f['-a'] : pos[0];
    const refArg = typeof f['-a'] === 'string' ? pos[0] : pos[1];
    if (!name || f['-l'] || f['--list']) { Object.keys(r.tags).sort((x, y) => x.localeCompare(y, undefined, { numeric: true })).forEach(t => this.p(t)); return; }
    if (r.tags[name]) this.die("fatal: tag '" + name + "' already exists");
    if (!/^[\w.\-/]+$/.test(name)) this.die("fatal: '" + name + "' is not a valid tag name.");
    const id = this.resolve(r, refArg || 'HEAD', true);
    if (!id) this.die('fatal: Failed to resolve \'' + (refArg || 'HEAD') + '\' as a valid ref.');
    const annot = f['-a'] !== undefined || f['-m'] !== undefined;
    if (annot && f['-m'] === undefined) this.die('hint (simulator): annotated tags need a message:  git tag -a ' + name + ' -m "Release ' + name + '"');
    r.tags[name] = { id, annot, msg: f['-m'] || '', tagger: this.me() };
    this.ev('tag');
  },
  git_remote(a) {
    const r = this.needRepo();
    const sub = a[0];
    if (!sub || sub === '-v' || sub === '--verbose') { for (const n of Object.keys(r.remotes)) { if (sub) { this.p(n + '\t' + r.remotes[n] + ' (fetch)'); this.p(n + '\t' + r.remotes[n] + ' (push)'); } else this.p(n); } return; }
    if (sub === 'add') { const [n, u] = a.slice(1); if (!n || !u) this.die('usage: git remote add <name> <url>'); if (r.remotes[n]) this.die('error: remote ' + n + ' already exists.'); r.remotes[n] = u; this.ev('remote'); return; }
    if (sub === 'remove' || sub === 'rm') { const n = a[1]; if (!r.remotes[n]) this.die("error: No such remote: '" + n + "'"); delete r.remotes[n]; for (const k of Object.keys(r.rrefs)) if (k.startsWith(n + '/')) delete r.rrefs[k]; for (const b of Object.keys(r.upstream)) if (r.upstream[b].startsWith(n + '/')) delete r.upstream[b]; this.ev('remote'); return; }
    if (sub === 'set-url') { const [n, u] = a.slice(1); if (!r.remotes[n]) this.die("error: No such remote '" + n + "'"); r.remotes[n] = u; this.ev('remote'); return; }
    if (sub === 'rename') { const [o, n] = a.slice(1); if (!r.remotes[o]) this.die("error: No such remote: '" + o + "'"); r.remotes[n] = r.remotes[o]; delete r.remotes[o]; for (const k of Object.keys(r.rrefs)) if (k.startsWith(o + '/')) { r.rrefs[n + k.slice(o.length)] = r.rrefs[k]; delete r.rrefs[k]; } for (const b of Object.keys(r.upstream)) if (r.upstream[b].startsWith(o + '/')) r.upstream[b] = n + r.upstream[b].slice(o.length); this.ev('remote'); return; }
    if (sub === 'get-url') { if (!r.remotes[a[1]]) this.die("error: No such remote '" + a[1] + "'"); this.p(r.remotes[a[1]]); return; }
    if (sub === 'show') { const n = a[1] || 'origin'; if (!r.remotes[n]) this.die("error: No such remote '" + n + "'"); this.p('* remote ' + n + '\n  Fetch URL: ' + r.remotes[n] + '\n  Push  URL: ' + r.remotes[n]); return; }
    this.die("error: unknown subcommand: '" + sub + "'");
  },
  cloneInto(g, dir, url, opts) {
    opts = opts || {};
    if (this.exists(dir) && this.children(dir).length) this.die("fatal: destination path '" + this.base(dir) + "' already exists and is not an empty directory.");
    const r = this.newRepo(dir, opts.bare, g.def);
    r.remotes.origin = url;
    if (opts.bare) { r.branches = cp(g.branches); r.head = { branch: g.def }; for (const t of Object.keys(g.tags)) r.tags[t] = cp(g.tags[t]); if (opts.mirror) r.mirror = true; return r; }
    for (const b of Object.keys(g.branches)) r.rrefs['origin/' + b] = g.branches[b];
    for (const t of Object.keys(g.tags)) r.tags[t] = cp(g.tags[t]);
    const tip = g.branches[g.def];
    if (tip) { r.branches[g.def] = tip; r.upstream[g.def] = 'origin/' + g.def; const t = this.tree(tip); for (const p of Object.keys(t)) this.setWork(r, p, t[p]); r.index = cp(t); r.reflog.push({ id: tip, msg: 'clone: from ' + url }); }
    return r;
  },
  git_clone(a) {
    const { pos, f } = parseArgs(a, ['-b', '--branch', '--depth']);
    if (!pos.length) this.die('fatal: You must specify a repository to clone.');
    const url = pos[0]; const key = ghKeyFromUrl(url);
    if (!key) this.die("fatal: repository '" + url + "' does not exist\nhint (simulator): use a GitHub URL like https://github.com/owner/repo.git");
    const g = this.gh[key];
    if (!this.canSee(g)) this.die("Cloning into '" + key.split('/')[1] + "'...\nremote: Repository not found.\nfatal: repository '" + url + "' not found");
    if (isSsh(url) && !this.ssh.added) this.die("Cloning into '" + g.name + "'...\ngit@github.com: Permission denied (publickey).\nfatal: Could not read from remote repository.");
    const bare = f['--bare'] || f['--mirror'];
    const dir = this.norm(pos[1] || (g.name + (bare ? '.git' : '')));
    this.p("Cloning into " + (bare ? 'bare repository ' : '') + "'" + this.base(dir) + "'...");
    const r = this.cloneInto(g, dir, url, { bare, mirror: f['--mirror'] });
    const n = this.ancestors(g.branches[g.def]).size;
    this.p('remote: Enumerating objects: ' + (n * 3) + ', done.\nremote: Total ' + (n * 3) + ' (delta 0), reused 0 (delta 0)\nReceiving objects: 100% (' + (n * 3) + '/' + (n * 3) + '), done.');
    if (!g.branches[g.def]) this.p('warning: You appear to have cloned an empty repository.', 'warn');
    this.ev('clone', { root: dir });
  },
  fetchFrom(r, name, prune) {
    const { g, url } = this.remoteGh(r, name);
    const lines = [];
    for (const b of Object.keys(g.branches)) {
      const k = name + '/' + b, old = r.rrefs[k], nw = g.branches[b];
      if (old === nw) continue;
      if (!old) lines.push(' * [new branch]      ' + b + ' -> ' + k);
      else lines.push('   ' + old + '..' + nw + '  ' + b + ' -> ' + k);
      r.rrefs[k] = nw;
    }
    for (const k of Object.keys(r.rrefs)) if (k.startsWith(name + '/') && g.branches[k.slice(name.length + 1)] === undefined) { if (prune) { lines.push(' - [deleted]         (none) -> ' + k); delete r.rrefs[k]; } }
    for (const t of Object.keys(g.tags)) if (!r.tags[t]) { r.tags[t] = cp(g.tags[t]); lines.push(' * [new tag]         ' + t + ' -> ' + t); }
    if (lines.length) { this.p('From ' + url.replace(/\.git$/, '')); lines.forEach(l => this.p(l)); }
    return g;
  },
  git_fetch(a) {
    const r = this.needRepo();
    const { pos, f } = parseArgs(a);
    const names = f['--all'] ? Object.keys(r.remotes) : [pos[0] || 'origin'];
    if (!Object.keys(r.remotes).length) this.die("fatal: 'origin' does not appear to be a git repository\nfatal: Could not read from remote repository.");
    for (const n of names) { if (f['--all']) this.p('Fetching ' + n); this.fetchFrom(r, n, f['--prune'] || f['-p']); }
    this.ev('fetch');
  },
  git_pull(a) {
    const r = this.needRepo(); this.needWork(r);
    const { pos, f } = parseArgs(a);
    const b = r.head.branch;
    if (b === undefined) this.die('You are not currently on a branch.');
    let remote = pos[0], rb = pos[1];
    if (!remote) { const up = r.upstream[b]; if (!up) this.die('There is no tracking information for the current branch.\nPlease specify which branch you want to merge with.\n\n    git pull <remote> <branch>\n\nIf you wish to set tracking information for this branch you can do so with:\n\n    git branch --set-upstream-to=origin/' + b + ' ' + b); const i = up.indexOf('/'); remote = up.slice(0, i); rb = up.slice(i + 1); }
    if (!rb) rb = b;
    this.fetchFrom(r, remote);
    const theirs = r.rrefs[remote + '/' + rb];
    if (!theirs) this.die("fatal: couldn't find remote ref " + rb);
    const ours = this.headId(r);
    if (!ours) { this.checkoutTree(r, {}, this.tree(theirs)); this.setHead(r, theirs, 'pull: initial'); this.ev('pull'); return; }
    if (this.isAnc(theirs, ours)) { this.p('Already up to date.'); return; }
    const diverged = !this.isAnc(ours, theirs);
    const rebase = f['--rebase'] || f['-r'] || (!f['--no-rebase'] && this.config['pull.rebase'] === 'true');
    if (diverged && !rebase && !f['--no-rebase'] && this.config['pull.rebase'] === undefined && !f['--ff']) {
      this.die("hint: You have divergent branches and need to specify how to reconcile them.\nhint: You can do so by running one of the following commands sometime before\nhint: your next pull:\nhint:\nhint:   git config pull.rebase false  # merge\nhint:   git config pull.rebase true   # rebase\nhint:\nhint: or pass --rebase or --no-rebase on the command line.\nfatal: Need to specify how to reconcile divergent branches.");
    }
    if (diverged && rebase) {
      if (!this.status(r).clean) this.die('error: cannot pull with rebase: You have unstaged changes.');
      const res = this.replay(r, theirs);
      if (res.conflict) this.die('CONFLICT while rebasing ' + res.commit + ' (simulator: rebase aborted). Try  git pull --no-rebase  and resolve the merge conflict.');
      this.checkoutTree(r, this.tree(ours), this.tree(res.id)); this.setHead(r, res.id, 'pull --rebase (finish)');
      this.p('Successfully rebased and updated refs/heads/' + b + '.', 'ok'); this.ev('pull'); return;
    }
    const ok = this.doMerge(r, theirs, remote + '/' + rb, { '-m': diverged ? "Merge branch '" + rb + "' of " + (r.remotes[remote] || remote).replace(/\.git$/, '') : undefined });
    this.ev('pull'); return ok;
  },
  git_push(a) {
    const r = this.needRepo();
    const { pos, f } = parseArgs(a);
    const force = f['-f'] || f['--force'] || f['--force-with-lease'];
    const setUp = f['-u'] || f['--set-upstream'];
    const b = r.head.branch;
    let remote = pos[0];
    if (!remote) { const up = b !== undefined && r.upstream[b]; remote = up ? up.slice(0, up.indexOf('/')) : 'origin'; }
    if (!r.remotes[remote] && !ghKeyFromUrl(remote)) {
      if (!Object.keys(r.remotes).length) this.die('fatal: No configured push destination.\nEither specify the URL from the command-line or configure a remote repository using\n\n    git remote add <name> <url>\n\nand then push using the remote name\n\n    git push <name>');
    }
    const { g, url } = this.remoteGh(r, remote, true);
    const lines = []; const rtName = r.remotes[remote] ? remote : null;
    const pushed = [];
    const out = () => { if (lines.length) { this.p('To ' + url); lines.forEach(l => this.p(l, l.includes('rejected') ? 'err' : '')); } };
    if (f['--mirror'] || r.mirror && !pos.slice(1).length && !f['--tags']) {
      for (const k of Object.keys(g.branches)) if (r.branches[k] === undefined) { delete g.branches[k]; lines.push(' - [deleted]         ' + k); }
      for (const k of Object.keys(r.branches)) { const old = g.branches[k]; if (old !== r.branches[k]) { g.branches[k] = r.branches[k]; lines.push(old ? ' + ' + old + '...' + r.branches[k] + ' ' + k + ' -> ' + k + ' (forced update)' : ' * [new branch]      ' + k + ' -> ' + k); pushed.push([k, old, r.branches[k]]); } }
      for (const t of Object.keys(r.tags)) if (!g.tags[t] || g.tags[t].id !== r.tags[t].id) { g.tags[t] = cp(r.tags[t]); lines.push(' * [new tag]         ' + t + ' -> ' + t); }
      for (const t of Object.keys(g.tags)) if (!r.tags[t]) { delete g.tags[t]; lines.push(' - [deleted]         ' + t); }
      if (r.branches[g.def] === undefined && Object.keys(r.branches).length) g.def = r.branches.main !== undefined ? 'main' : Object.keys(r.branches)[0];
      out(); pushed.forEach(([k, o, n]) => this.afterPush(g, k, o, n)); this.ev('push', { key: g.key }); return;
    }
    if (f['--delete'] || f['-d']) {
      for (const k of pos.slice(1)) { if (g.branches[k] === undefined) this.die("error: unable to delete '" + k + "': remote ref does not exist"); delete g.branches[k]; if (rtName) delete r.rrefs[rtName + '/' + k]; lines.push(' - [deleted]         ' + k); }
      out(); this.ev('push', { key: g.key }); return;
    }
    let specs = pos.slice(1);
    if (f['--all']) specs = Object.keys(r.branches);
    if (!specs.length && !f['--tags']) {
      if (b === undefined) this.die('fatal: You are not currently on a branch.');
      const up = r.upstream[b];
      if (!up || (pos[0] && !up.startsWith(remote + '/'))) {
        if (!this.headId(r)) this.die("error: src refspec " + b + " does not match any\nerror: failed to push some refs to '" + url + "'\nhint (simulator): make your first commit before pushing!");
        this.die('fatal: The current branch ' + b + ' has no upstream branch.\nTo push the current branch and set the remote as upstream, use\n\n    git push --set-upstream ' + remote + ' ' + b + '\n\nhint (simulator): -u is the short form of --set-upstream');
      }
      specs = [b + ':' + up.slice(up.indexOf('/') + 1)];
    }
    let failed = false;
    for (let s of specs) {
      let plus = false; if (s.startsWith('+')) { plus = true; s = s.slice(1); }
      let [src, dst] = s.split(':'); if (src === 'HEAD') src = b; if (!dst) dst = src;
      if (r.tags[src] && r.branches[src] === undefined) { if (!g.tags[src]) { g.tags[src] = cp(r.tags[src]); lines.push(' * [new tag]         ' + src + ' -> ' + src); } else lines.push(' = [up to date]      ' + src + ' -> ' + src); continue; }
      const id = src === '' ? null : this.resolve(r, src, true);
      if (!id) { this.err('error: src refspec ' + src + " does not match any\nerror: failed to push some refs to '" + url + "'"); failed = true; continue; }
      const old = g.branches[dst];
      if (old === id) { lines.push('Everything up-to-date'); if (setUp && rtName && r.branches[src] !== undefined) r.upstream[src] = rtName + '/' + dst; continue; }
      if (old && !this.isAnc(old, id) && !force && !plus) {
        lines.push(' ! [rejected]        ' + src + ' -> ' + dst + ' (fetch first)'); failed = true;
        out(); this.err("error: failed to push some refs to '" + url + "'\nhint: Updates were rejected because the remote contains work that you do not\nhint: have locally. This is usually caused by another repository pushing to\nhint: the same ref. If you want to integrate the remote changes, use\nhint: 'git pull' before pushing again.");
        return false;
      }
      g.branches[dst] = id; if (rtName) r.rrefs[rtName + '/' + dst] = id;
      if (!old) lines.push(' * [new branch]      ' + src + ' -> ' + dst);
      else if (!this.isAnc(old, id)) lines.push(' + ' + old + '...' + id + ' ' + src + ' -> ' + dst + ' (forced update)');
      else lines.push('   ' + old + '..' + id + '  ' + src + ' -> ' + dst);
      pushed.push([dst, old, id]);
      if (setUp && rtName && r.branches[src] !== undefined) { r.upstream[src] = rtName + '/' + dst; }
      if (!old && dst !== g.def) lines.push('remote:\nremote: Create a pull request for \'' + dst + '\' on GitHub by visiting:\nremote:      https://github.com/' + g.key + '/pull/new/' + dst + '\nremote:');
    }
    if (f['--tags']) for (const t of Object.keys(r.tags)) if (!g.tags[t]) { g.tags[t] = cp(r.tags[t]); lines.push(' * [new tag]         ' + t + ' -> ' + t); }
    if (!Object.keys(g.branches).length) { }
    if (g.branches[g.def] === undefined && Object.keys(g.branches).length) g.def = Object.keys(g.branches)[0];
    const n = pushed.length ? this.count(pushed[0][2], pushed[0][1]) : 0;
    if (n) this.p('Enumerating objects: ' + n * 3 + ', done.\nWriting objects: 100% (' + n * 3 + '/' + n * 3 + '), done.\nTotal ' + n * 3 + ' (delta 0), reused 0 (delta 0)', 'dim');
    out();
    if (setUp) for (const s of specs) { const src = s.split(':')[0]; if (r.upstream[src]) this.p("branch '" + src + "' set up to track '" + r.upstream[src] + "'."); }
    pushed.forEach(([k, o, nw]) => this.afterPush(g, k, o, nw));
    this.ev('push', { key: g.key });
    return !failed;
  },
});

// =================== GH CLI ===================
Engine.prototype.ghCli = function (a) {
  const sub = a[0], rest = a.slice(1);
  if (!sub || sub === 'help' || sub === '--help') { this.p('Work seamlessly with GitHub from the command line.\n\nUSAGE\n  gh <command> <subcommand> [flags]\n\nCORE COMMANDS\n  auth:       Authenticate gh and git with GitHub\n  repo:       Manage repositories  (create, clone, fork, view, list, delete, sync)\n  issue:      Manage issues        (create, list, view, close)\n  pr:         Manage pull requests (create, list, view, merge)\n  release:    Manage releases      (create, list, view)\n  run:        View workflow runs   (list, watch, view)\n  workflow:   Manage workflows     (list, run)\n  ssh-key:    Manage SSH keys      (add, list)\n  api:        Make an authenticated GitHub API request\n  browse:     Open the repository in the browser'); return; }
  if (sub === '--version') { this.p('gh version 2.63.0'); return; }
  const h = this['gh_' + sub.replace('-', '_')];
  if (!h) this.die('unknown command "' + sub + '" for "gh"\n\nUsage:  gh <command> <subcommand> [flags]');
  if (sub !== 'auth' && !this.auth.ok) this.die('To get started with GitHub CLI, please run:  gh auth login\nAlternatively, populate the GH_TOKEN environment variable with a GitHub API authentication token.');
  return h.call(this, rest);
};
Object.assign(Engine.prototype, {
  ghRepoArg(arg) {
    if (arg) { const k = ghKeyFromUrl(arg) || (arg.includes('/') ? arg : ME + '/' + arg); return k; }
    const r = this.findRepo(); if (!r) this.die('failed to determine base repo: not a git repository (or any of the parent directories): .git');
    const url = r.remotes.upstream && false ? r.remotes.upstream : r.remotes.origin;
    if (!url) this.die('none of the git remotes configured for this repository point to a known GitHub host. To tell gh about a new GitHub host, please use `gh auth login`');
    return ghKeyFromUrl(url);
  },
  needGh(key) { const g = this.gh[key]; if (!this.canSee(g)) this.die("GraphQL: Could not resolve to a Repository with the name '" + key + "'. (repository)"); return g; },
  gh_auth(a) {
    const sub = a[0];
    if (sub === 'login') {
      if (this.auth.ok) { this.p('✓ Already logged in to github.com account you', 'ok'); return; }
      this.p('? Where do you use GitHub? GitHub.com\n? What is your preferred protocol for Git operations on this host? HTTPS\n? Authenticate Git with your GitHub credentials? Yes\n? How would you like to authenticate GitHub CLI? Login with a web browser\n\n! First copy your one-time code: 7F3A-91C2\nPress Enter to open https://github.com/login/device in your browser...', 'dim');
      this.p('✓ Authentication complete.\n- gh config set -h github.com git_protocol https\n✓ Configured git protocol\n✓ Logged in to github.com account you (keyring)', 'ok');
      this.auth = { ok: true, scopes: ['gist', 'read:org', 'repo', 'workflow'] }; this.ev('auth'); return;
    }
    if (sub === 'status') { if (!this.auth.ok) this.die('You are not logged into any GitHub hosts. To log in, run: gh auth login'); this.p("github.com\n  ✓ Logged in to github.com account you (keyring)\n  - Active account: true\n  - Git operations protocol: https\n  - Token: gho_************************************\n  - Token scopes: '" + this.auth.scopes.join("', '") + "'"); return; }
    if (sub === 'refresh') { if (!this.auth.ok) this.die('not logged in — run gh auth login first'); const { f } = parseArgs(a.slice(1), ['-h', '--hostname', '-s', '--scopes']); const s = f['-s'] || f['--scopes']; if (s) s.split(',').forEach(x => { if (!this.auth.scopes.includes(x.trim())) this.auth.scopes.push(x.trim()); }); this.p('! First copy your one-time code: 2B4D-6F8H\nPress Enter to open https://github.com/login/device in your browser...\n✓ Authentication complete.', 'ok'); this.ev('auth'); return; }
    if (sub === 'logout') { this.auth = { ok: false, scopes: [] }; this.p('✓ Logged out of github.com account you'); return; }
    this.die('usage: gh auth (login|status|refresh|logout)');
  },
  gh_repo(a) {
    const sub = a[0], rest = a.slice(1);
    const { pos, f } = parseArgs(rest, ['-d', '--description', '--source', '-s', '--remote', '-r', '--homepage', '--visibility', '-L', '--limit', '--add-readme', '-b', '--branch', '--source-branch']);
    if (sub === 'create') {
      let name = pos[0];
      if (!name && f['--source']) name = this.base(this.norm(f['--source']));
      if (!name) this.die('X  name argument required when not running interactively\n\nUsage:  gh repo create [<name>] [flags]');
      const key = name.includes('/') ? name : ME + '/' + name;
      if (!key.startsWith(ME + '/')) this.die('HTTP 403: you can only create repositories under your own account (you) in this simulator');
      if (this.ghGet(key)) this.die('GraphQL: Name already exists on this account (createRepository)');
      const vis = f['--public'] ? 'public' : f['--private'] ? 'private' : f['--internal'] ? 'internal' : (f['--visibility'] || null);
      if (!vis) this.die('X  `--public`, `--private`, or `--internal` required when not running interactively');
      const g = this.ghCreate(key, { vis, desc: f['-d'] || f['--description'] || '' });
      this.p('✓ Created repository ' + key + ' on github.com\n  https://github.com/' + key, 'ok');
      if (f['--add-readme']) this.ghCommit(key, 'main', 'Initial commit', { 'README.md': '# ' + g.name + '\n' }, null, this.me());
      const src = f['--source'] || f['-s'];
      if (src) {
        const r = this.findRepo(this.norm(src)); if (!r) this.die('current directory is not a git repository. Run `git -C "' + src + '" init` to initialize it');
        const rn = f['--remote'] || f['-r'] || 'origin';
        if (r.remotes[rn]) this.die('X Unable to add remote "' + rn + '"');
        r.remotes[rn] = ghUrl(key); this.p('✓ Added remote ' + ghUrl(key), 'ok');
        if (f['--push']) {
          const b = r.head.branch; const id = this.headId(r);
          if (!id) this.die('X Unable to push to remote: you have no commits yet');
          g.branches[b] = id; g.def = b; r.rrefs[rn + '/' + b] = id; r.upstream[b] = rn + '/' + b;
          this.p('To ' + ghUrl(key) + '\n * [new branch]      HEAD -> ' + b + "\nbranch '" + b + "' set up to track '" + rn + '/' + b + "'.\n✓ Pushed commits to " + ghUrl(key), 'ok');
          this.afterPush(g, b, null, id);
        }
      } else if (f['--clone'] || f['-c']) {
        this.cloneInto(g, this.norm(g.name), ghUrl(key)); this.p("Cloning into '" + g.name + "'...");
      }
      this.ev('gh-create', { key }); return;
    }
    if (sub === 'clone') {
      if (!pos[0]) this.die('cannot clone: repository argument required');
      const key = this.ghRepoArg(pos[0]); const g = this.needGh(key);
      const dir = this.norm(pos[1] || g.name);
      this.p("Cloning into '" + this.base(dir) + "'...");
      const r = this.cloneInto(g, dir, ghUrl(key));
      if (g.forkOf) { r.remotes.upstream = ghUrl(g.forkOf); const p = this.gh[g.forkOf]; if (p) for (const b of Object.keys(p.branches)) r.rrefs['upstream/' + b] = p.branches[b]; this.p('! Repository ' + g.forkOf + ' set as the default repository. To learn more or change this selection, see: gh repo set-default'); }
      this.ev('clone', { root: dir }); return;
    }
    if (sub === 'fork') {
      let key = pos[0] ? this.ghRepoArg(pos[0]) : null; let inRepo = null;
      if (!key) { inRepo = this.findRepo(); key = this.ghRepoArg(); }
      const parent = this.needGh(key);
      if (parent.owner === ME) this.die('X  You cannot fork your own repository (' + key + ')');
      const fk = ME + '/' + (f['--fork-name'] || parent.name);
      let g = this.ghGet(fk);
      if (g) this.p('! ' + fk + ' already exists', 'warn');
      else { g = this.ghCreate(fk, { forkOf: key, def: parent.def, desc: parent.desc }); g.branches = cp(parent.branches); g.tags = cp(parent.tags); this.p('✓ Created fork ' + fk, 'ok'); }
      if (f['--clone'] && !inRepo) {
        const dir = this.norm(g.name); this.p("Cloning into '" + g.name + "'...");
        const r = this.cloneInto(g, dir, ghUrl(fk)); r.remotes.upstream = ghUrl(key);
        for (const b of Object.keys(parent.branches)) r.rrefs['upstream/' + b] = parent.branches[b];
        this.p('From https://github.com/' + key + '\n * [new branch]      ' + parent.def + ' -> upstream/' + parent.def + '\n✓ Cloned fork\n! Repository ' + key + ' set as the default repository.', 'ok');
      } else if (inRepo) {
        if (f['--remote'] === undefined || f['--remote'] === true || f['--remote'] === 'true') {
          if (inRepo.remotes.origin && ghKeyFromUrl(inRepo.remotes.origin) === key) {
            inRepo.remotes.upstream = inRepo.remotes.origin; for (const k of Object.keys(inRepo.rrefs)) if (k.startsWith('origin/')) { inRepo.rrefs['upstream/' + k.slice(7)] = inRepo.rrefs[k]; delete inRepo.rrefs[k]; }
            for (const b of Object.keys(inRepo.upstream)) inRepo.upstream[b] = inRepo.upstream[b].replace(/^origin\//, 'upstream/');
            this.p('✓ Renamed remote origin to upstream', 'ok');
          }
          inRepo.remotes.origin = ghUrl(fk); for (const b of Object.keys(g.branches)) inRepo.rrefs['origin/' + b] = g.branches[b];
          this.p('✓ Added remote origin', 'ok');
        }
      }
      this.ev('fork', { key: fk }); return;
    }
    if (sub === 'delete') {
      if (!pos[0]) this.die('X  repository argument required when not running interactively (e.g.  gh repo delete you/my-repo --yes)');
      const key = this.ghRepoArg(pos[0]); const g = this.needGh(key);
      if (!f['--yes'] && !f['-y']) this.die('! Deleting a repository cannot be undone.\n? Type ' + key + ' to confirm deletion:\nhint (simulator): there is no interactive prompt here — confirm by adding  --yes');
      if (g.owner !== ME) this.die('HTTP 403: Must have admin rights to Repository. (https://api.github.com/repos/' + key + ')');
      if (!this.auth.scopes.includes('delete_repo')) this.die('HTTP 403: Must have admin rights to Repository. (https://api.github.com/repos/' + key + ')\nThis API operation needs the "delete_repo" scope. To request it, run:  gh auth refresh -h github.com -s delete_repo');
      g.deleted = true; this.p('✓ Deleted repository ' + key, 'ok'); this.ev('gh-delete', { key }); return;
    }
    if (sub === 'view') {
      const key = this.ghRepoArg(pos[0]); const g = this.needGh(key);
      this.p(key, 'hi'); this.p((g.desc || 'No description provided') + '\n');
      this.p('visibility: ' + g.vis + (g.forkOf ? '   forked from ' + g.forkOf : '') + '\nbranches:   ' + Object.keys(g.branches).join(', ') + '\ndefault:    ' + g.def + '\ntags:       ' + (Object.keys(g.tags).join(', ') || '—') + '\nissues:     ' + g.issues.filter(i => i.state === 'OPEN').length + ' open   PRs: ' + g.prs.filter(p => p.state === 'OPEN').length + ' open' + (g.pages.enabled ? '\npages:      ' + g.pages.url : ''));
      const readme = this.tree(g.branches[g.def])['README.md']; if (readme) { this.p('\n--- README.md ---', 'dim'); splitLines(readme).forEach(l => this.p(l)); }
      this.p('\nView this repository on GitHub: https://github.com/' + key, 'dim'); return;
    }
    if (sub === 'list') {
      const owner = pos[0] || ME;
      const list = Object.values(this.gh).filter(g => g.owner === owner && this.canSee(g));
      this.p('\nShowing ' + list.length + ' of ' + list.length + ' repositories in @' + owner + '\n');
      list.forEach(g => this.p(g.key.padEnd(32) + (g.desc || '').slice(0, 30).padEnd(32) + g.vis + (g.forkOf ? ', fork' : ''))); return;
    }
    if (sub === 'sync') {
      const key = pos[0] ? this.ghRepoArg(pos[0]) : this.ghRepoArg(); const g = this.needGh(key);
      if (f['--source'] || g.forkOf) {
        const p = this.gh[g.forkOf]; if (!p) this.die("X Can't determine source repository for " + key);
        const b = f['-b'] || f['--branch'] || g.def; const mine = g.branches[b], theirs = p.branches[b];
        if (mine && !this.isAnc(mine, theirs) && !f['--force']) this.die("X Can't sync because there are diverging changes; use `--force` to overwrite the destination branch");
        g.branches[b] = theirs; this.p('✓ Synced the "' + ME + ':' + b + '" branch from "' + g.forkOf.split('/')[0] + ':' + b + '"', 'ok'); this.afterPush(g, b, mine, theirs); this.ev('sync'); return;
      }
      // local sync: pull from origin
      const r = this.findRepo(); if (!r) this.die('X not a git repository'); this.git_pull([]); this.p('✓ Synced the "' + r.head.branch + '" branch from "' + key + '"', 'ok'); return;
    }
    if (sub === 'edit') {
      const key = this.ghRepoArg(pos[0]); const g = this.needGh(key); if (g.owner !== ME) this.die('HTTP 403');
      if (f['-d'] || f['--description']) g.desc = f['-d'] || f['--description'];
      if (f['--visibility']) { if (!f['--accept-visibility-change-consequences']) this.die('X  use of --visibility flag requires --accept-visibility-change-consequences flag'); g.vis = f['--visibility']; }
      if (f['--homepage']) g.homepage = f['--homepage'];
      this.p('✓ Edited repository ' + key, 'ok'); this.ev('gh-edit'); return;
    }
    this.die('unknown command "' + sub + '" for "gh repo"\n\nAvailable: create, clone, fork, view, list, delete, sync, edit');
  },
  ghCtx(arg) { const key = this.ghRepoArg(arg); return this.needGh(key); },
  gh_issue(a) {
    const sub = a[0];
    const { pos, f } = parseArgs(a.slice(1), ['-t', '--title', '-b', '--body', '-R', '--repo', '-l', '--label', '-a', '--assignee', '-s', '--state', '-c', '--comment']);
    const g = this.ghCtx(f['-R'] || f['--repo']);
    if (sub === 'create') {
      const title = f['-t'] || f['--title']; if (!title) this.die('X  must provide `--title` and `--body` when not running interactively');
      const it = { num: ++g.num, title, body: f['-b'] || f['--body'] || '', state: 'OPEN', author: ME, label: f['-l'] || f['--label'] || '' };
      g.issues.push(it); this.p('\nCreating issue in ' + g.key + '\n\nhttps://github.com/' + g.key + '/issues/' + it.num, 'ok'); this.ev('issue', { key: g.key }); return;
    }
    if (sub === 'list') { const st = (f['-s'] || f['--state'] || 'open').toUpperCase(); const l = g.issues.filter(i => st === 'ALL' || i.state === st); if (!l.length) { this.p('no ' + st.toLowerCase() + ' issues in ' + g.key); return; } this.p('\nShowing ' + l.length + ' issue(s) in ' + g.key + '\n'); l.forEach(i => this.p('#' + String(i.num).padEnd(4) + i.title.padEnd(40) + (i.label ? ' [' + i.label + ']' : '') + '  ' + i.state, i.state === 'OPEN' ? 'ok' : 'mag')); return; }
    const num = +String(pos[0] || '').replace('#', ''); const it = g.issues.find(i => i.num === num);
    if (!it) this.die('GraphQL: Could not resolve to an issue or pull request with the number of ' + pos[0] + '.');
    if (sub === 'view') { this.p(it.title + ' #' + it.num, 'hi'); this.p(it.state + ' • ' + it.author + ' opened this issue\n\n' + (it.body || 'No description provided') + (it.closedBy ? '\n\nClosed by commit ' + it.closedBy : '')); return; }
    if (sub === 'close') { it.state = 'CLOSED'; this.p('✓ Closed issue #' + num + ' (' + it.title + ')', 'mag'); this.ev('issue', { key: g.key }); return; }
    if (sub === 'reopen') { it.state = 'OPEN'; this.p('✓ Reopened issue #' + num, 'ok'); this.ev('issue'); return; }
    if (sub === 'comment') { (it.comments = it.comments || []).push(f['-b'] || f['--body'] || ''); this.p('https://github.com/' + g.key + '/issues/' + num + '#issuecomment-1', 'ok'); return; }
    this.die('unknown command "' + sub + '" for "gh issue"');
  },
  gh_pr(a) {
    const sub = a[0];
    const { pos, f } = parseArgs(a.slice(1), ['-t', '--title', '-b', '--body', '-B', '--base', '-H', '--head', '-R', '--repo', '-s', '--state']);
    const r = this.findRepo();
    if (sub === 'create') {
      if (!r) this.die('could not determine base repo: not a git repository');
      const origin = this.ghCtx();
      const base = origin.forkOf ? this.gh[origin.forkOf] : origin;
      const head = f['-H'] || f['--head'] || r.head.branch;
      const baseBranch = f['-B'] || f['--base'] || base.def;
      if (origin.branches[head] === undefined) this.die('aborted: you must first push the current branch to a remote, or use the --head flag\nhint: git push -u origin ' + head);
      if (base === origin && head === baseBranch) this.die('could not create pull request: head branch "' + head + '" is the same as base branch "' + baseBranch + '"');
      let title = f['-t'] || f['--title']; let body = f['-b'] || f['--body'] || '';
      if (f['--fill'] || f['-f']) { const c = this.commits[origin.branches[head]]; title = title || c.msg.split('\n')[0]; }
      if (!title) this.die('X  must provide `--title` and `--body` (or `--fill`) when not running interactively');
      if (base.prs.find(p => p.state === 'OPEN' && p.head.branch === head && p.head.key === origin.key)) this.die('a pull request for branch "' + head + '" into branch "' + baseBranch + '" already exists');
      const pr = { num: ++base.num, title, body, state: 'OPEN', author: ME, head: { key: origin.key, branch: head }, base: baseBranch };
      base.prs.push(pr);
      this.p('\nCreating pull request for ' + (origin !== base ? ME + ':' : '') + head + ' into ' + baseBranch + ' in ' + base.key + '\n\nhttps://github.com/' + base.key + '/pull/' + pr.num, 'ok');
      this.ev('pr', { key: base.key }); return;
    }
    const g = this.ghCtx(f['-R'] || f['--repo']);
    const baseRepo = g.forkOf && !(f['-R'] || f['--repo']) && this.gh[g.forkOf] && !g.prs.length ? this.gh[g.forkOf] : g;
    if (sub === 'list') { const st = (f['-s'] || f['--state'] || 'open').toUpperCase(); const l = baseRepo.prs.filter(p => st === 'ALL' || p.state === st); if (!l.length) { this.p('no ' + st.toLowerCase() + ' pull requests in ' + baseRepo.key); return; } this.p('\nShowing ' + l.length + ' pull request(s) in ' + baseRepo.key + '\n'); l.forEach(p => this.p('#' + String(p.num).padEnd(4) + p.title.padEnd(36) + (p.head.key !== baseRepo.key ? p.head.key.split('/')[0] + ':' : '') + p.head.branch + '  ' + p.state, p.state === 'OPEN' ? 'ok' : 'mag')); return; }
    let pr;
    if (pos[0]) pr = baseRepo.prs.find(p => p.num === +String(pos[0]).replace('#', ''));
    else if (r) pr = baseRepo.prs.find(p => p.state === 'OPEN' && p.head.branch === r.head.branch);
    if (!pr) this.die(pos[0] ? 'GraphQL: Could not resolve to a PullRequest with the number of ' + pos[0] + '.' : 'no pull requests found for branch "' + (r && r.head.branch) + '"');
    if (sub === 'view') { const hg = this.gh[pr.head.key]; this.p(pr.title + ' #' + pr.num, 'hi'); this.p(pr.state + ' • ' + pr.author + ' wants to merge into ' + pr.base + ' from ' + pr.head.branch + '\n\n' + (pr.body || 'No description provided')); if (hg && hg.branches[pr.head.branch]) { this.p('\nFiles changed:', 'dim'); this.p(this.stat(this.tree(this.mergeBase(baseRepo.branches[pr.base], hg.branches[pr.head.branch])), this.tree(hg.branches[pr.head.branch]))); } return; }
    if (sub === 'close') { pr.state = 'CLOSED'; this.p('✓ Closed pull request #' + pr.num, 'mag'); this.ev('pr'); return; }
    if (sub === 'merge') {
      if (pr.state !== 'OPEN') this.die('X Pull request #' + pr.num + ' (' + pr.title + ') was already ' + pr.state.toLowerCase());
      if (baseRepo.owner !== ME) this.die('X  GraphQL: ' + ME + ' does not have the correct permissions to execute `MergePullRequest`\n(only the maintainers of ' + baseRepo.key + ' can merge — you have to wait for their review!)');
      const how = f['--merge'] || f['-m'] ? 'merge' : f['--squash'] || f['-s'] ? 'squash' : f['--rebase'] || f['-r'] ? 'rebase' : null;
      if (!how) this.die('X  --merge, --rebase, or --squash required when not running interactively');
      const hg = this.gh[pr.head.key]; const headId = hg && hg.branches[pr.head.branch];
      if (!headId) this.die('X  head branch ' + pr.head.branch + ' no longer exists');
      const baseId = baseRepo.branches[pr.base];
      const mb = this.mergeBase(baseId, headId);
      const m = this.merge3(this.tree(mb), this.tree(baseId), this.tree(headId), pr.base, pr.head.branch);
      if (m.conflicts.length) this.die('X  Pull request #' + pr.num + ' is not mergeable: the merge commit cannot be cleanly created.\nhint: merge ' + pr.base + ' into your branch locally, fix the conflicts, and push again');
      let nid;
      if (how === 'merge') nid = this.mkCommit('Merge pull request #' + pr.num + ' from ' + pr.head.key.split('/')[0] + '/' + pr.head.branch + '\n\n' + pr.title, [baseId, headId], m.res);
      else if (how === 'squash') nid = this.mkCommit(pr.title + ' (#' + pr.num + ')', [baseId], m.res);
      else { let cur = baseId, curT = this.tree(baseId); const list = []; let c = headId; const anc = this.ancestors(baseId); while (c && !anc.has(c)) { list.unshift(c); c = this.commits[c].parents[0]; } for (const id of list) { const cm = this.commits[id]; const rr = this.applyChange(curT, this.tree(cm.parents[0]), cm.tree); cur = this.mkCommit(cm.msg, [cur], rr.tree, cm.author); curT = rr.tree; } nid = cur; }
      baseRepo.branches[pr.base] = nid; pr.state = 'MERGED'; pr.mergeCommit = nid;
      this.p('✓ ' + (how === 'merge' ? 'Merged' : how === 'squash' ? 'Squashed and merged' : 'Rebased and merged') + ' pull request #' + pr.num + ' (' + pr.title + ')', 'mag');
      if (f['--delete-branch'] || f['-d']) {
        if (r && r.branches[pr.head.branch] !== undefined) {
          if (r.head.branch === pr.head.branch) {
            this.fetchFrom(r, 'origin');
            const toT = this.tree(r.rrefs['origin/' + pr.base] || nid);
            if (r.branches[pr.base] === undefined) r.branches[pr.base] = nid;
            const st = this.status(r); if (!st.clean) this.die('X  you have local changes; commit or stash them first');
            this.checkoutTree(r, this.tree(this.headId(r)), this.tree(nid)); r.head = { branch: pr.base }; r.branches[pr.base] = nid; r.rrefs['origin/' + pr.base] = nid; this.reflogMove(r, 'checkout: moving to ' + pr.base);
          }
          delete r.branches[pr.head.branch]; delete r.upstream[pr.head.branch];
          this.p('✓ Deleted local branch ' + pr.head.branch + ' and switched to branch ' + pr.base, 'ok');
        }
        delete hg.branches[pr.head.branch]; if (r) delete r.rrefs['origin/' + pr.head.branch];
        this.p('✓ Deleted remote branch ' + pr.head.branch, 'ok');
      }
      this.afterPush(baseRepo, pr.base, baseId, nid);
      this.ev('pr-merged', { key: baseRepo.key }); return;
    }
    if (sub === 'checkout') { if (!r) this.die('not a git repository'); this.fetchFrom(r, 'origin'); return this.doSwitch(r, pr.head.branch, {}); }
    this.die('unknown command "' + sub + '" for "gh pr"');
  },
  gh_release(a) {
    const sub = a[0];
    const { pos, f } = parseArgs(a.slice(1), ['-t', '--title', '-n', '--notes', '-F', '--notes-file', '-R', '--repo', '--target']);
    const g = this.ghCtx(f['-R'] || f['--repo']);
    if (sub === 'create') {
      const tag = pos[0]; if (!tag) this.die('could not create: no tag name provided');
      if (g.owner !== ME) this.die('HTTP 403: Resource not accessible');
      if (g.releases.find(x => x.tag === tag)) this.die('HTTP 422: Validation Failed (tag_name already_exists)');
      if (!g.tags[tag]) { const t = f['--target'] || g.def; g.tags[tag] = { id: g.branches[t], annot: false, msg: '' }; this.p('! tag ' + tag + ' did not exist on GitHub — created it from the tip of ' + t, 'warn'); }
      let notes = f['-n'] || f['--notes'] || '';
      if (f['-F'] || f['--notes-file']) { const c = this.read(this.norm(f['-F'] || f['--notes-file'])); if (c === undefined) this.die('open ' + (f['-F'] || f['--notes-file']) + ': no such file or directory'); notes = c; }
      if (f['--generate-notes']) { const prev = g.releases[0]; const fromId = prev ? g.tags[prev.tag].id : null; const ids = [...this.ancestors(g.tags[tag].id)].filter(x => !this.ancestors(fromId).has(x)).map(x => this.commits[x]).sort((p, q) => q.t - p.t); notes += (notes ? '\n\n' : '') + "## What's Changed\n" + ids.map(c => '* ' + c.msg.split('\n')[0]).join('\n'); }
      if (!notes && !f['--notes'] && f['-n'] === undefined && !f['--generate-notes']) this.die('X  --notes, --notes-file, or --generate-notes required when not running interactively');
      g.releases.unshift({ tag, title: f['-t'] || f['--title'] || tag, notes, prerelease: !!f['--prerelease'], latest: !f['--prerelease'] });
      this.p('https://github.com/' + g.key + '/releases/tag/' + tag, 'ok'); this.ev('release', { key: g.key }); return;
    }
    if (sub === 'list') { if (!g.releases.length) { this.p('no releases found'); return; } g.releases.forEach((x, i) => this.p(x.title.padEnd(28) + (i === 0 && !x.prerelease ? 'Latest  ' : x.prerelease ? 'Pre-release ' : '        ') + x.tag)); return; }
    if (sub === 'view') { const x = pos[0] ? g.releases.find(y => y.tag === pos[0]) : g.releases[0]; if (!x) this.die('release not found'); this.p(x.title, 'hi'); this.p(x.tag + '\n\n' + (x.notes || '')); return; }
    if (sub === 'delete') { const i = g.releases.findIndex(y => y.tag === pos[0]); if (i < 0) this.die('release not found'); g.releases.splice(i, 1); this.p('✓ Deleted release ' + pos[0]); return; }
    this.die('unknown command "' + sub + '" for "gh release"');
  },
  gh_workflow(a) {
    const sub = a[0]; const { pos, f } = parseArgs(a.slice(1), ['-R', '--repo', '--ref', '-r']);
    const g = this.ghCtx(f['-R'] || f['--repo']);
    const wfs = this.workflows(this.tree(g.branches[g.def]));
    if (sub === 'list' || !sub) { if (!wfs.length) { this.p('no workflows found — workflow files live in .github/workflows/ on the default branch'); return; } wfs.forEach(w => this.p(w.name.padEnd(30) + 'active   ' + w.file)); return; }
    if (sub === 'run') {
      const w = wfs.find(x => x.file === pos[0] || x.name === pos[0]); if (!w) this.die('could not find any workflows named ' + pos[0]);
      if (!w.trig.dispatch) this.die('could not create workflow dispatch event: HTTP 422: Workflow does not have \'workflow_dispatch\' trigger');
      const ref = f['--ref'] || f['-r'] || g.def;
      this.createRun(g, w, g.branches[ref], ref, 'workflow_dispatch');
      this.p('✓ Created workflow_dispatch event for ' + w.file + ' at ' + ref + '\n\nTo see runs for this workflow, try: gh run list --workflow=' + w.file, 'ok'); this.ev('run'); return;
    }
    this.die('unknown command "' + sub + '" for "gh workflow"');
  },
  gh_run(a) {
    const sub = a[0]; const { pos, f } = parseArgs(a.slice(1), ['-R', '--repo', '-w', '--workflow', '-L']);
    const g = this.ghCtx(f['-R'] || f['--repo']);
    const icon = r => r.status !== 'completed' ? (r.status === 'queued' ? '◷' : '◐') : r.conclusion === 'success' ? '✓' : 'X';
    if (sub === 'list' || !sub) {
      if (!g.runs.length) { this.p('no runs found'); return; }
      this.p('STATUS  TITLE                        WORKFLOW              BRANCH   EVENT    ID', 'dim');
      g.runs.slice(0, 10).forEach(r => this.p(icon(r).padEnd(8) + r.title.slice(0, 28).padEnd(29) + r.wf.slice(0, 20).padEnd(22) + r.branch.padEnd(9) + r.event.slice(0, 8).padEnd(9) + r.id, r.status !== 'completed' ? 'warn' : r.conclusion === 'success' ? 'ok' : 'err'));
      return;
    }
    let run = pos[0] ? g.runs.find(r => r.id === +pos[0]) : (sub === 'watch' ? g.runs.find(r => r.status !== 'completed') || g.runs[0] : g.runs[0]);
    if (!run) this.die(pos[0] ? 'could not find any workflow run with ID ' + pos[0] : 'found no in progress runs to watch');
    if (sub === 'watch' || sub === 'view') {
      if (sub === 'watch') { this.p('Refreshing run status every 3 seconds. Press Ctrl+C to quit.\n', 'dim'); run.doneAt = 0; this.settle(); }
      this.p((run.status === 'completed' ? (run.conclusion === 'success' ? '✓ ' : 'X ') : '◐ ') + run.branch + ' ' + run.wf + ' · ' + run.id + '\nTriggered via ' + run.event + '\n', run.conclusion === 'success' ? 'ok' : run.conclusion ? 'err' : 'warn');
      this.p('JOBS', 'dim');
      for (const s of run.steps) {
        if (run.status !== 'completed') { this.p('  * ' + s.name, 'warn'); continue; }
        this.p((s.ok === true ? '  ✓ ' : s.ok === false ? '  X ' : '  - ') + s.name, s.ok === true ? 'ok' : s.ok === false ? 'err' : 'dim');
        if ((f['--log'] || f['--log-failed'] || s.ok === false || sub === 'watch') && s.lines.length && s.ok !== null) s.lines.forEach(l => this.p('      ' + l, s.ok === false ? 'err' : 'dim'));
      }
      if (run.status === 'completed') this.p('\n' + (run.conclusion === 'success' ? '✓ Run ' + run.wf + ' (' + run.id + ') completed with \'success\'' : 'X Run ' + run.wf + ' (' + run.id + ') completed with \'failure\''), run.conclusion === 'success' ? 'ok' : 'err');
      return run.conclusion !== 'failure';
    }
    if (sub === 'rerun') { const wf = { name: run.wf, file: run.file }; const w = this.workflows(this.tree(run.commit)).find(x => x.file === run.file); this.createRun(g, w || wf, run.commit, run.branch, run.event); this.p('✓ Requested rerun of run ' + run.id, 'ok'); return; }
    this.die('unknown command "' + sub + '" for "gh run"');
  },
  gh_ssh_key(a) {
    const sub = a[0]; const { pos, f } = parseArgs(a.slice(1), ['-t', '--title']);
    if (sub === 'add') { if (!pos[0]) this.die('X  public key file missing'); const c = this.read(this.norm(pos[0])); if (c === undefined) this.die('open ' + pos[0] + ': no such file or directory'); if (/PRIVATE/.test(c)) this.die('X  that is your PRIVATE key! Never upload it anywhere. Use the .pub file.'); this.ssh.added = true; this.ssh.title = f['-t'] || f['--title'] || 'laptop'; this.p('✓ Public key added to your account', 'ok'); this.ev('ssh'); return; }
    if (sub === 'list') { if (!this.ssh.added) { this.p('no SSH keys present in the GitHub account'); return; } this.p(this.ssh.title + '\tssh-ed25519 AAAAC3Nza...\t' + new Date().toISOString().slice(0, 10)); return; }
    this.die('unknown command "' + sub + '" for "gh ssh-key"');
  },
  gh_browse(a) { const g = this.ghCtx(); this.actions.push({ type: 'focus-gh', key: g.key }); this.p('Opening https://github.com/' + g.key + ' in your browser.'); },
  gh_api(a) {
    const { pos, f } = parseArgs(a, ['-X', '--method', '-f', '-F', '--field', '--raw-field', '-H']);
    let ep = pos[0]; if (!ep) this.die('accepts 1 arg(s), received 0');
    if (ep.includes('{owner}') || ep.includes('{repo}')) { const k = this.ghRepoArg(); ep = ep.replace('{owner}', k.split('/')[0]).replace('{repo}', k.split('/')[1]); }
    ep = ep.replace(/^\//, '');
    const fields = [].concat(f._multi['-f'] || (f['-f'] ? [f['-f']] : []), f._multi['-F'] || (f['-F'] ? [f['-F']] : []), f['--field'] ? [f['--field']] : [], f['--raw-field'] ? [f['--raw-field']] : []);
    const method = (f['-X'] || f['--method'] || (fields.length ? 'POST' : 'GET')).toUpperCase();
    const kv = {}; fields.forEach(x => { const i = x.indexOf('='); kv[x.slice(0, i)] = x.slice(i + 1); });
    let m = ep.match(/^repos\/([\w.-]+)\/([\w.-]+)(\/pages)?$/);
    if (m) {
      const g = this.gh[m[1] + '/' + m[2]];
      if (!this.canSee(g)) this.die('gh: Not Found (HTTP 404)');
      if (!m[3]) { this.p(JSON.stringify({ full_name: g.key, private: g.vis !== 'public', fork: !!g.forkOf, default_branch: g.def, has_pages: g.pages.enabled }, null, 2)); return; }
      if (method === 'GET') { if (!g.pages.enabled) this.die('{"message":"Not Found","status":"404"}\ngh: Not Found (HTTP 404)'); this.p(JSON.stringify({ url: 'https://api.github.com/repos/' + g.key + '/pages', status: g.pages.site ? 'built' : null, html_url: g.pages.url, build_type: g.pages.type, source: { branch: g.pages.branch || g.def, path: '/' } }, null, 2)); return; }
      if (method === 'POST' || method === 'PUT') {
        if (g.owner !== ME) this.die('gh: Must have admin rights to Repository. (HTTP 403)');
        if (method === 'POST' && g.pages.enabled) this.die('{"message":"GitHub Pages is already enabled.","status":"409"}\ngh: GitHub Pages is already enabled. (HTTP 409)');
        if (g.vis !== 'public') this.die('{"message":"Your current plan does not support GitHub Pages for this repository.","status":"422"}\ngh: Your current plan does not support GitHub Pages for this repository. (HTTP 422)\nhint: GitHub Pages is free for PUBLIC repositories.');
        const bt = kv.build_type || (kv['source[branch]'] ? 'legacy' : null);
        if (!bt) this.die('gh: Invalid request. (HTTP 422)\nhint: send  -f build_type=workflow  (deploy with GitHub Actions)');
        this.enablePages(g.key, bt === 'workflow' ? 'workflow' : 'legacy', kv['source[branch]'], kv['source[path]']);
        this.p(JSON.stringify({ html_url: g.pages.url, build_type: g.pages.type, status: null }, null, 2), 'ok');
        return;
      }
      if (method === 'DELETE') { g.pages = { enabled: false, type: null, site: null, url: null }; this.p(''); this.ev('pages'); return; }
    }
    if (ep === 'user') { this.p(JSON.stringify({ login: ME, html_url: 'https://github.com/' + ME, public_repos: Object.values(this.gh).filter(g => g.owner === ME && !g.deleted).length }, null, 2)); return; }
    this.die('gh: Not Found (HTTP 404)\nhint (simulator): supported endpoints: user, repos/OWNER/REPO, repos/OWNER/REPO/pages');
  },
  enablePages(key, type, branch, path) {
    const g = this.gh[key];
    g.pages = { enabled: true, type, site: null, url: 'https://' + g.owner + '.github.io/' + g.name + '/', branch: branch || g.def, path: (path || '/').replace(/^\//, '') || '.' };
    if (type === 'legacy' && g.branches[g.pages.branch]) this.triggerWorkflows(g, 'push', g.pages.branch, g.branches[g.pages.branch]);
    this.ev('pages', { key });
  },
});

// =================== completion ===================
Engine.prototype.complete = function (line) {
  const words = line.split(/\s+/); const last = words[words.length - 1];
  const gitSubs = GIT_CMDS, ghSubs = ['auth', 'repo', 'issue', 'pr', 'release', 'run', 'workflow', 'ssh-key', 'api', 'browse'];
  let cands = [];
  if (words.length === 1) cands = Object.keys(this.shell).concat(['git', 'gh']);
  else if (words.length === 2 && words[0] === 'git') cands = gitSubs;
  else if (words.length === 2 && words[0] === 'gh') cands = ghSubs;
  else {
    const r = this.findRepo();
    const dirPart = last.includes('/') ? last.slice(0, last.lastIndexOf('/') + 1) : '';
    const dir = this.norm(dirPart || '.');
    if (this.isDir(dir)) cands = this.children(dir).map(k => dirPart + k + (this.isDir(this.norm(k, dir)) ? '/' : ''));
    if (r && words[0] === 'git') cands = cands.concat(Object.keys(r.branches), Object.keys(r.rrefs), Object.keys(r.tags), Object.keys(r.remotes));
  }
  const hits = [...new Set(cands)].filter(c => c.startsWith(last));
  return hits;
};

Engine.ghKeyFromUrl = ghKeyFromUrl; Engine.HOME = HOME; Engine.ME = ME; Engine.splitLines = splitLines; Engine.diffTrees = diffTrees;
if (typeof module !== 'undefined' && module.exports) module.exports = Engine; else root.Engine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
