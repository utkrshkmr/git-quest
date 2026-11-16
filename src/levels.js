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
const HOME_ = '/home/you';
const visited = (e, d) => (e.visited || []).includes(d);
const didRead = (e, f) => (e.readFiles || []).includes(f);
function homeWorld(e) { base(e); e.write(HOME_ + '/Documents/welcome.txt', 'Welcome to Git Quest!\nEvery legend starts with a single command.\n'); e.write(HOME_ + '/Documents/school/timetable.txt', 'Mon: Math\nTue: Science\nWed: Art\n'); e.write(HOME_ + '/Music/playlist.txt', '1. Chiptune Dreams\n2. 8-bit Sunrise\n'); e.write(HOME_ + '/Pictures/cat.txt', '(=^･ω･^=)\n'); }

add({ id: 'terminal', ch: 0, title: 'Where Am I?', xp: 50,
  lesson: [{ h: 'The terminal is a chat with your computer', p: 'You type a command, press <b>Enter</b>, and the computer answers. Your files live in <b>folders</b>, nested inside each other. Two questions first: <b>where am I?</b> and <b>what is here?</b>',
    viz: row(blk('~ (home)', 'gray'), arr('contains'), blk('Documents/', 'purple'), blk('Music/', 'purple'), blk('Pictures/', 'purple')),
    cmds: [['pwd', 'Print Working Directory — “where am I?”'], ['ls', 'LiSt what is in this folder'], ['ls Documents', 'peek inside a folder without going in']], tip: 'Press ↑ to bring back earlier commands.' }],
  story: 'You just woke up in a strange computer. Look around before you move!',
  setup(e) { homeWorld(e); },
  goals: [
    { t: 'Ask where you are: type pwd', ok: e => ran(e, /^pwd\b/) },
    { t: 'List what is here: type ls', ok: e => ran(e, /^ls(\s+-\w+)*\s*$/) },
    { t: 'Peek inside Documents: type ls Documents', ok: e => ran(e, /^ls(\s+-\w+)*\s+(\.\/)?Documents\/?\s*$/) } ],
  hints: ['Type pwd and press Enter', 'Type ls and press Enter', 'Type ls Documents'],
  solution: ['pwd', 'ls', 'ls Documents'] });

add({ id: 'walk', ch: 0, title: 'Walking Around', xp: 50,
  lesson: [{ h: 'cd moves you between folders', p: '<b>cd</b> (change directory) walks into a folder. <b>cd ..</b> steps back out to the folder above. <b>cd ~</b> takes you home from anywhere. Watch the 📍 marker move on the dashboard!',
    viz: row(blk('~', 'gray'), arr('cd Documents'), blk('Documents/', 'purple')) + row(blk('Documents/', 'purple'), arr('cd ..'), blk('~', 'gray')),
    cmds: [['cd <folder>', 'walk into a folder'], ['cd ..', 'step back up one folder'], ['cd ~', 'go home from anywhere'], ['pwd', 'check where you ended up']] }],
  story: 'Explore the house: visit Documents, come back, visit Music, then head home.',
  setup(e) { homeWorld(e); },
  goals: [
    { t: 'Walk into Documents', ok: e => visited(e, HOME_ + '/Documents') },
    { t: 'Step back out with cd ..', ok: e => { const v = e.visited || []; const i = v.indexOf(HOME_ + '/Documents'); return i >= 0 && v.slice(i + 1).includes(HOME_); } },
    { t: 'Walk into Music', ok: e => visited(e, HOME_ + '/Music') },
    { t: 'Finish back home (cd ~)', ok: e => e.cwd === HOME_ && visited(e, HOME_ + '/Music') } ],
  hints: ['cd Documents', 'cd ..', 'cd Music, then cd ~'],
  solution: ['cd Documents', 'ls', 'cd ..', 'cd Music', 'ls', 'cd ~'] });

add({ id: 'read', ch: 0, title: 'Reading Files', xp: 50,
  lesson: [{ h: 'cat shows what is inside a file', p: '<b>cat</b> prints a file into the terminal. You can stand next to the file, or point at it with a path like <b>Documents/welcome.txt</b>.',
    viz: row(blk('cat welcome.txt', 'purple'), arr('shows'), blk('Welcome to Git Quest!', 'blue')),
    cmds: [['cat <file>', 'show a file'], ['cat Documents/welcome.txt', 'show a file inside a folder without moving'], ['ls', 'find file names first']] }],
  story: 'Three notes are hidden around the house. Read them all.',
  setup(e) { homeWorld(e); },
  goals: [
    { t: 'Read Documents/welcome.txt', ok: e => didRead(e, HOME_ + '/Documents/welcome.txt') },
    { t: 'Read Music/playlist.txt', ok: e => didRead(e, HOME_ + '/Music/playlist.txt') },
    { t: 'Read the timetable in Documents/school', ok: e => didRead(e, HOME_ + '/Documents/school/timetable.txt') } ],
  hints: ['cat Documents/welcome.txt', 'cd Music then cat playlist.txt (or cat Music/playlist.txt)', 'cat Documents/school/timetable.txt'],
  solution: ['cat Documents/welcome.txt', 'cd Music', 'cat playlist.txt', 'cd ~', 'cat Documents/school/timetable.txt'] });

add({ id: 'mkdir', ch: 0, title: 'Make Folders', xp: 50,
  lesson: [{ h: 'mkdir builds a new folder', p: '<b>mkdir</b> (make directory) creates an empty folder right where you are standing. Then you can <b>cd</b> into it.',
    viz: row(blk('~', 'gray'), arr('mkdir my-project'), blk('~', 'gray'), blk('my-project/', 'purple')),
    cmds: [['mkdir <name>', 'make a new folder here'], ['ls', 'see it appear'], ['cd <name>', 'walk into it']], tip: 'Use dashes instead of spaces in names: my-project, not my project.' }],
  story: 'Time to build your own space: a folder for your project and one for your games.',
  setup(e) { homeWorld(e); },
  goals: [
    { t: 'Create a folder called my-project', ok: e => projDirs(e).length > 0 },
    { t: 'Create a folder called games', ok: e => Object.keys(e.fs).some(p => e.fs[p].d && p.endsWith('/games')) },
    { t: 'Walk into my-project', ok: e => projDirs(e).includes(e.cwd) } ],
  hints: ['mkdir my-project', 'mkdir games', 'cd my-project'],
  solution: ['mkdir my-project', 'mkdir games', 'ls', 'cd my-project'] });

