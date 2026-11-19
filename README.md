# 🕹️ Git Quest

**An arcade game that teaches Git and GitHub, from your very first `ls` to deploying a website with GitHub Actions.**

▶ **Play it free in your browser: https://utkrshkmr.github.io/git-quest/**

Git Quest is for students at any level, high schoolers included, who have never used Git or a terminal. Each stage starts with a short training round that explains the idea with colored blocks and arrows. Then you use those commands right away in a mission.

- **A real terminal feel.** You type real `git` and `gh` commands into a simulated Linux shell. Commands behave like git 2.47 and gh 2.63, including the error messages you'll meet in real life (rejected pushes, merge conflicts, missing permissions…).
- **See what Git is doing.** A live dashboard shows your laptop and GitHub side by side:
  - files are colored tiles moving from **Working → Staging → Commit**
  - commits are blocks joined by arrows, with branch flags and tags
  - dashed wires connect your local repos to their GitHub remotes
- **Nothing to install and nothing to break.** Everything runs in the browser, and the GitHub side is simulated, so no real account is touched.
- **Arcade style.** XP, 1–3 stars per stage (fewer if you use hints or the solution), confetti, and 8-bit sound effects you can mute.

## The 6 worlds / 48 stages

Every stage teaches **one** new idea. 🔁 marks **practice** stages: no new commands, just the same moves in harder situations (hopping between projects, deep folders, many repos at once), so they become muscle memory.

| World | Stages |
|---|---|
| 1 · Terminal Town | `pwd` + `ls` · `cd` · `cat` · `mkdir` · `touch` / `echo` · 🔁 Folder Maze |
| 2 · Local Lab | config · `init` · staging · commits · `log` / `show` · `blame` / `diff` · `restore` · `.gitignore` · 🔁 Project Hopper · 🔁 Commit Marathon · 🔁 Spring Cleaning |
| 3 · Branch Forest | branches · fast-forward · 3-way merge · **merge-conflict boss** · `rebase` · `stash` · `amend` / `revert` · `reset` + `reflog` · `cherry-pick` · 🔁 Branch Juggler · 🔁 Two Repos, Two Features |
| 4 · GitHub City | `gh auth` + push · clone · fetch / pull / rejected pushes · a teammate's branch · SSH keys · pull requests · fork & contribute · keep your fork fresh (`upstream`) · mirror & delete a repo · issues + docs · 🔁 Morning Sync · 🔁 Ship It Thrice · 🔁 Clone Collector · 🔁 Pull Request Rush · 🔁 Fork Keeper |
| 5 · Version Vault | semantic versioning · annotated tags · changelog + GitHub releases · 🔁 Tag Team |
| 6 · Action Castle | GitHub Actions CI catches a real bug · **final boss: deploy a site with GitHub Pages** |

**Stuck?** A yellow 🎯 NEXT bar always shows the next objective. After any wrong command the terminal says where you are and exactly what to type next (click it to paste).

There's also a **Free Play** sandbox.

**Teachers:** link straight to a stage with its id, e.g. [`#stage-conflict`](https://utkrshkmr.github.io/git-quest/#stage-conflict). Progress is saved in the student's own browser.

## Run it locally

```bash
git clone https://github.com/utkrshkmr/git-quest.git
cd git-quest
python3 build.py          # bundles src/ into dist/index.html
open dist/index.html      # or just double-click it
```

No dependencies: plain HTML, CSS and JavaScript. Node is only used for the tests:

```bash
node tests/solutions.test.js   # plays all 48 stages' solutions and checks every goal
node tests/location.test.js    # right command in the wrong folder/repo must NOT count
```

## How it's built

| File | What it does |
|---|---|
| `src/engine.js` | The simulator: a fake filesystem and shell, plus git (commit graph, index, merges, conflicts, rebase, stash, reflog…) and gh (repos, forks, PRs, issues, releases, Actions runs, Pages) |
| `src/levels.js` | All stages: training pages, setup, goals, hints and solutions |
| `src/ui.js` | Dashboard rendering (tiles, commit-graph SVG, wires), terminal, overlays and scoring |
| `src/style.css`, `src/shell.html` | The arcade look and the page shell |
| `build.py` | Inlines everything into one self-contained `dist/index.html` |
| `.github/workflows/pages.yml` | Runs the tests, builds, and deploys to GitHub Pages on every push to `main` |

## Contributing

New stages, bug reports and translations are very welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © utkrshkmr
