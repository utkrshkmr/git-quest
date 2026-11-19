// Right command, wrong place (or a failed command) must NOT complete an objective.
// Run: node tests/location.test.js
const Engine = require('../src/engine.js');
const { LV } = require('../src/levels.js');

const cases = [
  // [stage, commands, goal title (substring), expected]
  ['init', ['git status', 'ls -a'], 'git status', false],
  ['init', ['ls -a'], '.git folder', false],
  ['stage', ['cd ~', 'git status'], 'git status', false],
  ['log', ['cd ~', 'git log', 'git log --oneline', 'git show'], 'full history', false],
  ['log', ['cd ~', 'git log --oneline'], 'short version', false],
  ['history', ['cd ~', 'git blame pancakes.md'], 'culprit', false],
  ['merge3', ['cd ~', 'git branch'], 'which branch', false],
  ['clone', ['git clone https://github.com/octo-academy/hello-world.git', 'git remote -v'], 'remote -v', false],
  ['clone', ['git clone https://github.com/octo-academy/hello-world.git', 'cd hello-world', 'git remote -v'], 'remote -v', true],
  ['sync', ['cd ~', 'git status', 'git fetch'], 'Fetch and inspect', false],
  ['morning', ['cd web', 'git status', 'git status', 'git status'], 'all three repos', false],
  ['morning', ['cd web', 'git status', 'cd ../docs', 'git status', 'cd ../api', 'git status'], 'all three repos', true],
  ['walk', ['cd Docs'], 'Walk into Documents', false],
  ['read', ['cat welcome.txt'], 'welcome.txt', false],
  ['read', ['cat Documents/welcome.txt'], 'welcome.txt', true],
  ['maze', ['cat treasure.txt'], 'treasure', false],
  ['stash', ['cd ~', 'git stash'], 'Stash', false],
  ['reset', ['cd ~', 'git reflog'], 'reflog', false],
  ['juggler', ['git switch -c drums', 'cd ~', 'git switch -c guitar', 'git switch -c vocals'], 'own branch', false],
  ['upstream', ['cd ~', 'git fetch upstream'], 'Fetch from upstream', false],
];

let failed = 0;
for (const [id, cmds, title, want] of cases) {
  const L = LV.find(l => l.id === id); const e = new Engine(); e.realtime = false; L.setup(e);
  cmds.forEach(c => { e.run(c); e.settle(true); });
  const g = L.goals.find(g => g.t.includes(title));
  if (!g) { console.log('NO GOAL', id, title); failed++; continue; }
  const got = !!g.ok(e);
  const ok = got === want; if (!ok) failed++;
  console.log((ok ? 'PASS ' : 'FAIL ') + id.padEnd(10) + ' ' + JSON.stringify(cmds) + ' → "' + g.t + '" = ' + got);
}
console.log(failed ? failed + ' location check(s) FAILED' : 'All location checks pass');
process.exit(failed ? 1 : 0);