add({ id: 'files', ch: 0, title: 'Make Files', xp: 75,
  lesson: [{ h: 'Two ways to make a file', p: '<b>touch</b> creates an empty file. <b>echo "text" &gt; file</b> writes text into a file (creating it if needed). Then <b>cat</b> it to check.',
    viz: row(blk('touch ideas.txt', 'purple'), arr('creates'), blk('ideas.txt (empty)', 'gray')) + row(blk('echo "hi" > notes.txt', 'purple'), arr('writes'), blk('notes.txt: hi', 'blue')),
    cmds: [['touch <file>', 'create an empty file'], ['echo "text" > <file>', 'write text into a file (replaces what was there)'], ['echo "more" >> <file>', 'add a line to the end'], ['cat <file>', 'check what is inside']] }],
  story: 'You are inside my-project. Fill it with your first files.',
  setup(e) { homeWorld(e); e.mkdirp(HOME_ + '/my-project'); e.cwd = HOME_ + '/my-project'; },
  goals: [
    { t: 'Create an empty file with touch', ok: e => ran(e, /^touch\s+\S/) && e.children(HOME_ + '/my-project').length > 0 },
    { t: 'Write some text into notes.txt with echo', ok: e => (e.read(HOME_ + '/my-project/notes.txt') || '').trim().length > 0 },
    { t: 'Read notes.txt back with cat', ok: e => didRead(e, HOME_ + '/my-project/notes.txt') } ],
  hints: ['touch ideas.txt', 'echo "my first note" > notes.txt', 'cat notes.txt'],
  solution: ['touch ideas.txt', 'ls', 'echo "my first note" > notes.txt', 'cat notes.txt'] });

function projDirs(e) { return Object.keys(e.fs).filter(p => e.fs[p].d && p.endsWith('/my-project')); }

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

add({ id: 'log', ch: 1, title: 'Time Travel Log', xp: 100,
  lesson: [{ h: 'Every commit is remembered', p: 'A repo remembers every snapshot: who made it, when, and the message. <b>git log</b> lists them newest first. <b>git show</b> opens one snapshot to see exactly what changed.',
    viz: row(cm('Ada', 'blue'), arr(), cm('Linus', 'blue'), arr(), cm('Grace', 'blue'), flag('HEAD → main', 'green')),
    cmds: [['git log', 'full history (newest first)'], ['git log --oneline', 'one short line per commit'], ['git show', 'what changed in the latest commit'], ['git show <id>', 'what changed in any commit (copy an ID from the log)']] }],
  story: 'Your team has been cooking. Read the recipe repo’s history like a time traveller.',
  setup(e) { base(e); const r = repo(e, '~/recipes'); e.cwd = r.root;
    commit(e, r, 'Add pancake recipe', { 'pancakes.md': '# Pancakes\n- 2 eggs\n- 1 cup flour\n' }, null, A.ada);
    commit(e, r, 'Add milk to pancakes', { 'pancakes.md': '# Pancakes\n- 2 eggs\n- 1 cup flour\n- 1 cup milk\n' }, null, A.linus);
    commit(e, r, 'Add waffles', { 'waffles.md': '# Waffles\n- 2 eggs\n' }, null, A.grace); },
  goals: [
    { t: 'See the full history: git log', ok: e => ran(e, /^git log\s*$/) },
    { t: 'See the short version: git log --oneline', ok: e => ran(e, /^git log.*--oneline/) },
    { t: 'Open a commit with git show', ok: e => ran(e, /^git show\b/) } ],
  hints: ['git log', 'git log --oneline', 'git show (or git show <id> with an ID from the log)'],
  solution: ['git log', 'git log --oneline', 'git show'] });

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
    { t: 'Check which branch you are on (git branch or git status)', ok: e => ran(e, /^git (branch|status)\s*$/) },
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


// ======================= PRACTICE DRILLS (same commands, more moving around) =======================
const H = '/home/you';
const drill = l => { l.drill = true; add(l); };
function addsOnly(e, id, file) { const c = e.commits[id]; if (!c || c.parents.length !== 1) return false; const p = e.tree(c.parents[0]), t = c.tree; const added = Object.keys(t).filter(k => !(k in p)); return added.length === 1 && added[0] === file && Object.keys(p).every(k => t[k] === p[k]); }
function branchNames(e) { const s = new Set(); e.history.forEach(h => { const m = h.match(/git (?:switch -c|checkout -b|branch) ([A-Za-z0-9][\w\/.-]*)/); if (m) s.add(m[1]); }); return s; }
const countRan = (e, re) => e.history.filter(h => re.test(h)).length;
const anyCommitHas = (e, r, file) => r && Object.values(r.branches).some(id => [...e.ancestors(id)].some(x => file in e.commits[x].tree));

