# Contributing to Git Quest

Thanks for helping more people learn Git! 🎮

## Workflow (yes, the one the game teaches)

1. Fork the repo and clone your fork.
2. Create a branch: `git switch -c add-stage-bisect`
3. Make your change. Run `node tests/solutions.test.js` and `python3 build.py`, then open `dist/index.html` to try it.
4. Commit with a clear message, push, and open a pull request.

The CI workflow replays every stage's solution, so a PR that breaks a stage fails its checks.

## Adding a stage

Stages live in `src/levels.js`. Each one is a single object:

```js
add({
  id: 'bisect', ch: 2, title: 'Bug Hunt with Bisect', xp: 300,
  lesson: [{ h: 'Heading', p: 'Short explanation…', viz: row(blk('A', 'blue'), arr('then'), blk('B', 'green')),
             cmds: [['git bisect start', 'what it does']], tip: 'optional pro tip' }],
  story: 'One or two sentences of mission story.',
  setup(e) { base(e); /* build the starting world with repo(), commit(), gh(), clone() … */ },
  goals: [{ t: 'What the player must achieve', ok: e => /* true when done */ true }],
  hints: ['progressively more specific hints'],
  solution: ['the', 'exact commands', 'that solve it'],
});
```

Guidelines:
- **Teach one idea per stage.** Explain it with blocks and arrows (`blk`, `cm`, `flag`, `arr`, `row`, `zone`), not walls of text.
- **Write goals about the end state, not the exact commands.** There are usually several right answers. Check the result, e.g. "main contains score.txt" rather than "ran git merge".
- **Always include a working `solution`.** The test suite runs it.
- **Check where a command ran, not just that it was typed.** Use `did(e, /regex/, '~/repo')`: it only counts commands that succeeded inside that repo or folder. Add a case to `tests/location.test.js` for new stages.
- If a stage needs a git or gh command the simulator doesn't support yet, add it to `src/engine.js`. Keep the output and error messages as close to the real tools as possible.

## Reporting bugs

Open an issue with the stage, the commands you typed, and what you expected. If real git behaves differently from the game, please paste the real output. Matching it is the goal.
