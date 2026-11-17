from pathlib import Path

from docx import Document
from docx.shared import Inches, Pt

md = Path("STRIPE.md").read_text(encoding="utf-8")
doc = Document()

style = doc.styles["Normal"]
style.font.name = "Calibri"
style.font.size = Pt(11)


def add_heading_line(text: str, level: int) -> None:
    doc.add_heading(text, level=min(max(level, 1), 3))


def add_runs_with_bold(paragraph, text: str) -> None:
    parts = text.split("**")
    for idx, part in enumerate(parts):
        run = paragraph.add_run(part)
        run.bold = idx % 2 == 1


in_code = False
code_lines: list[str] = []
in_table = False
table_rows: list[list[str]] = []


def flush_code() -> None:
    global code_lines
    if not code_lines:
        return
    p = doc.add_paragraph()
    run = p.add_run("\n".join(code_lines))
    run.font.name = "Consolas"
    run.font.size = Pt(9)
    code_lines = []


def flush_table() -> None:
    global table_rows, in_table
    if not table_rows:
        in_table = False
        return
    rows = [r for r in table_rows if not all(set(c.strip()) <= set("-: ") for c in r)]
    if not rows:
        table_rows = []
        in_table = False
        return
    cols = max(len(r) for r in rows)
    table = doc.add_table(rows=len(rows), cols=cols)
    table.style = "Table Grid"
    for i, row in enumerate(rows):
        for j in range(cols):
            cell = table.rows[i].cells[j]
            cell.text = row[j].strip() if j < len(row) else ""
            if i == 0:
                for paragraph in cell.paragraphs:
                    for run in paragraph.runs:
                        run.bold = True
    doc.add_paragraph()
    table_rows = []
    in_table = False


lines = md.splitlines()
i = 0
while i < len(lines):
    line = lines[i]
    if line.strip().startswith("```"):
        if in_code:
            flush_code()
            in_code = False
        else:
            flush_table()
            in_code = True
            code_lines = []
        i += 1
        continue
    if in_code:
        code_lines.append(line)
        i += 1
        continue

    if "|" in line and line.strip().startswith("|"):
        cells = [c for c in line.strip().strip("|").split("|")]
        if not in_table:
            flush_code()
            in_table = True
            table_rows = []
        table_rows.append(cells)
        i += 1
        continue
    if in_table:
        flush_table()

    if not line.strip():
        i += 1
        continue

    if line.startswith("# "):
        add_heading_line(line[2:].strip(), 1)
    elif line.startswith("## "):
        add_heading_line(line[3:].strip(), 2)
    elif line.startswith("### "):
        add_heading_line(line[4:].strip(), 3)
    elif line.startswith("> "):
        p = doc.add_paragraph()
        add_runs_with_bold(p, line[2:].strip())
        p.paragraph_format.left_indent = Inches(0.25)
        for run in p.runs:
            run.italic = True
    elif line.startswith("- [ ] "):
        p = doc.add_paragraph(style="List Bullet")
        add_runs_with_bold(p, line[6:].strip())
    elif line.startswith("- "):
        p = doc.add_paragraph(style="List Bullet")
        add_runs_with_bold(p, line[2:].strip())
    elif line.strip() == "---":
        pass
    else:
        p = doc.add_paragraph()
        add_runs_with_bold(p, line.strip())
    i += 1

flush_code()
flush_table()

out = Path("Gebeta-Stripe-Payment-Guide.docx")
doc.save(out)
print(out.resolve())