// ---- World 1 ----
drill({ id: 'maze', ch: 0, title: 'Folder Maze', xp: 150,
  lesson: [{ h: 'Practice: moving around fast', p: 'Real projects are folders inside folders. You can jump several levels in one <b>cd</b>, climb back with <b>..</b>, and get home from anywhere with <b>~</b>.',
    viz: row(blk('~', 'gray'), arr(), blk('school/', 'purple'), arr(), blk('science/', 'purple'), arr(), blk('lab/', 'purple'), arr(), blk('secret/', 'purple'), arr(), blk('treasure.txt', 'yellow')) + row(blk('cd ../../..', 'blue'), arr('climbs 3 levels'), blk('school/', 'purple')),
    cmds: [['cd school/science/lab', 'go down several folders at once'], ['cd ../..', 'go up two folders'], ['cd ~', 'teleport home from anywhere'], ['ls <folder>', 'peek inside a folder without entering it'], ['tree', 'see every folder at once'], ['pwd', 'lost? ask where you are']] }],
  story: 'The school folder is a maze. Find the hidden treasure, then leave homework and notes in the right rooms — and make it back home.',
  setup(e) { base(e); e.write(H + '/school/README.txt', 'The treasure is hidden in science → lab → secret.\n'); e.write(H + '/school/science/lab/secret/treasure.txt', '🏆 You found it! The secret word is: COMMIT\n'); e.mkdirp(H + '/school/math'); e.write(H + '/school/art/drawing.txt', '(a very nice cat)\n'); e.write(H + '/school/science/lab/beaker.txt', 'H2O\n'); },
  goals: [
    { t: 'Read treasure.txt hidden deep in school/science', ok: e => ran(e, /^cat\b.*treasure/) },
    { t: 'Create a history folder inside school', ok: e => e.isDir(H + '/school/history') },
    { t: 'Write notes.txt inside school/history', ok: e => (e.read(H + '/school/history/notes.txt') || '').trim().length > 0 },
    { t: 'Write homework.txt inside school/math', ok: e => (e.read(H + '/school/math/homework.txt') || '').trim().length > 0 },
    { t: 'Finish back in your home folder (~)', ok: e => e.cwd === H && !!e.read(H + '/school/math/homework.txt') && !!e.read(H + '/school/history/notes.txt') } ],
  hints: ['tree shows the whole maze', 'cd school/science/lab/secret then cat treasure.txt', 'cd ../../.. climbs back to school', 'cd ~ goes home'],
  solution: ['tree', 'cd school/science/lab/secret', 'cat treasure.txt', 'cd ../../..', 'mkdir history', 'echo "Notes about ancient Rome" > history/notes.txt', 'cd math', 'echo "2 + 2 = 4" > homework.txt', 'cd ~'] });

// ---- World 2 ----
drill({ id: 'hopper', ch: 1, title: 'Project Hopper', xp: 200,
  lesson: [{ h: 'Practice: one laptop, many repos', p: 'Each project folder is its own repository with its own history. Git only sees the repo you are standing in, so always check <b>where you are</b> before you add and commit.',
    viz: row(zone('~/blog', 'z1', blk('post1.md', 'red')), zone('~/game', 'z1', blk('game.txt', 'orange')), zone('~/notes', 'z1', blk('todo.txt', 'gray'))) + row(blk('cd ../game', 'blue'), arr('hop'), blk('git status', 'purple'), arr(), blk('add + commit', 'green')),
    cmds: [['cd ../<project>', 'hop sideways into a neighbour folder'], ['git status', 'which repo? which branch? what changed?'], ['git add <file>', 'stage just what you want'], ['git commit -am "msg"', 'commit all changes to tracked files'], ['git init', 'start a repo in a folder that isn’t one yet']] }],
  story: 'Three projects need saving: commit the first blog post (not the draft!), the game update, and start tracking your notes.',
  setup(e) { base(e); const b = repo(e, '~/blog'); commit(e, b, 'Create blog', { 'index.md': '# My Blog\n' }); e.write(b.root + '/post1.md', '# Hello, world!\n'); e.write(b.root + '/post2-draft.md', 'unfinished thoughts…\n');
    const g = repo(e, '~/game'); commit(e, g, 'Create game', { 'game.txt': 'PLAYER: @\n' }); e.write(g.root + '/game.txt', 'PLAYER: @\nLEVEL: 2\n');
    e.write(H + '/notes/todo.txt', '- learn git\n- practice git\n'); },
  goals: [
    { t: '~/blog: commit post1.md — but NOT the draft', ok: e => { const t = headT(e, R(e, '~/blog')); return 'post1.md' in t && !('post2-draft.md' in t); } },
    { t: '~/game: commit the change to game.txt', ok: e => /LEVEL: 2/.test(headT(e, R(e, '~/game'))['game.txt'] || '') },
    { t: '~/notes: make it a repo and commit todo.txt', ok: e => 'todo.txt' in headT(e, R(e, '~/notes')) },
    { t: 'End back home in ~', ok: e => e.cwd === H && 'todo.txt' in headT(e, R(e, '~/notes')) && /LEVEL: 2/.test(headT(e, R(e, '~/game'))['game.txt'] || '') && 'post1.md' in headT(e, R(e, '~/blog')) } ],
  hints: ['cd blog → git add post1.md → git commit -m "First post"', 'cd ../game → git commit -am "Level 2"', 'cd ../notes → git init → git add todo.txt → git commit -m "Add todo"', 'cd ~'],
  solution: ['cd blog', 'git status', 'git add post1.md', 'git commit -m "Add first post"', 'cd ../game', 'git status', 'git commit -am "Add level 2"', 'cd ../notes', 'git init', 'git add todo.txt', 'git commit -m "Add todo list"', 'cd ~'] });

drill({ id: 'marathon', ch: 1, title: 'Commit Marathon', xp: 200,
  lesson: [{ h: 'Practice: the commit rhythm', p: 'Pros make many small commits — one idea each. The rhythm is always the same: <b>edit → add → commit</b>. Do it five times and it becomes muscle memory.',
    viz: row(blk('edit', 'orange'), arr(), blk('git add', 'green'), arr(), blk('git commit', 'blue')) + row(cm('Mon', 'blue'), arr(), cm('Tue', 'blue'), arr(), cm('Wed', 'blue'), arr(), cm('Thu', 'blue'), arr(), cm('Fri', 'blue')),
    cmds: [['echo "text" > file', 'edit (create) a file'], ['git add <file>', 'stage it'], ['git commit -m "msg"', 'save the snapshot'], ['git log --oneline', 'admire your streak']] }],
  story: 'Keep a coding diary for a week: one file per weekday, each saved in its OWN commit.',
  setup(e) { base(e); const r = repo(e, '~/diary'); e.cwd = r.root; commit(e, r, 'Start diary', { 'README.md': '# My dev diary\n' }); },
  goals: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(d => ({ t: 'Commit ' + d + '.txt in its own commit', ok: e => { const r = R(e, '~/diary'); return !!r && [...e.ancestors(e.headId(r))].some(id => addsOnly(e, id, d + '.txt')); } }))
    .concat([{ t: 'Working tree clean at the end', ok: e => { const r = R(e, '~/diary'); return clean(e, r) && e.ancestors(e.headId(r)).size >= 6; } }]),
  hints: ['echo "Learned git add" > monday.txt', 'git add monday.txt then git commit -m "Monday entry"', 'Repeat for tuesday … friday — one commit each!'],
  solution: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].flatMap(d => ['echo "Dear diary, today is ' + d + '" > ' + d.toLowerCase() + '.txt', 'git add ' + d.toLowerCase() + '.txt', 'git commit -m "' + d + ' entry"']).concat(['git log --oneline']) });

