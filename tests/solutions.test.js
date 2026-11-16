// Plays every stage's built-in solution through the simulator and checks that all goals pass.
// Run: node tests/solutions.test.js [stage-id-to-print]
const Engine = require('../src/engine.js');
const { LV, SANDBOX } = require('../src/levels.js');

let failed = 0;
const show = process.argv[2];
for (const L of LV.concat([SANDBOX])) {
  const e = new Engine(); e.realtime = false; L.setup(e);
  const log = [];
  for (const c of L.solution) {
    const r = e.run(c); e.settle(true);
    log.push('$ ' + c);
    r.lines.forEach(x => log.push((x.c === 'err' ? '!! ' : '   ') + (x.parts ? x.parts.map(p => p.t).join('') : x.t)));
  }
  const res = L.goals.map(g => { try { return g.ok(e) === true || !!g.ok(e); } catch (err) { return 'ERR ' + err.message; } });
  const ok = res.every(x => x === true);
  if (!ok) failed++;
  console.log((ok ? 'PASS ' : 'FAIL ') + L.id.padEnd(10) + ' ' + JSON.stringify(res));
  if (!ok || show === L.id) console.log(log.join('\n'));
}
console.log(failed ? `${failed} stage(s) FAILED` : `All ${LV.length} stages pass`);
process.exit(failed ? 1 : 0);
