// ===================== GIT QUEST — levels =====================
(function (root) {
'use strict';
// ---------- visual helpers for lessons (blocks & flows, no code blocks) ----------
const blk = (t, c) => `<span class="blk ${c || ''}">${t}</span>`;
const arr = t => `<span class="arr">${t ? '<i>' + t + '</i>' : ''}</span>`;
const row = (...x) => `<div class="vrow">${x.join('')}</div>`;
const zone = (title, c, ...x) => `<div class="vzone ${c || ''}"><b>${title}</b><div class="vz">${x.join('')}</div></div>`;
const cm = (t, c) => `<span class="cmt ${c || ''}">${t}</span>`;
const flag = (t, c) => `<span class="flag ${c || ''}">${t}</span>`;
const stack = (...x) => `<div class="vstack">${x.join('')}</div>`;
const legend = () => row(blk('new', 'red'), blk('modified', 'orange'), blk('staged', 'green'), blk('committed', 'blue'));

// ---------- setup helpers ----------
const AUTH = ['gist', 'read:org', 'repo', 'workflow'];
const A = { ada: 'Ada Lovelace <ada@example.com>', linus: 'Linus T <linus@example.com>', grace: 'Grace Hopper <grace@example.com>', sam: 'Sam Rivera <sam@example.com>', max: 'Max Mallory <max@example.com>', oct: 'Octocat <octocat@github.com>', you: 'You <you@example.com>' };
function base(e, o) {
  o = o || {};
  if (o.config !== false) { e.config['user.name'] = 'You'; e.config['user.email'] = 'you@example.com'; e.config['init.defaultbranch'] = 'main'; }
  if (o.auth) e.auth = { ok: true, scopes: AUTH.slice() };
  e.lv = {};
}
function repo(e, path) { return e.newRepo(e.norm(path), false, 'main'); }
function commit(e, r, msg, files, del, author) {
  for (const p in (files || {})) e.setWork(r, p, files[p]);
  (del || []).forEach(p => e.setWork(r, p, undefined));
  const idx = Object.assign({}, r.index); for (const p in (files || {})) idx[p] = files[p]; (del || []).forEach(p => delete idx[p]);
  r.index = idx;
  const id = e.mkCommit(msg, [e.headId(r)], idx, author || A.you); e.setHead(r, id, 'commit: ' + msg); return id;
}
function gh(e, key, hist, o) { const g = e.ghCreate(key, o); for (const h of hist) e.ghCommit(key, g.def, h[0], h[1], h[2], h[3] || A.oct); return g; }
function ghBranch(e, key, name, from, hist) { const g = e.gh[key]; g.branches[name] = g.branches[from]; for (const h of hist || []) e.ghCommit(key, name, h[0], h[1], h[2], h[3] || A.oct); }
function clone(e, key, path) { return e.cloneInto(e.gh[key], e.norm(path), 'https://github.com/' + key + '.git'); }
function sw(e, r, b) { e.checkoutTree(r, e.tree(e.headId(r)), e.tree(r.branches[b]), true); r.head = { branch: b }; }
const R = (e, p) => e.repos[e.norm(p)];
const ran = (e, re) => e.history.some(h => re.test(h));
const G = (e, k) => e.ghGet(k);
const ghT = (e, k, b) => { const g = G(e, k); if (!g) return null; const id = g.branches[b || g.def]; return id ? e.tree(id) : null; };
const headT = (e, r) => r ? e.tree(e.headId(r)) : {};
const brT = (e, r, b) => r && r.branches[b] ? e.tree(r.branches[b]) : null;
const msgs = (e, id) => [...e.ancestors(id)].map(x => e.commits[x].msg);
const clean = (e, r) => r && !r.bare && e.status(r).clean;

const CI_YML = `name: CI
on:
  push:
    branches: [ main ]
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
`;
const PAGES_YML = `name: Deploy to GitHub Pages
on:
  push:
    branches: [ main ]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: false
jobs:
  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Pages
        uses: actions/configure-pages@v5
      - name: Upload site
        uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`;

// ======================= LEVELS =======================
const CH = ['TERMINAL TOWN', 'LOCAL LAB', 'BRANCH FOREST', 'GITHUB CITY', 'VERSION VAULT', 'ACTION CASTLE'];
const LV = [];
const add = l => LV.push(l);

// ---------------- CH 0 ----------------
add({ id: 'terminal', ch: 0, title: 'Hello, Terminal', xp: 100,
  lesson: [
    { h: 'The terminal is a chat with your computer', p: 'You type a command, press Enter, and the computer replies. Everything a pro does with Git starts here. Your files live in <b>folders</b> (also called directories) nested inside each other.',
      viz: row(blk('~ (home)', 'gray'), arr(), blk('Documents/', 'purple'), arr(), blk('welcome.txt', 'blue')),
      cmds: [['pwd', 'Print Working Directory — “where am I?”'], ['ls', 'LiSt what is in this folder'], ['cd <folder>', 'Change Directory — walk into a folder'], ['cd ..', 'go back up one folder']] },
    { h: 'Make things', p: 'You can create folders and files, and peek inside files — no mouse needed.',
      viz: row(blk('mkdir my-project', 'purple'), arr('creates'), blk('my-project/', 'gray')) + row(blk('echo "hi" > notes.txt', 'purple'), arr('writes'), blk('notes.txt', 'blue')),
      cmds: [['mkdir <name>', 'MaKe a new DIRectory'], ['echo "text" > file', 'write text into a file (> replaces, >> appends)'], ['cat <file>', 'show what is inside a file'], ['nano <file>', 'open a simple editor (in this game: a pop-up editor)'], ['clear', 'wipe the screen']], tip: 'Press ↑ to repeat earlier commands and Tab to auto-complete names.' } ],
  story: 'Welcome, recruit! Find the welcome note, then build your first project folder.',
  setup(e) { base(e); e.write('/home/you/Documents/welcome.txt', 'Welcome to Git Quest!\nEvery legend starts with a single command.\n'); },
  goals: [
    { t: 'Read Documents/welcome.txt with cat', ok: e => ran(e, /^cat\b.*welcome/) },
    { t: 'Create a folder called my-project in your home', ok: e => e.isDir('/home/you/my-project') },
    { t: 'Move into my-project (cd)', ok: e => e.cwd === '/home/you/my-project' },
    { t: 'Create notes.txt inside it with some text', ok: e => (e.read('/home/you/my-project/notes.txt') || '').trim().length > 0 } ],
  hints: ['Type ls to see what is in your home folder.', 'cat Documents/welcome.txt', 'mkdir my-project then cd my-project', 'echo "my first note" > notes.txt'],
  solution: ['ls', 'cat Documents/welcome.txt', 'mkdir my-project', 'cd my-project', 'echo "my first note" > notes.txt', 'ls'] });

// ---------------- CH 1 ----------------
add({ id: 'config', ch: 1, title: 'Who Are You?', xp: 100,
  lesson: [{ h: 'Git signs every save with your name', p: 'Git is a <b>time machine for your files</b>. Every snapshot it saves (a <b>commit</b>) is stamped with who made it. Tell Git your name and email once — it remembers forever (that is what <b>--global</b> means).',
    viz: row(cm('📸', 'blue'), arr('signed by'), blk('You &lt;you@example.com&gt;', 'yellow')),
    cmds: [['git --version', 'check Git is installed'], ['git config --global user.name "Your Name"', 'set your name'], ['git config --global user.email "you@example.com"', 'set your email (use the one on your GitHub account)'], ['git config --global init.defaultBranch main', 'name the first branch “main” in new projects'], ['git config --list', 'see all your settings']] }],
  story: 'Before the Time Machine lets you in, it needs to know who you are.',
  setup(e) { base(e, { config: false }); },
  goals: [
    { t: 'Set user.name', ok: e => !!e.config['user.name'] },
    { t: 'Set user.email', ok: e => /@/.test(e.config['user.email'] || '') },
    { t: 'Set init.defaultBranch to main', ok: e => e.config['init.defaultbranch'] === 'main' },
    { t: 'Check your settings with git config --list', ok: e => ran(e, /git config (--global )?(--list|-l)/) } ],
  hints: ['Wrap names with spaces in quotes: "Ada Lovelace"', 'git config --global user.email "ada@example.com"', 'git config --global init.defaultBranch main'],
  solution: ['git --version', 'git config --global user.name "Ada Lovelace"', 'git config --global user.email "ada@example.com"', 'git config --global init.defaultBranch main', 'git config --list'] });

add({ id: 'init', ch: 1, title: 'Start the Time Machine', xp: 100,
  lesson: [{ h: 'git init turns a folder into a repository', p: 'A <b>repository</b> (repo) is a folder that Git watches. <b>git init</b> adds a hidden <b>.git</b> folder — that is where Git keeps all history. Your files don’t change.',
    viz: row(blk('recipes/', 'gray'), arr('git init'), blk('recipes/ + .git 🕰', 'blue')),
    cmds: [['git init', 'start tracking the current folder'], ['git status', 'Git’s dashboard: what changed? what is staged? — run it ALL the time'], ['ls -a', 'show hidden files (like .git)']], tip: 'Never run git init in your home folder — only inside a project folder.' }],
  story: 'Your recipe collection deserves a time machine. Turn the recipes folder into a Git repository.',
  setup(e) { base(e); e.write('/home/you/recipes/pancakes.md', '# Pancakes\n- 2 eggs\n- 1 cup flour\n'); e.write('/home/you/recipes/waffles.md', '# Waffles\n- 2 eggs\n- butter\n'); },
  goals: [
    { t: 'Go into the recipes folder', ok: e => e.cwd.startsWith('/home/you/recipes') },
    { t: 'Initialize a Git repository there', ok: e => !!R(e, '~/recipes') },
    { t: 'Look at the hidden .git folder (ls -a)', ok: e => ran(e, /^ls\s+-[a-zA-Z]*a/) },
    { t: 'Check the state with git status', ok: e => ran(e, /^git status/) } ],
  hints: ['cd recipes', 'git init', 'ls -a then git status'],
  solution: ['cd recipes', 'git init', 'ls -a', 'git status'] });

add({ id: 'stage', ch: 1, title: 'The Staging Area', xp: 150,
  lesson: [
    { h: 'Three zones', p: 'Git has three places for your work: the <b>Working Directory</b> (your actual files), the <b>Staging Area</b> (a “packing box” of changes you chose), and the <b>Repository</b> (saved snapshots). Watch the colored tiles move across the dashboard!',
      viz: row(zone('WORKING', 'z1', blk('pancakes.md', 'red')), arr('git add'), zone('STAGING', 'z2', blk('pancakes.md', 'green')), arr('git commit'), zone('REPO', 'z3', cm('📸', 'blue'))) + legend(),
      cmds: [['git add <file>', 'put one file in the staging box'], ['git add <file1> <file2>', 'stage several files'], ['git add .', 'stage EVERYTHING in this folder (careful!)'], ['git status', 'see which tiles are red (not staged) and green (staged)']] },
    { h: 'Why stage?', p: 'Staging lets you pick exactly what goes into the next snapshot — like choosing which photos go into an album. Unfinished stuff stays out.',
      viz: row(blk('pancakes.md', 'green'), blk('waffles.md', 'green'), blk('shopping-list.txt', 'red')) , cmds: [['git restore --staged <file>', 'take a file back out of the staging box']] } ],
  story: 'Stage both recipes, but NOT your messy shopping list — that is private!',
  setup(e) { base(e); const r = repo(e, '~/recipes'); e.write('/home/you/recipes/pancakes.md', '# Pancakes\n- 2 eggs\n- 1 cup flour\n'); e.write('/home/you/recipes/waffles.md', '# Waffles\n- 2 eggs\n- butter\n'); e.write('/home/you/recipes/shopping-list.txt', 'chocolate x 12\n'); e.cwd = r.root; },
  goals: [
    { t: 'Stage pancakes.md', ok: e => 'pancakes.md' in R(e, '~/recipes').index },
    { t: 'Stage waffles.md', ok: e => 'waffles.md' in R(e, '~/recipes').index },
    { t: 'Keep shopping-list.txt UNstaged', ok: e => !('shopping-list.txt' in R(e, '~/recipes').index) && ('pancakes.md' in R(e, '~/recipes').index) },
    { t: 'Verify with git status', ok: e => ran(e, /^git status/) && 'waffles.md' in R(e, '~/recipes').index } ],
  hints: ['git add pancakes.md', 'You can list two files: git add pancakes.md waffles.md', 'If you staged the list by mistake: git restore --staged shopping-list.txt'],
  solution: ['git status', 'git add pancakes.md waffles.md', 'git status'] });

add({ id: 'commit', ch: 1, title: 'Snapshot Time', xp: 150,
  lesson: [{ h: 'A commit is a saved snapshot', p: 'git commit takes everything in the staging box and saves it as a permanent snapshot with a message. Each commit gets a unique ID (like <b>a1b2c3d</b>) and points back to the one before it — that chain is your history.',
    viz: row(cm('a1b2c3d', 'blue'), arr(), cm('e4f5a6b', 'blue'), arr(), cm('c7d8e9f', 'blue'), flag('main', 'green')),
    cmds: [['git commit -m "message"', 'save the staged changes with a message'], ['git commit -am "message"', 'shortcut: stage all already-tracked files AND commit (not new files!)']],
    tip: 'Good messages say WHAT and WHY in the present tense: “Add waffle recipe”, not “stuff”.' }],
  story: 'Save your recipes forever: one commit for the recipes, then a second commit for a new file.',
  setup(e) { base(e); const r = repo(e, '~/recipes'); e.write('/home/you/recipes/pancakes.md', '# Pancakes\n- 2 eggs\n- 1 cup flour\n'); e.write('/home/you/recipes/waffles.md', '# Waffles\n- 2 eggs\n- butter\n'); r.index = { 'pancakes.md': e.read('/home/you/recipes/pancakes.md'), 'waffles.md': e.read('/home/you/recipes/waffles.md') }; e.cwd = r.root; },
  goals: [
    { t: 'Commit the two staged recipes', ok: e => { const t = headT(e, R(e, '~/recipes')); return 'pancakes.md' in t && 'waffles.md' in t; } },
    { t: 'Create cookies.md with a recipe', ok: e => e.isFile('/home/you/recipes/cookies.md') },
    { t: 'Commit cookies.md in a SECOND commit', ok: e => { const r = R(e, '~/recipes'); const h = e.headId(r); return h && 'cookies.md' in e.tree(h) && e.ancestors(h).size >= 2; } },
    { t: 'Leave the working tree clean', ok: e => clean(e, R(e, '~/recipes')) && e.ancestors(e.headId(R(e, '~/recipes'))).size >= 2 } ],
  hints: ['git commit -m "Add pancake and waffle recipes"', 'echo "# Cookies" > cookies.md', 'git add cookies.md then git commit -m "Add cookies"'],
  solution: ['git commit -m "Add pancake and waffle recipes"', 'echo "# Cookies" > cookies.md', 'git add cookies.md', 'git commit -m "Add cookie recipe"', 'git status'] });

add({ id: 'history', ch: 1, title: 'History Detective', xp: 200,
  lesson: [
    { h: 'Read the past', p: 'Every commit remembers who, when and what. You can scroll the timeline, open any snapshot, and even find out who wrote each line of a file.',
      viz: row(cm('Ada', 'blue'), arr(), cm('Linus', 'blue'), arr(), cm('Max', 'pink'), arr(), cm('Grace', 'blue'), flag('HEAD → main', 'green')),
      cmds: [['git log', 'full history, newest first'], ['git log --oneline', 'compact: one commit per line'], ['git show <id>', 'what changed in one commit'], ['git blame <file>', 'who last changed each line'], ['git diff', 'what you changed but haven’t staged (red − / green +)'], ['git diff --staged', 'what is in the staging box']] }],
  story: 'Someone sneaked “1 cup of salt” into the pancake recipe! Find the culprit, then fix the line and commit the fix.',
  setup(e) { base(e); const r = repo(e, '~/recipes'); e.cwd = r.root;
    commit(e, r, 'Add pancake recipe', { 'pancakes.md': '# Pancakes\n- 2 eggs\n- 1 cup flour\n' }, null, A.ada);
    commit(e, r, 'Add milk to pancakes', { 'pancakes.md': '# Pancakes\n- 2 eggs\n- 1 cup flour\n- 1 cup milk\n' }, null, A.linus);
    commit(e, r, 'Improve pancake flavour', { 'pancakes.md': '# Pancakes\n- 2 eggs\n- 1 cup flour\n- 1 cup milk\n- 1 cup of salt\n' }, null, A.max);
    commit(e, r, 'Add waffles', { 'waffles.md': '# Waffles\n- 2 eggs\n' }, null, A.grace); },
  goals: [
    { t: 'Browse the history (git log)', ok: e => ran(e, /^git log/) },
    { t: 'Find the culprit with git blame (or git show)', ok: e => ran(e, /^git (blame|show)/) },
    { t: 'Change “1 cup of salt” to “1 pinch of salt”', ok: e => /1 pinch of salt/.test(e.read('/home/you/recipes/pancakes.md') || '') },
    { t: 'Preview your fix with git diff', ok: e => ran(e, /^git diff/) },
    { t: 'Commit the fix', ok: e => /1 pinch of salt/.test(headT(e, R(e, '~/recipes'))['pancakes.md'] || '') } ],
  hints: ['git log --oneline shows 4 commits by different people.', 'git blame pancakes.md — the salt line belongs to…?', 'Open the editor: nano pancakes.md and edit the line, then save.', 'git commit -am "Fix salt amount"'],
  solution: ['git log --oneline', 'git blame pancakes.md', 'echo -e "# Pancakes\\n- 2 eggs\\n- 1 cup flour\\n- 1 cup milk\\n- 1 pinch of salt" > pancakes.md', 'git diff', 'git commit -am "Fix salt amount in pancakes"'] });

add({ id: 'restore', ch: 1, title: 'Undo Before You Commit', xp: 200,
  lesson: [{ h: 'Rewind a file', p: 'Messed up a file? Since the last commit is a safe snapshot, you can pull the old version back. You can also un-stage something without losing the edit.',
    viz: row(blk('app.js 💥', 'orange'), arr('git restore'), blk('app.js ✓', 'blue')) + row(blk('style.css', 'green'), arr('restore --staged'), blk('style.css', 'orange')),
    cmds: [['git restore <file>', 'throw away your edits — back to the last committed version ⚠️ edits are gone!'], ['git restore --staged <file>', 'move a file out of staging, keep your edits'], ['git restore <deleted-file>', 'bring back a file you deleted by accident']] }],
  story: 'Disaster in the web app: app.js got scrambled, logo.txt was deleted, and style.css was staged too early.',
  setup(e) { base(e); const r = repo(e, '~/webapp'); e.cwd = r.root;
    commit(e, r, 'Create web app', { 'app.js': 'console.log("hello");\n', 'style.css': 'body { color: black; }\n', 'logo.txt': '★ WEBAPP ★\n' });
    e.write(r.root + '/app.js', 'c0ns0le.l0g(%%%#!@\n'); e.setWork(r, 'logo.txt', undefined);
    e.write(r.root + '/style.css', 'body { color: hotpink; }\n'); r.index['style.css'] = 'body { color: hotpink; }\n'; },
  goals: [
    { t: 'Restore app.js to the committed version', ok: e => e.read('/home/you/webapp/app.js') === 'console.log("hello");\n' },
    { t: 'Bring back the deleted logo.txt', ok: e => e.read('/home/you/webapp/logo.txt') === '★ WEBAPP ★\n' },
    { t: 'Unstage style.css but KEEP the hotpink edit', ok: e => { const r = R(e, '~/webapp'); return r.index['style.css'] === 'body { color: black; }\n' && /hotpink/.test(e.read('/home/you/webapp/style.css') || ''); } } ],
  hints: ['git status tells you the exact commands to use!', 'git restore app.js logo.txt', 'git restore --staged style.css'],
  solution: ['git status', 'git restore app.js', 'git restore logo.txt', 'git restore --staged style.css', 'git status'] });

add({ id: 'gitignore', ch: 1, title: 'The Secret Keeper', xp: 200,
  lesson: [{ h: '.gitignore: files Git should never track', p: 'Some files must never be committed: passwords (<b>.env</b>), huge downloaded libraries (<b>node_modules/</b>), logs. List them in a file called <b>.gitignore</b> and Git pretends they don’t exist.',
    viz: row(blk('.env 🔑', 'gray'), blk('node_modules/', 'gray'), blk('debug.log', 'gray'), arr('ignored'), blk('🚫', 'red')) + row(blk('.gitignore', 'green'), blk('src/new-feature.js', 'green'), arr('commit'), cm('📸', 'blue')),
    cmds: [['echo ".env" >> .gitignore', 'add a line to .gitignore'], ['node_modules/', 'pattern: a whole folder'], ['*.log', 'pattern: every file ending in .log'], ['git status --ignored', 'list files being ignored']], tip: 'Once a secret is committed and pushed it is public forever — ignore it BEFORE the first commit.' }],
  story: 'Your web app has a secret API key in .env, a giant node_modules folder and a log file. Commit the new feature — but leak nothing!',
  setup(e) { base(e); const r = repo(e, '~/webapp'); e.cwd = r.root;
    commit(e, r, 'Create web app', { 'app.js': 'console.log("hello");\n' });
    e.write(r.root + '/.env', 'API_KEY=sk_live_SUPER_SECRET_123\n'); e.write(r.root + '/node_modules/left-pad/index.js', 'module.exports = ...\n'); e.write(r.root + '/debug.log', 'ERROR at line 42\n'); e.write(r.root + '/src/new-feature.js', 'export const party = () => "🎉";\n'); },
  goals: [
    { t: 'Create a .gitignore', ok: e => e.isFile('/home/you/webapp/.gitignore') },
    { t: '.env, node_modules/ and debug.log are ignored', ok: e => { const r = R(e, '~/webapp'); const st = e.status(r); return !st.untracked.some(p => /^(\.env|node_modules\/|debug\.log)/.test(p)) && e.isFile('/home/you/webapp/.gitignore'); } },
    { t: 'Commit .gitignore and src/new-feature.js', ok: e => { const t = headT(e, R(e, '~/webapp')); return '.gitignore' in t && 'src/new-feature.js' in t; } },
    { t: 'No secret, log or library in any commit', ok: e => { const r = R(e, '~/webapp'); return [...e.ancestors(e.headId(r))].every(id => !Object.keys(e.commits[id].tree).some(p => /^(\.env|node_modules\/|.*\.log$)/.test(p))) && '.gitignore' in headT(e, r); } } ],
  hints: ['echo -e ".env\\nnode_modules/\\n*.log" > .gitignore   (\\n = new line)', 'Run git status — the ignored files disappear from the list!', 'git add . && git commit -m "Add gitignore and party feature"'],
  solution: ['git status', 'echo -e ".env\\nnode_modules/\\n*.log" > .gitignore', 'git status', 'git add .', 'git commit -m "Add .gitignore and new feature"'] });

// ---------------- CH 2 ----------------
add({ id: 'branch', ch: 2, title: 'Parallel Universes', xp: 200,
  lesson: [{ h: 'Branches = safe parallel timelines', p: 'A <b>branch</b> is a movable label pointing at a commit. Make a branch to try an idea without touching <b>main</b>. <b>HEAD</b> marks the branch you are standing on.',
    viz: stack(row(cm('A', 'blue'), arr(), cm('B', 'blue'), flag('main', 'green')), row('<span class="pad"></span>', '<span class="pad"></span>', '<span class="arr diag"></span>', cm('C', 'purple'), flag('★ feature/sound', 'purple'))),
    cmds: [['git branch', 'list branches (* = where you are)'], ['git branch <name>', 'create a branch here'], ['git switch <name>', 'jump onto a branch'], ['git switch -c <name>', 'create AND jump in one go'], ['git checkout <name>', 'older command that also switches']] }],
  story: 'Your game needs sound effects, but main must stay stable. Build the feature in its own universe.',
  setup(e) { base(e); const r = repo(e, '~/game'); e.cwd = r.root; commit(e, r, 'Create game', { 'game.txt': 'PLAYER: @\n' }); e.lv.main = commit(e, r, 'Add enemies', { 'enemies.txt': 'goblin\nslime\n' }); },
  goals: [
    { t: 'Create branch feature/sound', ok: e => R(e, '~/game').branches['feature/sound'] !== undefined },
    { t: 'Commit sound.txt on feature/sound', ok: e => { const t = brT(e, R(e, '~/game'), 'feature/sound'); return t && 'sound.txt' in t; } },
    { t: 'main is untouched (no sound.txt there)', ok: e => { const r = R(e, '~/game'); return r.branches.main === e.lv.main && brT(e, r, 'feature/sound') && 'sound.txt' in brT(e, r, 'feature/sound'); } },
    { t: 'Switch back to main — watch sound.txt vanish!', ok: e => { const r = R(e, '~/game'); return r.head.branch === 'main' && !e.isFile('/home/you/game/sound.txt') && brT(e, r, 'feature/sound') && 'sound.txt' in brT(e, r, 'feature/sound'); } } ],
  hints: ['git switch -c feature/sound', 'echo "beep boop" > sound.txt && git add sound.txt && git commit -m "Add sound"', 'git switch main, then ls'],
  solution: ['git switch -c feature/sound', 'echo "beep boop" > sound.txt', 'git add sound.txt', 'git commit -m "Add sound effects"', 'git switch main', 'ls'] });

add({ id: 'ffmerge', ch: 2, title: 'Fast-Forward', xp: 200,
  lesson: [{ h: 'Merging a branch back', p: 'When your feature is done, <b>merge</b> it into main. If main hasn’t moved since you branched, Git simply slides the main label forward — a <b>fast-forward</b>. No new commit needed.',
    viz: stack(row(cm('A', 'blue'), arr(), cm('B', 'blue'), flag('main', 'green'), arr('fast-forward'), cm('C', 'purple'), flag('feature', 'purple'))),
    cmds: [['git switch main', 'stand on the branch that RECEIVES the changes'], ['git merge <branch>', 'bring that branch’s commits in'], ['git branch -d <branch>', 'delete a branch that is fully merged']], tip: 'Always: switch to the receiver first, then merge the giver.' }],
  story: 'Sound effects are finished. Merge them into main and clean up the old branch.',
  setup(e) { base(e); const r = repo(e, '~/game'); e.cwd = r.root; commit(e, r, 'Create game', { 'game.txt': 'PLAYER: @\n' }); commit(e, r, 'Add enemies', { 'enemies.txt': 'goblin\n' }); r.branches['feature/sound'] = e.headId(r); r.head = { branch: 'feature/sound' }; e.lv.f = commit(e, r, 'Add sound effects', { 'sound.txt': 'beep\n' }); },
  goals: [
    { t: 'Switch to main', ok: e => R(e, '~/game').head.branch === 'main' || R(e, '~/game').branches.main === e.lv.f },
    { t: 'Merge feature/sound (fast-forward)', ok: e => R(e, '~/game').branches.main === e.lv.f },
    { t: 'Delete the merged feature/sound branch', ok: e => R(e, '~/game').branches['feature/sound'] === undefined && R(e, '~/game').branches.main === e.lv.f } ],
  hints: ['git switch main', 'git merge feature/sound — look for “Fast-forward”', 'git branch -d feature/sound'],
  solution: ['git switch main', 'git merge feature/sound', 'git branch -d feature/sound', 'git log --oneline'] });

add({ id: 'merge3', ch: 2, title: 'When Timelines Diverge', xp: 250,
  lesson: [{ h: 'Merge commits tie two timelines together', p: 'If BOTH main and your branch got new commits, Git can’t just slide forward. It creates a <b>merge commit</b> with TWO parents that combines both sides.',
    viz: stack(row(cm('A', 'blue'), arr(), cm('B', 'blue'), arr(), cm('D', 'blue'), arr(), cm('M', 'yellow'), flag('main', 'green')), row('<span class="pad"></span>', '<span class="pad"></span>', '<span class="arr diag"></span>', cm('C', 'purple'), '<span class="arr up"></span>', flag('feature', 'purple'))),
    cmds: [['git merge <branch>', 'creates a merge commit when histories diverged'], ['git log --oneline --graph', 'draw the history as a graph']] }],
  story: 'While you built the score board, a teammate fixed a bug on main. Combine both timelines.',
  setup(e) { base(e); const r = repo(e, '~/game'); e.cwd = r.root; commit(e, r, 'Create game', { 'game.txt': 'PLAYER: @\n' }); r.branches['feature/score'] = e.headId(r); commit(e, r, 'Fix jump bug', { 'game.txt': 'PLAYER: @ (jumps!)\n' }); sw(e, r, 'feature/score'); commit(e, r, 'Add score board', { 'score.txt': 'SCORE: 0\n' }); sw(e, r, 'main'); },
  goals: [
    { t: 'Be on main', ok: e => R(e, '~/game').head.branch === 'main' },
    { t: 'Merge feature/score → a merge commit with 2 parents', ok: e => { const r = R(e, '~/game'); const c = e.commits[r.branches.main]; return c.parents.length === 2; } },
    { t: 'main now has BOTH score.txt and the jump fix', ok: e => { const t = brT(e, R(e, '~/game'), 'main'); return 'score.txt' in t && /jumps/.test(t['game.txt']); } },
    { t: 'Draw the graph: git log --oneline --graph', ok: e => ran(e, /^git log.*--graph/) } ],
  hints: ['You are already on main — check with git branch.', 'git merge feature/score', 'git log --oneline --graph'],
  solution: ['git branch', 'git merge feature/score', 'git log --oneline --graph'] });

add({ id: 'conflict', ch: 2, title: 'Merge Conflict Boss', xp: 300,
  lesson: [
    { h: 'When two timelines edit the same line', p: 'If both branches changed the <b>same line</b>, Git can’t decide — it’s a <b>merge conflict</b>. Git pauses and marks the spot in the file. YOU choose the final text.',
      viz: row(blk('main: “Git Quest”', 'blue'), blk('feature: “Super Quest”', 'purple'), arr('merge'), blk('⚔ CONFLICT', 'pink')),
      cmds: [['git merge <branch>', 'starts the merge, stops on conflict'], ['git status', 'shows “both modified” files'], ['nano <file>', 'edit: delete the markers, keep the text you want'], ['git add <file>', 'mark the conflict as solved'], ['git commit', 'finish the merge (message is pre-filled)'], ['git merge --abort', 'panic button: cancel the merge']] },
    { h: 'Reading the markers', p: 'Everything between <b>&lt;&lt;&lt;&lt;&lt;&lt;&lt; HEAD</b> and <b>=======</b> is your side, the rest until <b>&gt;&gt;&gt;&gt;&gt;&gt;&gt;</b> is theirs. Delete all three marker lines and keep (or mix) the content.',
      viz: stack(blk('&lt;&lt;&lt;&lt;&lt;&lt;&lt; HEAD', 'pink'), blk('Git Quest', 'blue'), blk('=======', 'pink'), blk('Super Quest', 'purple'), blk('&gt;&gt;&gt;&gt;&gt;&gt;&gt; feature/title', 'pink'), arr('you edit'), blk('Super Git Quest', 'green')) }],
  story: 'Two designers renamed the game at the same time. Merge feature/title into main and settle it: the title must be “Super Git Quest”.',
  setup(e) { base(e); const r = repo(e, '~/game'); e.cwd = r.root; commit(e, r, 'Create game', { 'title.txt': 'Quest\n', 'game.txt': 'PLAYER: @\n' }); r.branches['feature/title'] = e.headId(r); commit(e, r, 'Rename to Git Quest', { 'title.txt': 'Git Quest\n' }); sw(e, r, 'feature/title'); commit(e, r, 'Rename to Super Quest', { 'title.txt': 'Super Quest\n' }); sw(e, r, 'main'); },
  goals: [
    { t: 'Start the merge and hit the conflict', ok: e => ran(e, /^git merge feature\/title/) },
    { t: 'title.txt says “Super Git Quest” with no markers', ok: e => { const c = e.read('/home/you/game/title.txt') || ''; return /^Super Git Quest\s*$/.test(c); } },
    { t: 'Finish the merge with a merge commit', ok: e => { const r = R(e, '~/game'); const c = e.commits[r.branches.main]; return !r.merging && c.parents.length === 2 && /^Super Git Quest\s*$/.test(c.tree['title.txt']); } } ],
  hints: ['git merge feature/title  → CONFLICT', 'cat title.txt to see the markers, then nano title.txt (or echo "Super Git Quest" > title.txt)', 'git add title.txt then git commit -m "Merge feature/title"'],
  solution: ['git merge feature/title', 'git status', 'cat title.txt', 'echo "Super Git Quest" > title.txt', 'git add title.txt', 'git commit -m "Merge feature/title: Super Git Quest"'] });

add({ id: 'rebase', ch: 2, title: 'Rebase: Rewrite the Path', xp: 300,
  lesson: [{ h: 'Replay your commits on top of the latest main', p: '<b>Rebase</b> picks up your branch’s commits and replays them on top of another branch, giving a clean straight line instead of a merge bubble. The replayed commits get <b>new IDs</b>.',
    viz: stack(row(cm('A', 'blue'), arr(), cm('B', 'blue'), arr(), cm('C', 'blue'), flag('main', 'green'), arr('rebase'), cm("X'", 'purple'), arr(), cm("Y'", 'purple'), flag('feature', 'purple'))),
    cmds: [['git switch <feature>', 'stand on YOUR branch'], ['git rebase main', 'replay your commits on top of main'], ['git merge <feature>', '(from main) now a clean fast-forward']], tip: 'Golden rule: never rebase commits you already pushed and others use — it rewrites history.' }],
  story: 'Main moved ahead while you built new levels. Rebase feature/levels onto main, then fast-forward main — keep history a straight line!',
  setup(e) { base(e); const r = repo(e, '~/game'); e.cwd = r.root; commit(e, r, 'Create game', { 'game.txt': 'PLAYER: @\n' }); r.branches['feature/levels'] = e.headId(r); commit(e, r, 'Add pause menu', { 'menu.txt': 'PAUSE\n' }); e.lv.mainTip = commit(e, r, 'Add credits', { 'credits.txt': 'Made by you\n' }); sw(e, r, 'feature/levels'); commit(e, r, 'Add level 1', { 'level1.txt': '#####\n#@  #\n#####\n' }); commit(e, r, 'Add level 2', { 'level2.txt': '######\n#@ $ #\n######\n' }); sw(e, r, 'main'); },
  goals: [
    { t: 'Rebase feature/levels onto main', ok: e => { const r = R(e, '~/game'); return r.branches['feature/levels'] && e.isAnc(e.lv.mainTip, r.branches['feature/levels']); } },
    { t: 'No merge commits anywhere (straight line)', ok: e => { const r = R(e, '~/game'); return e.isAnc(e.lv.mainTip, r.branches['feature/levels'] || '') && [...e.ancestors(r.branches.main)].every(id => e.commits[id].parents.length < 2); } },
    { t: 'Fast-forward main to include both levels', ok: e => { const r = R(e, '~/game'); const t = brT(e, r, 'main'); return t && 'level2.txt' in t && 'credits.txt' in t && [...e.ancestors(r.branches.main)].every(id => e.commits[id].parents.length < 2); } } ],
  hints: ['git switch feature/levels', 'git rebase main', 'git switch main then git merge feature/levels'],
  solution: ['git switch feature/levels', 'git rebase main', 'git log --oneline --graph', 'git switch main', 'git merge feature/levels'] });

add({ id: 'stash', ch: 2, title: 'Stash & Dash', xp: 250,
  lesson: [{ h: 'Pocket unfinished work', p: 'Halfway through something and an emergency hits? <b>git stash</b> tucks your uncommitted changes into a pocket and gives you a clean folder. Later, <b>git stash pop</b> puts them back.',
    viz: row(blk('menu.txt (WIP)', 'orange'), arr('git stash'), blk('🎒 stash', 'yellow'), arr('git stash pop'), blk('menu.txt (WIP)', 'orange')),
    cmds: [['git stash', 'save uncommitted changes & clean the folder'], ['git stash list', 'see what is in the pocket'], ['git stash pop', 'bring the latest stash back (and remove it from the pocket)'], ['git stash -u', 'also stash brand-new (untracked) files']] }],
  story: 'You’re mid-way through the new menu when the game crashes for everyone! Hotfix bug.txt on main (make it say “fixed”), then return to your menu work exactly as it was.',
  setup(e) { base(e); const r = repo(e, '~/game'); e.cwd = r.root; commit(e, r, 'Create game', { 'bug.txt': 'status: broken\n', 'menu.txt': 'START\n' }); r.branches['feature/menu'] = e.headId(r); sw(e, r, 'feature/menu'); commit(e, r, 'Start menu', { 'menu.txt': 'START\nOPTIONS\n' }); e.write(r.root + '/menu.txt', 'START\nOPTIONS\nHIGH SCORES (WIP)\n'); },
  goals: [
    { t: 'Stash your work-in-progress', ok: e => ran(e, /^git stash( push| save|$| -)/) },
    { t: 'On main, commit bug.txt saying “fixed”', ok: e => { const t = brT(e, R(e, '~/game'), 'main'); return t && /fixed/.test(t['bug.txt'] || ''); } },
    { t: 'Back on feature/menu with the WIP restored', ok: e => { const r = R(e, '~/game'); return r.head.branch === 'feature/menu' && /HIGH SCORES \(WIP\)/.test(e.read('/home/you/game/menu.txt') || '') && /fixed/.test((brT(e, r, 'main') || {})['bug.txt'] || ''); } },
    { t: 'The stash pocket is empty', ok: e => { const r = R(e, '~/game'); return !r.stash.length && /fixed/.test((brT(e, r, 'main') || {})['bug.txt'] || '') && r.head.branch === 'feature/menu'; } } ],
  hints: ['git stash (then git status — clean!)', 'git switch main, echo "status: fixed" > bug.txt, git commit -am "Hotfix crash"', 'git switch feature/menu then git stash pop'],
  solution: ['git switch main', 'git stash', 'git switch main', 'echo "status: fixed" > bug.txt', 'git commit -am "Hotfix: fix crash"', 'git switch feature/menu', 'git stash pop'] });

add({ id: 'revert', ch: 2, title: 'Amend & Revert', xp: 300,
  lesson: [
    { h: 'Fix the LAST commit: amend', p: 'Forgot a file or made a typo in the message? <b>--amend</b> replaces the last commit with a corrected one. Only do this BEFORE you share (push) it.',
      viz: row(cm('typo 😬', 'pink'), arr('--amend'), cm('fixed ✓', 'blue')),
      cmds: [['git add <forgotten-file>', 'stage what you forgot'], ['git commit --amend -m "Better message"', 'rewrite the last commit']] },
    { h: 'Undo an OLD, shared commit: revert', p: '<b>git revert</b> doesn’t erase history — it adds a NEW commit that does the exact opposite. Safe for commits others already have.',
      viz: row(cm('Add music 🎵', 'blue'), arr(), cm('…', 'blue'), arr(), cm('Revert music', 'yellow')),
      cmds: [['git revert <id>', 'make a new commit that undoes <id>'], ['HEAD~1', 'shortcut meaning “one commit before HEAD” (HEAD~2 = two before)']] }],
  story: 'Two mistakes: the last commit has a typo (“hihgscore”) and forgot highscore.txt; and the shared “Add autoplay music” commit annoys everyone. Fix both!',
  setup(e) { base(e); const r = repo(e, '~/game'); e.cwd = r.root; commit(e, r, 'Create game', { 'game.txt': 'PLAYER: @\n' }); e.lv.music = commit(e, r, 'Add autoplay music', { 'music.txt': '♪ LOUD MUSIC ON START ♪\n' }); commit(e, r, 'Add hihgscore table', { 'game.txt': 'PLAYER: @\nHIGHSCORE: on\n' }); e.write(r.root + '/highscore.txt', 'AAA 9999\n'); },
  goals: [
    { t: 'Amend: last commit includes highscore.txt…', ok: e => { const r = R(e, '~/game'); return [...e.ancestors(r.branches.main)].some(id => /^Add highscore table/.test(e.commits[id].msg) && 'highscore.txt' in e.commits[id].tree); } },
    { t: '…and the typo “hihgscore” is gone from history', ok: e => { const r = R(e, '~/game'); return !msgs(e, r.branches.main).some(m => /hihg/.test(m)) && msgs(e, r.branches.main).some(m => /highscore/.test(m)); } },
    { t: 'Revert “Add autoplay music” (it stays in history)', ok: e => { const r = R(e, '~/game'); const t = brT(e, r, 'main'); return !('music.txt' in t) && e.ancestors(r.branches.main).has(e.lv.music) && msgs(e, r.branches.main).some(m => /^Revert "Add autoplay music"/.test(m)); } } ],
  hints: ['git add highscore.txt', 'git commit --amend -m "Add highscore table"', 'git log --oneline → copy the ID of “Add autoplay music”, then git revert <id> (or git revert HEAD~1)'],
  solution: ['git add highscore.txt', 'git commit --amend -m "Add highscore table"', 'git log --oneline', 'git revert HEAD~1'] });

add({ id: 'reset', ch: 2, title: 'Reset & the Reflog Safety Net', xp: 300,
  lesson: [
    { h: 'Move a branch back in time: reset', p: '<b>git reset</b> moves your branch label to an earlier commit. <b>--soft</b> keeps changes staged, (default) <b>--mixed</b> keeps them as edits, <b>--hard</b> throws them away. Only for commits you have NOT pushed.',
      viz: row(cm('C', 'blue'), flag('main', 'green'), arr(), cm('junk 1', 'gray'), arr(), cm('junk 2', 'gray'), arr('reset --hard HEAD~2'), cm('C', 'blue'), flag('main', 'green')),
      cmds: [['git reset --soft HEAD~1', 'undo commit, keep changes staged'], ['git reset HEAD~1', 'undo commit, keep changes as edits'], ['git reset --hard HEAD~2', 'drop the last 2 commits completely ⚠️']] },
    { h: 'The reflog remembers everything', p: 'Git secretly logs every place HEAD has been. Even “deleted” commits can be rescued for weeks with the <b>reflog</b>.',
      viz: row(blk('HEAD@{0} reset', 'gray'), blk('HEAD@{1} junk 2', 'yellow'), blk('HEAD@{2} junk 1', 'gray')),
      cmds: [['git reflog', 'list where HEAD has been'], ['git branch rescue HEAD@{1}', 'put a branch on a lost commit to save it']] }],
  story: 'Two messy “WIP junk” commits clutter main. Remove them with reset… then realise junk 2 had your brilliant idea.txt — rescue it with the reflog onto a branch called rescue.',
  setup(e) { base(e); const r = repo(e, '~/game'); e.cwd = r.root; commit(e, r, 'Create game', { 'game.txt': 'PLAYER: @\n' }); e.lv.good = commit(e, r, 'Add boss fight', { 'boss.txt': 'DRAGON\n' }); commit(e, r, 'WIP junk 1', { 'tmp1.txt': 'asdf\n' }); e.lv.junk2 = commit(e, r, 'WIP junk 2', { 'tmp2.txt': 'qwerty\n', 'idea.txt': 'Make the dragon friendly 🐉💖\n' }); },
  goals: [
    { t: 'main points at “Add boss fight” again', ok: e => R(e, '~/game').branches.main === e.lv.good },
    { t: 'Working folder is clean (no tmp files)', ok: e => R(e, '~/game').branches.main === e.lv.good && !e.isFile('/home/you/game/tmp1.txt') && clean(e, R(e, '~/game')) },
    { t: 'Look at the reflog', ok: e => ran(e, /^git reflog/) },
    { t: 'Branch rescue points at the commit with idea.txt', ok: e => { const r = R(e, '~/game'); return r.branches.rescue && 'idea.txt' in e.tree(r.branches.rescue); } } ],
  hints: ['git reset --hard HEAD~2', 'git reflog — find “commit: WIP junk 2”', 'git branch rescue HEAD@{1}  (or use the commit ID)'],
  solution: ['git log --oneline', 'git reset --hard HEAD~2', 'git reflog', 'git branch rescue HEAD@{1}', 'git log --oneline rescue'] });

add({ id: 'cherry', ch: 2, title: 'Cherry Picking', xp: 250,
  lesson: [{ h: 'Copy just ONE commit', p: 'Sometimes a branch is full of experiments but one commit is gold. <b>cherry-pick</b> copies that single commit onto your current branch.',
    viz: stack(row(cm('A', 'blue'), arr(), cm('B', 'blue'), flag('main', 'green'), arr('cherry-pick'), cm("F'", 'yellow')), row('<span class="pad"></span>', '<span class="arr diag"></span>', cm('X', 'gray'), arr(), cm('F 🍒', 'purple'), arr(), cm('Y', 'gray'), flag('experimental', 'purple'))),
    cmds: [['git log --oneline <branch>', 'find the commit ID on another branch'], ['git cherry-pick <id>', 'copy that commit here'], ['<branch>~1', 'the commit one before the tip of <branch>']] }],
  story: 'The experimental branch is chaos, but it contains “Fix typo in README”. Bring ONLY that fix to main.',
  setup(e) { base(e); const r = repo(e, '~/game'); e.cwd = r.root; commit(e, r, 'Create game', { 'README.md': '# Git Qeust\nA game about git.\n' }); r.branches.experimental = e.headId(r); sw(e, r, 'experimental'); commit(e, r, 'Try 3D graphics (broken)', { 'crazy3d.txt': '???\n' }); commit(e, r, 'Fix typo in README', { 'README.md': '# Git Quest\nA game about git.\n' }); commit(e, r, 'Replace player with banana', { 'game.txt': 'PLAYER: 🍌\n' }); sw(e, r, 'main'); },
  goals: [
    { t: 'Find the fix with git log --oneline experimental', ok: e => ran(e, /^git log.*experimental/) },
    { t: 'main’s README says “Git Quest”', ok: e => /Git Quest/.test((brT(e, R(e, '~/game'), 'main') || {})['README.md'] || '') },
    { t: 'main has NO experimental junk', ok: e => { const t = brT(e, R(e, '~/game'), 'main'); return /Git Quest/.test(t['README.md']) && !('crazy3d.txt' in t) && !('game.txt' in t); } } ],
  hints: ['git log --oneline experimental', 'The fix is one before the tip: experimental~1', 'git cherry-pick experimental~1 (or its ID)'],
  solution: ['git log --oneline experimental', 'git cherry-pick experimental~1', 'cat README.md'] });

// ---------------- CH 3 ----------------
add({ id: 'publish', ch: 3, title: 'Go Online: Push to GitHub', xp: 300,
  lesson: [
    { h: 'Local vs remote', p: 'So far everything lived on your laptop. <b>GitHub</b> hosts a copy of your repo online — a <b>remote</b> — usually named <b>origin</b>. You <b>push</b> commits up and <b>pull</b> them down.',
      viz: row(zone('💻 LAPTOP', 'z1', cm('A', 'blue'), cm('B', 'blue')), arr('git push ⇧'), zone('☁ GITHUB', 'z3', cm('A', 'purple'), cm('B', 'purple'))),
      cmds: [['gh auth login', 'log in to GitHub from the terminal (one time)'], ['gh repo create <name> --public', 'make an empty repo on GitHub'], ['git remote add origin <url>', 'tell your repo where GitHub is'], ['git push -u origin main', 'upload main and remember origin/main as its “upstream”'], ['git remote -v', 'list remotes']] },
    { h: 'Shortcut', p: 'gh can do create + remote + push in one go from inside your project:', viz: row(blk('gh repo create portfolio --public --source=. --push', 'purple')), cmds: [['git push', 'after -u once, plain git push is enough']], tip: 'GitHub no longer accepts passwords for git — gh auth login sets up a secure token for you.' }],
  story: 'Your portfolio deserves the world. Log in, create the repo on GitHub, and push main.',
  setup(e) { base(e); const r = repo(e, '~/portfolio'); e.cwd = r.root; commit(e, r, 'Add homepage', { 'index.html': '<h1>Hi, I am You</h1>\n' }); commit(e, r, 'Add projects list', { 'projects.md': '- Git Quest\n' }); },
  goals: [
    { t: 'Log in with gh auth login', ok: e => e.auth.ok },
    { t: 'Create public repo you/portfolio on GitHub', ok: e => { const g = G(e, 'you/portfolio'); return g && g.vis === 'public'; } },
    { t: 'Add the remote called origin', ok: e => !!R(e, '~/portfolio').remotes.origin },
    { t: 'Push main and set its upstream', ok: e => { const r = R(e, '~/portfolio'), g = G(e, 'you/portfolio'); return g && g.branches.main === r.branches.main && r.upstream.main === 'origin/main'; } } ],
  hints: ['gh auth login', 'gh repo create portfolio --public', 'git remote add origin https://github.com/you/portfolio.git', 'git push -u origin main'],
  solution: ['git push', 'gh auth login', 'gh repo create portfolio --public', 'git remote add origin https://github.com/you/portfolio.git', 'git remote -v', 'git push -u origin main'] });

add({ id: 'clone', ch: 3, title: 'Clone a Repo', xp: 200,
  lesson: [{ h: 'Download a whole repo with its history', p: '<b>git clone</b> copies a GitHub repo — every file, every commit, every branch — to your laptop and sets up <b>origin</b> automatically. Remote branches appear as <b>origin/name</b>.',
    viz: row(zone('☁ GITHUB', 'z3', cm('A', 'purple'), cm('B', 'purple'), flag('main', 'green'), flag('docs', 'purple')), arr('git clone ⇩'), zone('💻 LAPTOP', 'z1', cm('A', 'blue'), cm('B', 'blue'), flag('main', 'green'), flag('origin/docs', 'gray'))),
    cmds: [['git clone <url>', 'copy a repo into a new folder'], ['git branch -a', 'list local AND remote branches'], ['git switch <name>', 'switching to a remote-only branch creates a local copy that tracks it']] }],
  story: 'The Octo Academy publishes a starter repo. Clone it, inspect it, and check out its docs branch.',
  setup(e) { base(e); gh(e, 'octo-academy/hello-world', [['Initial commit', { 'README.md': '# Hello World\nWelcome to Octo Academy!\n' }], ['Add greeting script', { 'hello.sh': 'echo "Hello, world!"\n' }], ['Add contributors', { 'CONTRIBUTORS.md': '- Octocat\n' }]], { desc: 'Your first repository' }); ghBranch(e, 'octo-academy/hello-world', 'docs', 'main', [['Write docs', { 'docs/guide.md': '# Guide\nRun hello.sh\n' }]]); },
  goals: [
    { t: 'Clone https://github.com/octo-academy/hello-world.git', ok: e => !!R(e, '~/hello-world') },
    { t: 'Enter it and check git remote -v', ok: e => ran(e, /^git remote -v/) && !!R(e, '~/hello-world') },
    { t: 'List all branches with git branch -a', ok: e => ran(e, /^git branch -a/) },
    { t: 'Switch to the docs branch', ok: e => { const r = R(e, '~/hello-world'); return r && r.head.branch === 'docs' && r.upstream.docs === 'origin/docs'; } } ],
  hints: ['git clone https://github.com/octo-academy/hello-world.git', 'cd hello-world && git remote -v', 'git branch -a then git switch docs'],
  solution: ['git clone https://github.com/octo-academy/hello-world.git', 'cd hello-world', 'git remote -v', 'git branch -a', 'git switch docs', 'ls docs'] });

add({ id: 'sync', ch: 3, title: 'Team Sync: Fetch, Pull, Push', xp: 350,
  lesson: [
    { h: 'Staying in sync with a team', p: 'Teammates push too. <b>fetch</b> downloads their commits without touching your files. <b>pull</b> = fetch + merge into your branch. If GitHub has commits you don’t, your push is <b>rejected</b> — pull first!',
      viz: row(zone('💻 YOU', 'z1', cm('A', 'blue'), cm('Y', 'blue')), blk('⛔ push rejected', 'pink'), zone('☁ GITHUB', 'z3', cm('A', 'purple'), cm('S', 'purple'))),
      cmds: [['git fetch', 'download new commits into origin/main'], ['git status', 'shows ahead / behind / diverged'], ['git pull', 'fetch + merge'], ['git pull --rebase', 'fetch + replay your commits on top (straight history)']] },
    { h: 'Divergent branches', p: 'If both sides have new commits, modern Git asks HOW to combine them. Choose once with a config, or per pull with a flag.',
      viz: row(blk('git pull --rebase', 'purple'), blk('git pull --no-rebase', 'purple'), blk('git config pull.rebase false', 'gray')), cmds: [['git push', 'after integrating, push succeeds']] }],
  story: 'You added dark mode while Sam pushed a footer to the shared team-app. Get your commit onto GitHub without losing Sam’s.',
  setup(e) { base(e, { auth: true }); gh(e, 'you/team-app', [['Create team app', { 'index.html': '<h1>Team App</h1>\n' }, null, A.you]]); clone(e, 'you/team-app', '~/team-app'); e.ghCommit('you/team-app', 'main', 'Add footer', { 'footer.html': '<footer>© Team</footer>\n' }, null, A.sam); const r = R(e, '~/team-app'); e.cwd = r.root; commit(e, r, 'Add dark mode', { 'dark.css': 'body { background: #111; }\n' }); },
  goals: [
    { t: 'Try to push (it gets rejected!)', ok: e => ran(e, /^git push/) },
    { t: 'Fetch and inspect with git status', ok: e => ran(e, /^git (fetch|pull)/) },
    { t: 'Integrate Sam’s footer into your main', ok: e => 'footer.html' in headT(e, R(e, '~/team-app')) },
    { t: 'GitHub has both dark mode and the footer', ok: e => { const t = ghT(e, 'you/team-app'); return t && 'footer.html' in t && 'dark.css' in t; } } ],
  hints: ['git push → rejected: “fetch first”', 'git fetch then git status → diverged', 'git pull --rebase (or git pull --no-rebase)', 'git push'],
  solution: ['git push', 'git fetch', 'git status', 'git pull --rebase', 'git push', 'git log --oneline'] });

add({ id: 'ssh', ch: 3, title: 'SSH Keys', xp: 300,
  lesson: [{ h: 'A key pair instead of passwords', p: 'An <b>SSH key</b> is a pair: a <b>private key</b> 🔑 that never leaves your laptop, and a <b>public key</b> 🔓 you give to GitHub. GitHub can then recognise your laptop automatically.',
    viz: row(blk('🔑 id_ed25519 (private — secret!)', 'pink'), blk('🔓 id_ed25519.pub', 'green'), arr('gh ssh-key add'), blk('☁ GitHub account', 'purple')),
    cmds: [['ssh-keygen -t ed25519 -C "you@example.com"', 'create a key pair'], ['gh ssh-key add ~/.ssh/id_ed25519.pub --title laptop', 'upload the PUBLIC key'], ['ssh -T git@github.com', 'test the connection'], ['git remote set-url origin git@github.com:you/repo.git', 'switch a repo from HTTPS to SSH']], tip: 'Never share or upload the file WITHOUT .pub.' }],
  story: 'Upgrade your portfolio to SSH: create a key, register it, test it, switch the remote, and push your pending commit.',
  setup(e) { base(e, { auth: true }); gh(e, 'you/portfolio', [['Add homepage', { 'index.html': '<h1>Hi</h1>\n' }, null, A.you]]); const r = clone(e, 'you/portfolio', '~/portfolio'); e.cwd = r.root; commit(e, r, 'Add contact page', { 'contact.html': '<p>Say hi!</p>\n' }); },
  goals: [
    { t: 'Generate an ed25519 key pair', ok: e => e.isFile('/home/you/.ssh/id_ed25519.pub') },
    { t: 'Add the PUBLIC key to GitHub', ok: e => e.ssh.added },
    { t: 'Test with ssh -T git@github.com', ok: e => ran(e, /^ssh -T git@github\.com/) && e.ssh.added },
    { t: 'Switch origin to the SSH URL', ok: e => /^git@github\.com:you\/portfolio(\.git)?$/.test(R(e, '~/portfolio').remotes.origin || '') },
    { t: 'Push over SSH', ok: e => { const t = ghT(e, 'you/portfolio'); return t && 'contact.html' in t && /^git@/.test(R(e, '~/portfolio').remotes.origin); } } ],
  hints: ['ssh-keygen -t ed25519 -C "you@example.com"', 'gh ssh-key add ~/.ssh/id_ed25519.pub --title laptop', 'git remote set-url origin git@github.com:you/portfolio.git', 'git push'],
  solution: ['ssh-keygen -t ed25519 -C "you@example.com"', 'ls ~/.ssh', 'gh ssh-key add ~/.ssh/id_ed25519.pub --title laptop', 'ssh -T git@github.com', 'git remote set-url origin git@github.com:you/portfolio.git', 'git remote -v', 'git push'] });

add({ id: 'pr', ch: 3, title: 'Pull Requests', xp: 400,
  lesson: [
    { h: 'Propose, review, merge', p: 'On teams nobody pushes straight to main. You push a <b>feature branch</b> and open a <b>Pull Request (PR)</b>: “please pull my branch into main”. Teammates review, automated checks run, then it’s merged.',
      viz: row(blk('feature/login', 'purple'), arr('push'), blk('PR #1 🔍 review', 'yellow'), arr('merge'), blk('main', 'green')),
      cmds: [['git push -u origin <branch>', 'publish your branch'], ['gh pr create --title "…" --body "…"', 'open a PR'], ['gh pr list', 'see open PRs'], ['gh pr view', 'see the PR for your branch'], ['gh pr merge --merge --delete-branch', 'merge it, delete the branch, switch you to main']] },
    { h: 'Three ways to merge', p: '<b>--merge</b> keeps all commits + a merge commit. <b>--squash</b> squashes the PR into ONE commit. <b>--rebase</b> replays the commits in a line.', viz: row(blk('--merge', 'blue'), blk('--squash', 'yellow'), blk('--rebase', 'purple')), cmds: [['git pull', 'afterwards, update your local main']] }],
  story: 'Build a login page the professional way: branch → push → PR → merge → clean up.',
  setup(e) { base(e, { auth: true }); gh(e, 'you/team-app', [['Create team app', { 'index.html': '<h1>Team App</h1>\n' }, null, A.you]]); const r = clone(e, 'you/team-app', '~/team-app'); e.cwd = r.root; },
  goals: [
    { t: 'Commit login.html on branch feature/login', ok: e => { const r = R(e, '~/team-app'); return (r.branches['feature/login'] && 'login.html' in e.tree(r.branches['feature/login'])) || prMerged(e); } },
    { t: 'Push feature/login to GitHub', ok: e => { const g = G(e, 'you/team-app'); return (g.branches['feature/login'] !== undefined) || prMerged(e); } },
    { t: 'Open a pull request', ok: e => G(e, 'you/team-app').prs.length > 0 },
    { t: 'Merge the PR (GitHub main has login.html)', ok: e => prMerged(e) },
    { t: 'Clean up: on main locally, branch deleted everywhere', ok: e => { const r = R(e, '~/team-app'), g = G(e, 'you/team-app'); return prMerged(e) && r.head.branch === 'main' && r.branches['feature/login'] === undefined && g.branches['feature/login'] === undefined && 'login.html' in headT(e, r); } } ],
  hints: ['git switch -c feature/login', 'echo "<form>login</form>" > login.html && git add . && git commit -m "Add login page"', 'git push -u origin feature/login', 'gh pr create --title "Add login page" --body "Adds a login form"', 'gh pr merge --merge --delete-branch'],
  solution: ['git switch -c feature/login', 'echo "<form>login</form>" > login.html', 'git add login.html', 'git commit -m "Add login page"', 'git push -u origin feature/login', 'gh pr create --title "Add login page" --body "Adds a simple login form"', 'gh pr list', 'gh pr merge --merge --delete-branch', 'git log --oneline'] });
function prMerged(e) { const g = G(e, 'you/team-app'); return g && g.prs.some(p => p.state === 'MERGED') && 'login.html' in (ghT(e, 'you/team-app') || {}); }

add({ id: 'fork', ch: 3, title: 'Fork & Contribute', xp: 400,
  lesson: [{ h: 'Contributing to someone else’s project', p: 'You can’t push to a repo you don’t own. Instead you <b>fork</b> it (your own copy on GitHub), push to your fork, then open a PR to the original — called <b>upstream</b>. This is how open source works!',
    viz: row(zone('☁ octo-academy', 'z3', cm('A', 'purple')), arr('fork'), zone('☁ you (fork)', 'z3', cm('A', 'purple'), cm('T', 'blue')), arr('PR ⤴'), blk('upstream', 'yellow')),
    cmds: [['gh repo fork <owner/repo> --clone', 'fork AND clone; sets origin = your fork, upstream = original'], ['git remote -v', 'see origin and upstream'], ['git push -u origin <branch>', 'push to YOUR fork'], ['gh pr create …', 'opens the PR against the original repo'], ['gh repo sync you/<repo>', 'later: update your fork from upstream']] }],
  story: 'Octo Academy keeps a list of awesome git tips. Add your own tip to TIPS.md and send them a pull request.',
  setup(e) { base(e, { auth: true }); gh(e, 'octo-academy/awesome-git-tips', [['Start the list', { 'TIPS.md': '# Awesome Git Tips\n- Run git status often\n' }], ['Add contributing guide', { 'CONTRIBUTING.md': 'Fork, branch, PR!\n' }]], { stars: 1337, desc: 'Community tips' }); },
  goals: [
    { t: 'Fork octo-academy/awesome-git-tips', ok: e => !!G(e, 'you/awesome-git-tips') },
    { t: 'Clone your fork (with upstream remote)', ok: e => { const r = R(e, '~/awesome-git-tips'); return r && /you\/awesome-git-tips/.test(r.remotes.origin) && !!r.remotes.upstream; } },
    { t: 'Commit a new tip on branch add-my-tip', ok: e => { const r = R(e, '~/awesome-git-tips'); return r && r.branches['add-my-tip'] && e.tree(r.branches['add-my-tip'])['TIPS.md'] !== e.tree(e.gh['octo-academy/awesome-git-tips'].branches.main)['TIPS.md']; } },
    { t: 'Push it to your fork', ok: e => { const g = G(e, 'you/awesome-git-tips'); return g && g.branches['add-my-tip'] !== undefined; } },
    { t: 'Open a PR to octo-academy', ok: e => G(e, 'octo-academy/awesome-git-tips').prs.some(p => p.head.key === 'you/awesome-git-tips') } ],
  hints: ['gh repo fork octo-academy/awesome-git-tips --clone', 'cd awesome-git-tips && git switch -c add-my-tip', 'echo "- Commit early, commit often" >> TIPS.md && git commit -am "Add my tip"', 'git push -u origin add-my-tip', 'gh pr create --title "Add my tip" --body "…"'],
  solution: ['gh repo fork octo-academy/awesome-git-tips --clone', 'cd awesome-git-tips', 'git remote -v', 'git switch -c add-my-tip', 'echo "- Commit early, commit often" >> TIPS.md', 'git commit -am "Add tip: commit early, commit often"', 'git push -u origin add-my-tip', 'gh pr create --title "Add tip: commit early, commit often" --body "My favourite tip!"'] });

add({ id: 'mirror', ch: 3, title: 'Mirror & Migrate', xp: 450,
  lesson: [
    { h: 'Copy EVERYTHING to a new repo', p: 'A normal clone only gives you the default branch locally. A <b>bare mirror</b> holds every branch and tag, and <b>push --mirror</b> sends all of them to a new home. Great for renaming or moving a project.',
      viz: row(zone('☁ old-project', 'z3', flag('main', 'green'), flag('dev', 'purple'), flag('v1.0.0', 'yellow')), arr('clone --bare'), blk('💻 old-project.git', 'gray'), arr('push --mirror'), zone('☁ new-project', 'z3', flag('main', 'green'), flag('dev', 'purple'), flag('v1.0.0', 'yellow'))),
      cmds: [['git clone --bare <old-url>', 'copy all refs, no working files'], ['gh repo create new-project --public', 'empty destination'], ['git push --mirror <new-url>', 'push every branch & tag']] },
    { h: 'Delete the old one, point your clone to the new one', p: 'Deleting a repo is permanent, so GitHub requires a special permission (scope). Then update your existing laptop clone.',
      viz: row(blk('gh auth refresh -s delete_repo', 'yellow'), arr(), blk('gh repo delete … --yes', 'pink'), arr(), blk('git remote set-url origin …', 'purple')),
      cmds: [['gh auth refresh -h github.com -s delete_repo', 'grant the delete permission'], ['gh repo delete you/old-project --yes', 'delete forever ⚠️'], ['git remote set-url origin <new-url>', 'repoint an existing clone']] }],
  story: 'Rename time! Move you/old-project — all branches and tags — to you/new-project, delete the old repo, and update your laptop clone.',
  setup(e) { base(e, { auth: true }); const k = 'you/old-project'; gh(e, k, [['Initial commit', { 'README.md': '# Project\n' }, null, A.you], ['Add core', { 'core.js': 'run()\n' }, null, A.you]]); e.gh[k].tags['v1.0.0'] = { id: e.gh[k].branches.main, annot: true, msg: 'v1.0.0', tagger: A.you }; e.ghCommit(k, 'main', 'Add plugins', { 'plugins.js': 'load()\n' }, null, A.you); e.gh[k].tags['v1.1.0'] = { id: e.gh[k].branches.main, annot: true, msg: 'v1.1.0', tagger: A.you }; ghBranch(e, k, 'dev', 'main', [['Experimental turbo mode', { 'turbo.js': 'go fast\n' }, null, A.you]]); const r = clone(e, k, '~/old-project'); e.lv.snap = JSON.stringify({ b: e.gh[k].branches, t: Object.keys(e.gh[k].tags).sort() }); },
  goals: [
    { t: 'Make a bare mirror clone', ok: e => Object.values(e.repos).some(r => r.bare) },
    { t: 'Create you/new-project on GitHub', ok: e => !!G(e, 'you/new-project') || ran(e, /gh repo create (you\/)?new-project/) },
    { t: 'new-project has ALL branches and tags', ok: e => { const g = e.gh['you/new-project']; if (!g) return false; const s = JSON.parse(e.lv.snap); return JSON.stringify(g.branches) === JSON.stringify(s.b) && JSON.stringify(Object.keys(g.tags).sort()) === JSON.stringify(s.t); } },
    { t: 'Delete you/old-project', ok: e => e.gh['you/old-project'].deleted },
    { t: 'Point ~/old-project’s origin at new-project', ok: e => /you\/new-project/.test(R(e, '~/old-project').remotes.origin || '') } ],
  hints: ['git clone --bare https://github.com/you/old-project.git', 'cd old-project.git && gh repo create new-project --public', 'git push --mirror https://github.com/you/new-project.git', 'gh auth refresh -h github.com -s delete_repo, then gh repo delete you/old-project --yes', 'cd ~/old-project && git remote set-url origin https://github.com/you/new-project.git'],
  solution: ['git clone --bare https://github.com/you/old-project.git', 'cd old-project.git', 'gh repo create new-project --public', 'git push --mirror https://github.com/you/new-project.git', 'cd ..', 'gh repo delete you/old-project --yes', 'gh auth refresh -h github.com -s delete_repo', 'gh repo delete you/old-project --yes', 'cd old-project', 'git remote set-url origin https://github.com/you/new-project.git', 'git fetch', 'git status'] });

add({ id: 'docs', ch: 3, title: 'Issues & Documentation', xp: 400,
  lesson: [
    { h: 'Issues: the to-do list of a project', p: 'Bugs and ideas are tracked as <b>issues</b> (#1, #2…). A commit message containing <b>Fixes #1</b> automatically closes issue #1 when it reaches main.',
      viz: row(blk('Issue #1 🐛 open', 'red'), arr('commit “Fixes #1” → push'), blk('Issue #1 ✓ closed', 'purple')),
      cmds: [['gh issue create --title "…" --body "…"', 'open an issue'], ['gh issue list', 'open issues (--state all for every issue)'], ['gh issue close <n>', 'close manually']] },
    { h: 'The docs every project needs', p: 'Great projects explain themselves. These four files are standard:',
      viz: row(blk('README.md — what & how', 'blue'), blk('LICENSE — who may use it', 'yellow')) + row(blk('CONTRIBUTING.md — how to help', 'green'), blk('CHANGELOG.md — what changed', 'purple')),
      cmds: [['README.md', 'title, description, install & usage (Markdown: # heading, - list)'], ['LICENSE', 'e.g. MIT: “do anything, keep the notice”'], ['CHANGELOG.md', 'versions with Added / Fixed / Removed lists']] }],
  story: 'calc-app has zero docs. Open an issue for it, write the four standard files, and close the issue automatically with your commit.',
  setup(e) { base(e, { auth: true }); gh(e, 'you/calc-app', [['Create calculator', { 'calc.js': 'const add = (a, b) => a + b;\n' }, null, A.you]]); const r = clone(e, 'you/calc-app', '~/calc-app'); e.cwd = r.root; },
  goals: [
    { t: 'Open issue #1 about documentation', ok: e => G(e, 'you/calc-app').issues.length > 0 },
    { t: 'README.md with a heading and a ## Usage section', ok: e => { const t = ghT(e, 'you/calc-app'); return t && /^# /m.test(t['README.md'] || '') && /^## Usage/m.test(t['README.md'] || ''); } },
    { t: 'LICENSE, CONTRIBUTING.md and CHANGELOG.md on GitHub', ok: e => { const t = ghT(e, 'you/calc-app'); return t && ['LICENSE', 'CONTRIBUTING.md', 'CHANGELOG.md'].every(f => (t[f] || '').trim()); } },
    { t: 'Issue #1 closed by your commit (“Fixes #1”)', ok: e => { const i = G(e, 'you/calc-app').issues[0]; return i && i.state === 'CLOSED' && !!i.closedBy; } } ],
  hints: ['gh issue create --title "Add documentation" --body "README, LICENSE, CONTRIBUTING, CHANGELOG"', 'echo -e "# Calc App\\n\\nA tiny calculator.\\n\\n## Usage\\n\\nOpen calc.js" > README.md', 'Use nano for the other files, or echo "MIT License" > LICENSE …', 'git add . && git commit -m "Add project docs (fixes #1)" && git push'],
  solution: ['gh issue create --title "Add documentation" --body "We need README, LICENSE, CONTRIBUTING and CHANGELOG"', 'echo -e "# Calc App\\n\\nA tiny calculator.\\n\\n## Usage\\n\\nadd(2, 3) returns 5" > README.md', 'echo -e "MIT License\\n\\nCopyright (c) 2026 You" > LICENSE', 'echo -e "# Contributing\\n\\n1. Fork\\n2. Branch\\n3. Pull request" > CONTRIBUTING.md', 'echo -e "# Changelog\\n\\n## [Unreleased]\\n### Added\\n- Documentation" > CHANGELOG.md', 'git add .', 'git commit -m "Add project docs (fixes #1)"', 'git push', 'gh issue list --state all'] });

// ---------------- CH 4 ----------------
add({ id: 'semver', ch: 4, title: 'Semantic Versioning & Tags', xp: 400,
  lesson: [
    { h: 'MAJOR . MINOR . PATCH', p: 'Version numbers have meaning. Bump <b>PATCH</b> for bug fixes, <b>MINOR</b> for new features that don’t break anything, <b>MAJOR</b> for breaking changes. Reset the numbers to the right when you bump.',
      viz: row(blk('2', 'pink'), blk('.', 'gray'), blk('4', 'yellow'), blk('.', 'gray'), blk('1', 'green')) + row(blk('MAJOR: breaks things', 'pink'), blk('MINOR: new feature', 'yellow'), blk('PATCH: bug fix', 'green')) + row(blk('1.0.0', 'blue'), arr('fix'), blk('1.0.1', 'blue'), arr('feature'), blk('1.1.0', 'blue'), arr('breaking'), blk('2.0.0', 'blue')) },
    { h: 'Tags pin a version to a commit', p: 'A <b>tag</b> is a permanent name on one commit. <b>Annotated</b> tags (-a) also store a message, author and date — use them for releases. Tags are NOT pushed automatically!',
      viz: row(cm('…', 'blue'), arr(), cm('C', 'blue'), flag('🏷 v1.0.0', 'yellow')),
      cmds: [['git tag -a v1.0.0 -m "msg"', 'annotated tag on HEAD'], ['git tag -a v1.0.0 -m "msg" <id>', 'tag an older commit (HEAD~2 works too)'], ['git tag', 'list tags'], ['git show v1.0.0', 'see the tag'], ['git push --tags', 'upload tags to GitHub']] }],
  story: 'calc-app has 3 untagged milestones: the first stable version, a rounding bug fix, and a new square-root feature. Tag each with the right semantic version and publish the tags.',
  setup(e) { base(e, { auth: true }); const k = 'you/calc-app'; gh(e, k, [['Create calculator', { 'calc.js': 'add\n' }, null, A.you], ['First stable version', { 'calc.js': 'add\nsubtract\n' }, null, A.you], ['Fix rounding bug', { 'calc.js': 'add\nsubtract (rounding fixed)\n' }, null, A.you], ['Add square root', { 'calc.js': 'add\nsubtract (rounding fixed)\nsqrt\n' }, null, A.you]]); const r = clone(e, k, '~/calc-app'); e.cwd = r.root; },
  goals: [
    { t: 'v1.0.0 → “First stable version”', ok: e => tagOk(e, 'v1.0.0', 'First stable version') },
    { t: 'v1.0.1 → “Fix rounding bug” (patch)', ok: e => tagOk(e, 'v1.0.1', 'Fix rounding bug') },
    { t: 'v1.1.0 → “Add square root” (minor)', ok: e => tagOk(e, 'v1.1.0', 'Add square root') },
    { t: 'All three are annotated tags', ok: e => { const r = R(e, '~/calc-app'); return ['v1.0.0', 'v1.0.1', 'v1.1.0'].every(t => r.tags[t] && r.tags[t].annot); } },
    { t: 'Tags pushed to GitHub', ok: e => ['v1.0.0', 'v1.0.1', 'v1.1.0'].every(t => G(e, 'you/calc-app').tags[t]) } ],
  hints: ['git log --oneline — newest is HEAD, then HEAD~1, HEAD~2', 'git tag -a v1.0.0 -m "First stable release" HEAD~2', 'git tag -a v1.0.1 -m "Bug fix" HEAD~1 and git tag -a v1.1.0 -m "Square root"', 'git push --tags'],
  solution: ['git log --oneline', 'git tag -a v1.0.0 -m "First stable release" HEAD~2', 'git tag -a v1.0.1 -m "Fix rounding bug" HEAD~1', 'git tag -a v1.1.0 -m "Add square root"', 'git tag', 'git push --tags'] });
function tagOk(e, t, msg) { const r = R(e, '~/calc-app'); return r && r.tags[t] && e.commits[r.tags[t].id].msg === msg; }

add({ id: 'release', ch: 4, title: 'Ship a Release', xp: 450,
  lesson: [{ h: 'A release = tag + notes + downloads', p: 'On GitHub a <b>Release</b> turns a tag into a public page with release notes. A typical release: bump the version file, update the CHANGELOG, commit, tag, push both, publish the release.',
    viz: row(blk('VERSION 2.0.0', 'orange'), blk('CHANGELOG', 'orange'), arr('commit'), cm('Release v2.0.0', 'blue'), flag('🏷 v2.0.0', 'yellow'), arr('push'), blk('🚀 Release page', 'purple')),
    cmds: [['git push origin v2.0.0', 'push one specific tag'], ['gh release create v2.0.0 --title "v2.0.0" --notes "…"', 'publish a release'], ['gh release create v2.0.0 --generate-notes', 'let GitHub write notes from commits'], ['gh release list', 'see releases']], tip: 'The upcoming release removes an old API — that is a BREAKING change, so it is a MAJOR bump.' }],
  story: 'Two new commits are waiting: one removes a deprecated API (breaking!) and one adds a history panel. Ship them as the correct new version.',
  setup(e) { base(e, { auth: true }); const k = 'you/calc-app'; gh(e, k, [['First stable version', { 'calc.js': 'add\nlegacyAdd\n', 'VERSION': '1.1.0\n', 'CHANGELOG.md': '# Changelog\n\n## [1.1.0]\n### Added\n- Square root\n' }, null, A.you]]); e.gh[k].tags['v1.1.0'] = { id: e.gh[k].branches.main, annot: true, msg: 'v1.1.0' }; e.ghCommit(k, 'main', 'Remove deprecated legacyAdd API', { 'calc.js': 'add\n' }, null, A.you); e.ghCommit(k, 'main', 'Add history panel', { 'history.js': 'show()\n' }, null, A.you); const r = clone(e, k, '~/calc-app'); e.cwd = r.root; },
  goals: [
    { t: 'VERSION says 2.0.0', ok: e => /^2\.0\.0\s*$/.test(e.read('/home/you/calc-app/VERSION') || '') },
    { t: 'CHANGELOG.md has a 2.0.0 section', ok: e => /2\.0\.0/.test(e.read('/home/you/calc-app/CHANGELOG.md') || '') },
    { t: 'Commit and push the release commit', ok: e => { const t = ghT(e, 'you/calc-app'); return t && /^2\.0\.0/.test(t['VERSION']) && /2\.0\.0/.test(t['CHANGELOG.md']); } },
    { t: 'Tag v2.0.0 on that commit, pushed', ok: e => { const g = G(e, 'you/calc-app'); return g.tags['v2.0.0'] && /^2\.0\.0/.test(e.tree(g.tags['v2.0.0'].id)['VERSION'] || ''); } },
    { t: 'Publish GitHub release v2.0.0', ok: e => G(e, 'you/calc-app').releases.some(x => x.tag === 'v2.0.0') } ],
  hints: ['echo "2.0.0" > VERSION', 'nano CHANGELOG.md — add a ## [2.0.0] section with Removed / Added', 'git commit -am "Release v2.0.0" && git tag -a v2.0.0 -m "Version 2.0.0"', 'git push && git push origin v2.0.0', 'gh release create v2.0.0 --title "v2.0.0" --generate-notes'],
  solution: ['git log --oneline', 'echo "2.0.0" > VERSION', 'echo -e "# Changelog\\n\\n## [2.0.0]\\n### Removed\\n- legacyAdd API (breaking)\\n### Added\\n- History panel\\n\\n## [1.1.0]\\n### Added\\n- Square root" > CHANGELOG.md', 'git commit -am "Release v2.0.0"', 'git tag -a v2.0.0 -m "Version 2.0.0"', 'git push', 'git push origin v2.0.0', 'gh release create v2.0.0 --title "v2.0.0" --generate-notes', 'gh release list'] });

// ---------------- CH 5 ----------------
add({ id: 'ci', ch: 5, title: 'GitHub Actions: CI Robot', xp: 500,
  lesson: [
    { h: 'Robots that run on every push', p: '<b>GitHub Actions</b> runs <b>workflows</b> — recipes written in YAML files inside <b>.github/workflows/</b>. A CI (Continuous Integration) workflow runs your tests on every push, so bugs get caught automatically.',
      viz: row(blk('git push', 'purple'), arr('triggers'), blk('🤖 workflow', 'yellow'), arr(), blk('checkout', 'gray'), blk('install', 'gray'), blk('test', 'gray'), arr(), blk('✓ / ✗', 'green')),
      cmds: [['on: push', 'WHEN to run'], ['jobs → steps', 'WHAT to run, step by step'], ['uses: actions/checkout@v4', 'a ready-made step from the marketplace'], ['run: npm test', 'a shell command']] },
    { h: 'Watching runs', p: 'A red ✗ means a step failed — read its log, fix the code, push again.',
      viz: row(blk('✗ run 1', 'red'), arr('fix + push'), blk('✓ run 2', 'green')),
      cmds: [['gh run list', 'recent runs'], ['gh run watch', 'follow the newest run live'], ['gh run view --log', 'full log of a run'], ['gh workflow list', 'workflows in the repo']] }],
  story: 'Add the CI workflow from ~/templates/ci.yml to calc-app, push it, watch it catch the bug in src/calc.js, then fix it until the robot goes green.',
  setup(e) { base(e, { auth: true }); gh(e, 'you/calc-app', [['Create calculator', { 'src/calc.js': 'function add(a, b) {\n  return a - b;\n}\nmodule.exports = { add };\n', 'test/calc.test.js': 'expect(add(2, 3)).toBe(5);\n', 'package.json': '{ "scripts": { "test": "jest" } }\n' }, null, A.you]]); const r = clone(e, 'you/calc-app', '~/calc-app'); e.cwd = r.root; e.write('/home/you/templates/ci.yml', CI_YML); e.write('/home/you/templates/pages.yml', PAGES_YML);
    e.testRules = [{ name: 'add(2, 3) returns 5', check: t => /return\s+a\s*\+\s*b/.test(t['src/calc.js'] || '') ? true : 'expected add(2, 3) to be 5 — received -1  (src/calc.js line 2)' }, { name: 'module exports add', check: t => /module\.exports/.test(t['src/calc.js'] || '') ? true : 'add is not exported' }]; },
  goals: [
    { t: 'Copy the template to .github/workflows/ci.yml', ok: e => e.isFile('/home/you/calc-app/.github/workflows/ci.yml') },
    { t: 'Commit & push it — a run starts', ok: e => G(e, 'you/calc-app').runs.length > 0 },
    { t: 'Watch a run finish (gh run watch / list)', ok: e => ran(e, /^gh run (watch|view|list)/) && G(e, 'you/calc-app').runs.some(r => r.status === 'completed') },
    { t: 'Fix src/calc.js so the latest run is ✓ green', ok: e => { const r = G(e, 'you/calc-app').runs[0]; return r && r.status === 'completed' && r.conclusion === 'success'; } } ],
  hints: ['mkdir -p .github/workflows && cp ~/templates/ci.yml .github/workflows/ci.yml', 'git add . && git commit -m "Add CI workflow" && git push', 'gh run watch — read the ✗ log', 'nano src/calc.js: change a - b to a + b, then commit, push, gh run watch'],
  solution: ['cat ~/templates/ci.yml', 'mkdir -p .github/workflows', 'cp ~/templates/ci.yml .github/workflows/ci.yml', 'git add .', 'git commit -m "Add CI workflow"', 'git push', 'gh run watch', 'echo -e "function add(a, b) {\\n  return a + b;\\n}\\nmodule.exports = { add };" > src/calc.js', 'git commit -am "Fix add() to actually add"', 'git push', 'gh run watch', 'gh run list'] });

add({ id: 'pages', ch: 5, title: 'FINAL BOSS: Launch on GitHub Pages', xp: 1000,
  lesson: [
    { h: 'Free website hosting from a repo', p: '<b>GitHub Pages</b> turns a repo into a live website at <b>https://you.github.io/repo/</b>. The modern way: an Actions workflow builds and deploys the site on every push to main.',
      viz: row(blk('index.html', 'blue'), arr('push'), blk('🤖 pages workflow', 'yellow'), arr('upload → deploy'), blk('🌐 you.github.io/my-site', 'green')) },
    { h: 'Three switches to flip', p: 'The repo must be <b>public</b> (Pages is free for public repos), Pages must be <b>enabled with source “GitHub Actions”</b> (Settings → Pages, or the API call below), and the workflow file must be on main.',
      viz: row(blk('1 public repo', 'purple'), blk('2 Pages: source = Actions', 'yellow'), blk('3 workflow on main', 'green')),
      cmds: [['gh repo create my-site --public --source=. --push', 'publish the folder'], ['cp ~/templates/pages.yml .github/workflows/', 'add the deploy workflow'], ['gh api -X POST repos/you/my-site/pages -f build_type=workflow', 'enable Pages (or click ⚙ Pages on the GitHub card)'], ['gh run watch', 'watch the deployment'], ['open https://you.github.io/my-site/', 'visit your live site!']] }],
  story: 'The final boss! Take ~/my-site live on the internet: publish it, add the Pages workflow, enable Pages, deploy, and open your site.',
  setup(e) { base(e, { auth: true }); const r = repo(e, '~/my-site'); e.cwd = r.root; commit(e, r, 'Create my site', { 'index.html': '<!DOCTYPE html>\n<html>\n<head><link rel="stylesheet" href="style.css"><title>My Site</title></head>\n<body>\n<h1>🏆 I beat Git Quest!</h1>\n<p>This page was deployed with GitHub Actions.</p>\n</body>\n</html>\n', 'style.css': 'body { font-family: sans-serif; background: #0b1020; color: #7CFFCB; text-align: center; padding: 3em; }\nh1 { color: #FFD93D; }\n' }); e.write('/home/you/templates/pages.yml', PAGES_YML); e.write('/home/you/templates/ci.yml', CI_YML); },
  goals: [
    { t: 'Publish you/my-site as a PUBLIC repo with main pushed', ok: e => { const g = G(e, 'you/my-site'); return g && g.vis === 'public' && !!g.branches.main; } },
    { t: 'Pages workflow committed on GitHub main', ok: e => { const t = ghT(e, 'you/my-site'); return t && Object.keys(t).some(p => /^\.github\/workflows\/.+\.ya?ml$/.test(p) && /deploy-pages/.test(t[p])); } },
    { t: 'Enable Pages with source = GitHub Actions', ok: e => { const g = G(e, 'you/my-site'); return g && g.pages.enabled && g.pages.type === 'workflow'; } },
    { t: 'A deployment run succeeds 🚀', ok: e => { const g = G(e, 'you/my-site'); return g && !!g.pages.site; } },
    { t: 'Open your live site', ok: e => { const g = G(e, 'you/my-site'); return g && !!g.pages.site && ran(e, /^(open|xdg-open)\s+https:\/\/you\.github\.io\/my-site/) || !!(e.lv && e.lv.opened); } } ],
  hints: ['gh repo create my-site --public --source=. --push', 'mkdir -p .github/workflows && cp ~/templates/pages.yml .github/workflows/', 'gh api -X POST repos/you/my-site/pages -f build_type=workflow', 'git add . && git commit -m "Add Pages workflow" && git push, then gh run watch', 'open https://you.github.io/my-site/'],
  solution: ['gh repo create my-site --public --source=. --push', 'mkdir -p .github/workflows', 'cp ~/templates/pages.yml .github/workflows/', 'git add .', 'git commit -m "Deploy with GitHub Pages"', 'gh api -X POST repos/you/my-site/pages -f build_type=workflow', 'git push', 'gh run watch', 'open https://you.github.io/my-site/'] });

const SANDBOX = { id: 'sandbox', ch: -1, title: 'Free Play Sandbox', xp: 0, lesson: [], story: 'No rules. Try anything — break things, fix things. A couple of GitHub repos are waiting for you.',
  setup(e) { base(e, { auth: true }); gh(e, 'octo-academy/hello-world', [['Initial commit', { 'README.md': '# Hello World\n' }], ['Add greeting', { 'hello.sh': 'echo hi\n' }]]); const r = repo(e, '~/playground'); e.cwd = r.root; commit(e, r, 'First commit', { 'README.md': '# Playground\n' }); e.write('/home/you/templates/pages.yml', PAGES_YML); e.write('/home/you/templates/ci.yml', CI_YML); },
  goals: [], hints: ['Try: gh repo create playground --public --source=. --push'], solution: [] };

const api = { LV, CH, SANDBOX };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.GQ_LEVELS = api;
})(typeof window !== 'undefined' ? window : globalThis);