drill({ id: 'cleanup', ch: 1, title: 'Spring Cleaning', xp: 250,
  lesson: [{ h: 'Practice: fixing mistakes in three repos', p: 'Same undo moves, three different projects. Hop in, run <b>git status</b>, and it will literally tell you which command fixes things.',
    viz: row(zone('~/shop', 'z1', blk('app.js 💥', 'orange')), zone('~/website', 'z1', blk('passwords.txt', 'green')), zone('~/photos', 'z1', blk('cover.txt ✖', 'gray'), blk('album.txt', 'red'))),
    cmds: [['git restore <file>', 'undo edits / bring back a deleted file'], ['git restore --staged <file>', 'unstage'], ['echo "name" > .gitignore', 'ignore a file forever'], ['git add · git commit', 'save the fix']] }],
  story: 'Three repos, three messes: a scrambled app.js in ~/shop, a staged passwords.txt in ~/website, and a deleted cover.txt in ~/photos (plus a new album to commit).',
  setup(e) { base(e);
    const s = repo(e, '~/shop'); commit(e, s, 'Create shop', { 'app.js': 'sell()\n', 'prices.txt': 'apple 1\n' }); e.write(s.root + '/app.js', 's3ll(((#!!\n');
    const w = repo(e, '~/website'); commit(e, w, 'Create website', { 'index.html': '<h1>Hi</h1>\n' }); e.write(w.root + '/passwords.txt', 'admin:hunter2\n'); w.index['passwords.txt'] = 'admin:hunter2\n';
    const p = repo(e, '~/photos'); commit(e, p, 'Add cover', { 'cover.txt': '🖼 cover photo\n' }); e.setWork(p, 'cover.txt', undefined); e.write(p.root + '/album.txt', 'summer pics\n'); },
  goals: [
    { t: '~/shop: app.js back to normal', ok: e => e.read(H + '/shop/app.js') === 'sell()\n' },
    { t: '~/website: passwords.txt unstaged', ok: e => { const r = R(e, '~/website'); return !('passwords.txt' in r.index); } },
    { t: '~/website: commit a .gitignore that ignores passwords.txt', ok: e => { const r = R(e, '~/website'); const t = headT(e, r); return /passwords\.txt/.test(t['.gitignore'] || '') && ![...e.ancestors(e.headId(r))].some(id => 'passwords.txt' in e.commits[id].tree); } },
    { t: '~/photos: bring back cover.txt and commit album.txt', ok: e => { const t = headT(e, R(e, '~/photos')); return e.isFile(H + '/photos/cover.txt') && 'album.txt' in t && 'cover.txt' in t; } } ],
  hints: ['cd shop && git restore app.js', 'cd ../website && git restore --staged passwords.txt', 'echo "passwords.txt" > .gitignore, then add + commit .gitignore', 'cd ../photos && git restore cover.txt && git add album.txt && git commit -m "Add album"'],
  solution: ['cd shop', 'git status', 'git restore app.js', 'cd ../website', 'git status', 'git restore --staged passwords.txt', 'echo "passwords.txt" > .gitignore', 'git add .gitignore', 'git commit -m "Ignore passwords file"', 'cd ../photos', 'git status', 'git restore cover.txt', 'git add album.txt', 'git commit -m "Add summer album"'] });

// ---- World 3 ----
drill({ id: 'juggler', ch: 2, title: 'Branch Juggler', xp: 250,
  lesson: [{ h: 'Practice: branch → commit → merge, three times', p: 'Every feature gets its own branch. When it’s done: back to main, merge, delete the branch. Repeat until it feels boring — that’s when you’ve mastered it.',
    viz: row(flag('main', 'green'), arr('switch -c'), flag('drums', 'purple'), arr('commit'), cm('🥁', 'purple'), arr('switch main · merge'), flag('main', 'green')),
    cmds: [['git switch -c <branch>', 'new branch and jump on it'], ['git switch main', 'back to main'], ['git merge <branch>', 'bring the work in'], ['git branch -d <branch>', 'tidy up'], ['git branch', 'list branches']] }],
  story: 'Your band song needs drums, guitar and vocals — record each part on its own branch, merge them all into main, and clean up.',
  setup(e) { base(e); const r = repo(e, '~/band'); e.cwd = r.root; commit(e, r, 'Start the song', { 'setlist.txt': '1. Intro\n' }); },
  goals: [
    { t: 'main has drums.txt', ok: e => 'drums.txt' in (brT(e, R(e, '~/band'), 'main') || {}) },
    { t: 'main has guitar.txt', ok: e => 'guitar.txt' in (brT(e, R(e, '~/band'), 'main') || {}) },
    { t: 'main has vocals.txt', ok: e => 'vocals.txt' in (brT(e, R(e, '~/band'), 'main') || {}) },
    { t: 'Each part made on its own branch (3 branches, 3 merges)', ok: e => branchNames(e).size >= 3 && countRan(e, /^git merge /) >= 3 },
    { t: 'Clean up: only main is left', ok: e => { const r = R(e, '~/band'); const t = brT(e, r, 'main') || {}; return Object.keys(r.branches).join() === 'main' && ['drums.txt', 'guitar.txt', 'vocals.txt'].every(f => f in t); } } ],
  hints: ['git switch -c drums → echo "boom" > drums.txt → add → commit', 'git switch main → git merge drums → git branch -d drums', 'Repeat for guitar and vocals'],
  solution: [['drums', 'boom tss'], ['guitar', 'twang'], ['vocals', 'la la la']].flatMap(([b, s]) => ['git switch -c ' + b, 'echo "' + s + '" > ' + b + '.txt', 'git add ' + b + '.txt', 'git commit -m "Record ' + b + '"', 'git switch main', 'git merge ' + b, 'git branch -d ' + b]).concat(['git log --oneline']) });

