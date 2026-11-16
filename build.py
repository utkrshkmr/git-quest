#!/usr/bin/env python3
"""Bundle src/ into one self-contained dist/index.html (no build tools needed)."""
import pathlib

src = pathlib.Path(__file__).parent / "src"
out = pathlib.Path(__file__).parent / "dist" / "index.html"

html = (src / "shell.html").read_text()
for key, name in [("CSS", "style.css"), ("ENGINE", "engine.js"), ("LEVELS", "levels.js"), ("UI", "ui.js")]:
    code = (src / name).read_text().replace("</script>", "<\\/script>")
    html = html.replace("/*" + key + "*/", code, 1)

out.parent.mkdir(exist_ok=True)
out.write_text(html)
print(f"built {out} ({len(html):,} bytes)")