drill({ id: 'twinrepos', ch: 2, title: 'Two Repos, Two Features', xp: 250,
  lesson: [{ h: 'Practice: branches in different projects', p: 'Branches belong to ONE repository. A branch you make in ~/web doesn’t exist in ~/api. Hop between them and run the same branch → commit → merge routine in each.',
    viz: row(zone('~/web', 'z1', flag('main', 'green'), flag('feature/dark-mode', 'purple')), zone('~/api', 'z1', flag('main', 'green'), flag('feature/login', 'purple'))),
    cmds: [['cd ../<repo>', 'hop to the other project'], ['git branch', 'branches of THIS repo only'], ['git switch -c feature/<name>', 'start a feature'], ['git merge feature/<name>', 'finish it from main']] }],
  story: 'Ship dark mode in the web repo and a login endpoint in the api repo — each on a feature branch, each merged into its own main.',
  setup(e) { base(e); const w = repo(e, '~/web'); commit(e, w, 'Create website', { 'index.html': '<h1>App</h1>\n', 'style.css': 'body{}\n' }); const a = repo(e, '~/api'); commit(e, a, 'Create API', { 'server.js': 'listen(8080)\n' }); },
  goals: [
    { t: '~/web: commit dark.css on branch feature/dark-mode', ok: e => ran(e, /feature\/dark-mode/) && anyCommitHas(e, R(e, '~/web'), 'dark.css') },
    { t: '~/web: merge it into main', ok: e => 'dark.css' in (brT(e, R(e, '~/web'), 'main') || {}) },
    { t: '~/api: commit login.js on branch feature/login', ok: e => ran(e, /feature\/login/) && anyCommitHas(e, R(e, '~/api'), 'login.js') },
    { t: '~/api: merge it into main', ok: e => 'login.js' in (brT(e, R(e, '~/api'), 'main') || {}) } ],
  hints: ['cd web && git switch -c feature/dark-mode', 'echo "body{background:#000}" > dark.css, add, commit, git switch main, git merge feature/dark-mode', 'cd ../api and repeat with feature/login and login.js'],
  solution: ['cd web', 'git switch -c feature/dark-mode', 'echo "body { background: #000; }" > dark.css', 'git add dark.css', 'git commit -m "Add dark mode"', 'git switch main', 'git merge feature/dark-mode', 'cd ../api', 'git switch -c feature/login', 'echo "route(/login)" > login.js', 'git add login.js', 'git commit -m "Add login endpoint"', 'git switch main', 'git merge feature/login'] });

// ---- World 4 ----
drill({ id: 'morning', ch: 3, title: 'Morning Sync', xp: 300,
  lesson: [{ h: 'Practice: the start-of-day routine', p: 'Every morning, visit each repo: <b>fetch</b> to see what teammates did, <b>status</b> to read ahead/behind, then <b>pull</b> or <b>push</b>. Remember: git status only knows what you last fetched.',
    viz: row(blk('git fetch', 'purple'), arr(), blk('git status', 'yellow'), arr('behind?'), blk('git pull', 'green'), arr('ahead?'), blk('git push', 'blue')),
    cmds: [['git fetch', 'download news from GitHub'], ['git status', 'ahead / behind / up to date'], ['git pull', 'get teammates’ commits'], ['git push', 'send yours']] }],
  story: 'Good morning! Teammates pushed to web and docs overnight, and you left an unpushed commit in api yesterday. Sync all three repos.',
  setup(e) { base(e, { auth: true });
    for (const n of ['web', 'docs', 'api']) { gh(e, 'you/' + n, [['Create ' + n, { 'README.md': '# ' + n + '\n' }, null, A.you]]); clone(e, 'you/' + n, '~/' + n); }
    e.ghCommit('you/web', 'main', 'Add navbar', { 'nav.html': '<nav></nav>\n' }, null, A.sam);
    e.ghCommit('you/docs', 'main', 'Write FAQ', { 'faq.md': '# FAQ\n' }, null, A.grace);
    commit(e, R(e, '~/api'), 'Add health check', { 'health.js': 'ok()\n' }); },
  goals: [
    { t: '~/web: pull Sam’s navbar', ok: e => { const r = R(e, '~/web'); return r.branches.main === e.gh['you/web'].branches.main; } },
    { t: '~/docs: pull Grace’s FAQ', ok: e => { const r = R(e, '~/docs'); return r.branches.main === e.gh['you/docs'].branches.main; } },
    { t: '~/api: push your health check', ok: e => 'health.js' in (ghT(e, 'you/api') || {}) },
    { t: 'Check status in each repo (git status ×3)', ok: e => countRan(e, /^git status/) >= 3 } ],
  hints: ['cd web → git fetch → git status → git pull', 'cd ../docs → same routine', 'cd ../api → git status says “ahead by 1” → git push'],
  solution: ['cd web', 'git fetch', 'git status', 'git pull', 'cd ../docs', 'git fetch', 'git status', 'git pull', 'cd ../api', 'git status', 'git push'] });

drill({ id: 'publishall', ch: 3, title: 'Ship It Thrice', xp: 300,
  lesson: [{ h: 'Practice: putting projects online', p: 'Same moves, three projects: create the GitHub repo, connect it, push. Use the long way once and the gh shortcut for the others — and remember private repos for things only you should see.',
    viz: row(zone('💻', 'z1', blk('calculator', 'blue'), blk('todo-app', 'blue'), blk('old-notes', 'blue')), arr('push ⇧'), zone('☁', 'z3', blk('🌍 public', 'green'), blk('🌍 public', 'green'), blk('🔒 private', 'orange'))),
    cmds: [['gh repo create <name> --public', 'create on GitHub'], ['git remote add origin <url>', 'connect'], ['git push -u origin main', 'upload + remember upstream'], ['gh repo create <name> --private --source=. --push', 'all three steps in one']] }],
  story: 'Publish calculator and todo-app publicly, and back up old-notes as a PRIVATE repo.',
  setup(e) { base(e, { auth: true }); for (const [n, f] of [['calculator', 'calc.js'], ['todo-app', 'todo.js'], ['old-notes', 'notes.md']]) { const r = repo(e, '~/' + n); commit(e, r, 'Create ' + n, { [f]: '// ' + n + '\n' }); } },
  goals: [['calculator', 'public'], ['todo-app', 'public'], ['old-notes', 'private']].map(([n, v]) => ({ t: n + ' on GitHub (' + v + '), main pushed with upstream', ok: e => { const g = G(e, 'you/' + n), r = R(e, '~/' + n); return !!g && g.vis === v && g.branches.main === r.branches.main && r.upstream.main === 'origin/main'; } })),
  hints: ['cd calculator → gh repo create calculator --public → git remote add origin https://github.com/you/calculator.git → git push -u origin main', 'Shortcut: gh repo create todo-app --public --source=. --push', 'old-notes needs --private'],
  solution: ['cd calculator', 'gh repo create calculator --public', 'git remote add origin https://github.com/you/calculator.git', 'git push -u origin main', 'cd ../todo-app', 'gh repo create todo-app --public --source=. --push', 'cd ../old-notes', 'gh repo create old-notes --private --source=. --push', 'gh repo list'] });

drill({ id: 'collector', ch: 3, title: 'Clone Collector', xp: 250,
  lesson: [{ h: 'Practice: organising clones', p: 'Keep your clones tidy in one folder (many devs use ~/code). <b>git clone</b> always creates the new folder inside the folder you are standing in.',
    viz: row(blk('~/code/', 'purple'), arr('git clone ×3'), blk('cheatsheets/', 'blue'), blk('examples/', 'blue'), blk('starter/', 'blue')),
    cmds: [['mkdir code && cd code', 'make a home for clones'], ['git clone <url>', 'download a repo here'], ['cd <repo>', 'enter it'], ['git switch <branch>', 'check out a remote branch']] }],
  story: 'Octo Academy gave you three repos. Collect them all inside ~/code, then open the solutions branch of starter.',
  setup(e) { base(e); gh(e, 'octo-academy/cheatsheets', [['Add cheatsheet', { 'git.md': '# Git cheatsheet\n' }]]); gh(e, 'octo-academy/examples', [['Add examples', { 'hello.sh': 'echo hi\n' }]]); gh(e, 'octo-academy/starter', [['Starter project', { 'TODO.md': '- build it\n' }]]); ghBranch(e, 'octo-academy/starter', 'solutions', 'main', [['Add solutions', { 'SOLUTION.md': 'here you go\n' }]]); },
  goals: [
    { t: 'Clone cheatsheets into ~/code', ok: e => !!R(e, '~/code/cheatsheets') },
    { t: 'Clone examples into ~/code', ok: e => !!R(e, '~/code/examples') },
    { t: 'Clone starter into ~/code', ok: e => !!R(e, '~/code/starter') },
    { t: 'In starter, switch to the solutions branch', ok: e => { const r = R(e, '~/code/starter'); return !!r && r.head.branch === 'solutions'; } } ],
  hints: ['mkdir code && cd code', 'git clone https://github.com/octo-academy/cheatsheets.git (then examples, starter)', 'cd starter && git switch solutions'],
  solution: ['mkdir code', 'cd code', 'git clone https://github.com/octo-academy/cheatsheets.git', 'git clone https://github.com/octo-academy/examples.git', 'git clone https://github.com/octo-academy/starter.git', 'ls', 'cd starter', 'git branch -a', 'git switch solutions'] });

drill({ id: 'prrush', ch: 3, title: 'Pull Request Rush', xp: 350,
  lesson: [{ h: 'Practice: two PRs back to back', p: 'The PR loop again, twice in a row: branch → commit → push → PR → merge. After each merge you land back on an up-to-date main, ready for the next feature.',
    viz: row(flag('main', 'green'), arr(), flag('feature/about', 'purple'), arr('PR #1'), flag('main', 'green'), arr(), flag('feature/contact', 'purple'), arr('PR #2'), flag('main', 'green')),
    cmds: [['git switch -c feature/<name>', 'start'], ['git push -u origin feature/<name>', 'publish'], ['gh pr create --title "…" --body "…"', 'propose'], ['gh pr merge --merge --delete-branch', 'merge + clean up']] }],
  story: 'Ship an About page and a Contact page to team-app — each through its own pull request.',
  setup(e) { base(e, { auth: true }); gh(e, 'you/team-app', [['Create team app', { 'index.html': '<h1>Team App</h1>\n' }, null, A.you]]); const r = clone(e, 'you/team-app', '~/team-app'); e.cwd = r.root; },
  goals: [
    { t: 'PR with about.html merged', ok: e => G(e, 'you/team-app').prs.some(p => p.state === 'MERGED' && 'about.html' in e.tree(p.mergeCommit)) },
    { t: 'PR with contact.html merged', ok: e => G(e, 'you/team-app').prs.some(p => p.state === 'MERGED' && 'contact.html' in e.tree(p.mergeCommit)) },
    { t: 'Local main matches GitHub main', ok: e => { const r = R(e, '~/team-app'); const g = G(e, 'you/team-app'); return r.branches.main === g.branches.main && 'contact.html' in (ghT(e, 'you/team-app') || {}) && 'about.html' in (ghT(e, 'you/team-app') || {}); } },
    { t: 'No leftover feature branches (local or GitHub)', ok: e => { const r = R(e, '~/team-app'); const g = G(e, 'you/team-app'); return Object.keys(r.branches).join() === 'main' && Object.keys(g.branches).join() === 'main' && g.prs.filter(p => p.state === 'MERGED').length >= 2; } } ],
  hints: ['git switch -c feature/about, create about.html, add, commit', 'git push -u origin feature/about → gh pr create … → gh pr merge --merge --delete-branch', 'Then the same for feature/contact'],
  solution: [['about', 'About us'], ['contact', 'Contact us']].flatMap(([n, t]) => ['git switch -c feature/' + n, 'echo "<h1>' + t + '</h1>" > ' + n + '.html', 'git add ' + n + '.html', 'git commit -m "Add ' + n + ' page"', 'git push -u origin feature/' + n, 'gh pr create --title "Add ' + n + ' page" --body "New ' + n + ' page"', 'gh pr merge --merge --delete-branch']).concat(['git log --oneline']) });

// ---- World 5 ----
drill({ id: 'tagteam', ch: 4, title: 'Tag Team', xp: 300,
  lesson: [{ h: 'Practice: versioning two projects', p: 'Tagging is the same routine in every repo: decide the version, tag, push the tag. A <b>0.x</b> version means “early, may still change”.',
    viz: row(zone('~/calc-app', 'z1', cm('…', 'blue'), flag('🏷 v1.2.0', 'yellow')), zone('~/todo-app', 'z1', cm('…', 'blue'), flag('🏷 v0.1.0', 'yellow'))),
    cmds: [['git tag -a v1.2.0 -m "msg"', 'annotated tag on HEAD'], ['git push --tags', 'push all tags'], ['git push origin <tag>', 'push one tag'], ['gh release create <tag> --title … --notes …', 'publish a release']] }],
  story: 'Release day for two apps: tag calc-app as v1.2.0 and publish a GitHub release, then tag todo-app’s first preview as v0.1.0.',
  setup(e) { base(e, { auth: true }); gh(e, 'you/calc-app', [['Create calculator', { 'calc.js': 'add\n' }, null, A.you], ['Add history', { 'calc.js': 'add\nhistory\n' }, null, A.you]]); gh(e, 'you/todo-app', [['Create todo app', { 'todo.js': 'list\n' }, null, A.you]]); clone(e, 'you/calc-app', '~/calc-app'); clone(e, 'you/todo-app', '~/todo-app'); },
  goals: [
    { t: 'calc-app: annotated tag v1.2.0 on the latest commit, on GitHub', ok: e => { const g = G(e, 'you/calc-app'); const t = g.tags['v1.2.0']; return !!t && t.annot && t.id === g.branches.main; } },
    { t: 'calc-app: GitHub release v1.2.0', ok: e => G(e, 'you/calc-app').releases.some(x => x.tag === 'v1.2.0') },
    { t: 'todo-app: annotated tag v0.1.0, on GitHub', ok: e => { const t = G(e, 'you/todo-app').tags['v0.1.0']; return !!t && t.annot; } } ],
  hints: ['cd calc-app → git tag -a v1.2.0 -m "Version 1.2.0" → git push --tags', 'gh release create v1.2.0 --title "v1.2.0" --notes "History panel"', 'cd ../todo-app → git tag -a v0.1.0 -m "First preview" → git push origin v0.1.0'],
  solution: ['cd calc-app', 'git tag -a v1.2.0 -m "Version 1.2.0"', 'git push --tags', 'gh release create v1.2.0 --title "v1.2.0" --notes "Adds a history panel"', 'cd ../todo-app', 'git tag -a v0.1.0 -m "First preview"', 'git push origin v0.1.0'] });

// keep each world's stages together (stable sort), practice drills at the end of their world
LV.sort((a, b) => a.ch - b.ch);

// plain-language 'what this stage teaches' (shown before any commands)
const LEARN = {
 "terminal": [
  "The terminal is a window where you type instructions to your computer instead of clicking.",
  "First skill: find out which folder you are in, and what is inside it."
 ],
 "walk": [
  "Folders sit inside other folders, like boxes inside boxes.",
  "You'll learn to walk into a folder, step back out, and jump home from anywhere."
 ],
 "read": [
  "Files hold text, like notes or recipes.",
  "You'll learn to open a file and read it right in the terminal, without any app."
 ],
 "mkdir": [
  "Every project lives in its own folder.",
  "You'll learn to create new folders with one short command."
 ],
 "files": [
  "Now you'll make files inside your folder.",
  "You'll create an empty file, write a sentence into another one, and read it back."
 ],
 "maze": [
  "Practice round: no new commands!",
  "You'll move through folders inside folders and leave files in the right places. Speed comes from repetition."
 ],
 "config": [
  "Git is a time machine for your files: it remembers every version you save.",
  "Before using it, you tell Git your name and email, so every save is signed by you."
 ],
 "init": [
  "A normal folder becomes a Git project (a “repository”) with one command.",
  "After that, Git can start remembering the history of every file inside it."
 ],
 "stage": [
  "Git doesn't save everything automatically. You choose what goes into each save.",
  "You'll learn to put files into the “staging area”, like packing a box before you seal it."
 ],
 "commit": [
  "A commit is a saved snapshot of your project, with a short message saying what changed.",
  "You'll make your first commits, the most important habit in Git."
 ],
 "log": [
  "Git keeps a diary of every snapshot: who made it, when, and why.",
  "You'll learn to read that history and open any old snapshot."
 ],
 "history": [
  "Something went wrong in a file. Who changed it, and when?",
  "You'll use Git like a detective to find who wrote each line, then fix the mistake and save it."
 ],
 "restore": [
  "Made a mess you haven't saved yet? No problem.",
  "You'll learn to undo changes to a file, bring back a deleted file, and take a file out of the staging box."
 ],
 "gitignore": [
  "Some files should never be saved in Git, like passwords or huge downloads.",
  "You'll make a list of files for Git to ignore, so they can never leak by accident."
 ],
 "hopper": [
  "Practice round: three projects, one laptop.",
  "Each folder is its own repository, so you'll hop between them and save in each one."
 ],
 "marathon": [
  "Practice round: small, frequent saves.",
  "You'll repeat edit → add → commit five times until it feels automatic."
 ],
 "cleanup": [
  "Practice round: three projects, three messes.",
  "You'll use the undo commands you already know to clean each one up."
 ],
 "branch": [
  "A branch is a parallel copy of your project where you can try ideas safely.",
  "The main version stays untouched while you experiment on your branch."
 ],
 "ffmerge": [
  "Your experiment worked! Now bring it back into the main version.",
  "That's called merging. When main hasn't changed, Git just moves it forward."
 ],
 "merge3": [
  "Sometimes main AND your branch both changed.",
  "Git combines them with a special “merge commit” that joins the two timelines."
 ],
 "conflict": [
  "Two people changed the SAME line, so Git can't decide which one wins.",
  "You'll open the file, choose the final version yourself, and finish the merge. This is the boss fight!"
 ],
 "rebase": [
  "Rebase is another way to combine work: it moves your commits on top of the latest main.",
  "The result is one clean, straight history line, with no merge bubble."
 ],
 "stash": [
  "You're halfway through something and need to switch tasks right now.",
  "Stash puts your unfinished work in a pocket so you can come back to it later."
 ],
 "revert": [
  "Two ways to fix saved mistakes: amend changes your very last commit.",
  "Revert safely undoes an older commit by adding a new “opposite” commit."
 ],
 "reset": [
  "Reset moves your project back to an earlier snapshot, as if the newer ones never happened.",
  "If you go too far, the reflog is Git's safety net that remembers everything."
 ],
 "cherry": [
  "A messy branch has one really good commit.",
  "Cherry-pick copies just that single commit onto your branch, and leaves the rest behind."
 ],
 "juggler": [
  "Practice round: make a branch, commit, merge, delete it. Three times in a row.",
  "This is the everyday rhythm of working with branches."
 ],
 "twinrepos": [
  "Practice round: each project has its own branches.",
  "You'll do the same branch-and-merge routine in two different projects."
 ],
 "publish": [
  "So far everything was only on your laptop.",
  "GitHub is a website that keeps an online copy of your project. You'll log in, create it there, and upload (push) your work."
 ],
 "clone": [
  "Want someone else's project on your laptop?",
  "Cloning downloads the whole thing, with every file and every saved version."
 ],
 "sync": [
  "When you work in a team, others upload changes too.",
  "You'll download their work (fetch and pull) before uploading yours (push), so nobody's work gets lost."
 ],
 "ssh": [
  "An SSH key is like a secret key card for your laptop.",
  "Once GitHub knows your key, it recognises your laptop without a password."
 ],
 "pr": [
  "On real teams, nobody uploads straight to main.",
  "You'll propose your change as a Pull Request, which teammates can review and then merge."
 ],
 "fork": [
  "You can't upload to a project you don't own, but you can still help!",
  "Fork makes your own copy on GitHub. Then you send your change back as a Pull Request. This is how open source works."
 ],
 "mirror": [
  "Sometimes a project needs a new home or a new name.",
  "You'll copy it completely, with every branch and every version, then delete the old one."
 ],
 "docs": [
  "Good projects explain themselves.",
  "You'll write the standard files every project needs (README, LICENSE, CONTRIBUTING, CHANGELOG), and use Issues as a to-do list."
 ],
 "morning": [
  "Practice round: your start-of-day routine.",
  "Check three projects, download what teammates did overnight, and upload what you forgot yesterday."
 ],
 "publishall": [
  "Practice round: put three projects online.",
  "Two will be public, so everyone can see them. One will be private, just for you."
 ],
 "collector": [
  "Practice round: keep your downloads organised.",
  "You'll clone three projects into one tidy folder and open a branch in one of them."
 ],
 "prrush": [
  "Practice round: two Pull Requests back to back.",
  "Branch → commit → push → PR → merge. Do it twice until it's easy."
 ],
 "semver": [
  "Version numbers like 2.4.1 have a meaning: big change . new feature . bug fix.",
  "You'll learn which number to bump, and how to stick a version label (a tag) on a commit."
 ],
 "release": [
  "A release is how you ship a new version to the world.",
  "Update the version number and the changelog, tag it, and publish a release page on GitHub."
 ],
 "tagteam": [
  "Practice round: release day for two apps.",
  "You'll tag versions and push them for two different projects."
 ],
 "ci": [
  "GitHub Actions are robots that run every time you upload.",
  "You'll add a robot that tests your code automatically, watch it catch a bug, then fix it until it turns green."
 ],
 "pages": [
  "The final boss: turn your project into a real website with its own address.",
  "A GitHub robot will build and publish it every time you upload. Everything you've learned comes together here!"
 ]
};
LV.forEach(l => { if (LEARN[l.id]) l.learn = LEARN[l.id]; });

const SANDBOX = { id: 'sandbox', ch: -1, title: 'Free Play Sandbox', xp: 0, lesson: [], story: 'No rules. Try anything — break things, fix things. A couple of GitHub repos are waiting for you.',
  setup(e) { base(e, { auth: true }); gh(e, 'octo-academy/hello-world', [['Initial commit', { 'README.md': '# Hello World\n' }], ['Add greeting', { 'hello.sh': 'echo hi\n' }]]); const r = repo(e, '~/playground'); e.cwd = r.root; commit(e, r, 'First commit', { 'README.md': '# Playground\n' }); e.write('/home/you/templates/pages.yml', PAGES_YML); e.write('/home/you/templates/ci.yml', CI_YML); },
  goals: [], hints: ['Try: gh repo create playground --public --source=. --push'], solution: [] };

const api = { LV, CH, SANDBOX };
if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.GQ_LEVELS = api;
})(typeof window !== 'undefined' ? window : globalThis);
