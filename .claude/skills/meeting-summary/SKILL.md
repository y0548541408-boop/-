---
name: meeting-summary
description: Turn the text of a client meeting summary (סיכום פגישה, תוכנית עבודה, סיכום ייעוץ, מכתב ללקוח) into a branded Word file and PDF in the style of "שרמן – משכנתאות וכלכלת המשפחה" (logo, brand colors, slogan "חותמים בראש שקט."). Use whenever Israel sends meeting-summary text, a .docx or notes and asks to design/format/brand it ("תעצב", "בעיצוב שלי", "עם הלוגו והצבעים", "תעשה מזה סיכום פגישה").
---

# Branded meeting summary

Produces a Word file (and a PDF of it) with the brand guide applied: logo on the first page and small logo on the others, green #1F5F5B headings, terracotta #C8734A highlights, cream backgrounds, no red, footer "חותמים בראש שקט. | שרמן · משכנתאות וכלכלת המשפחה | עמוד N". The logo always reads "שרמן" with "משכנתאות וכלכלת המשפחה" under it.

All replies to the user are in Hebrew (see CLAUDE.md).

## Steps

1. **Get the text.** From the message, or from an uploaded file (`pandoc -t markdown file.docx`). Treat it as the content to lay out.
2. **Keep Israel's wording.** Do not rewrite, shorten or add content, and never invent numbers. Fix only clear typos, and tell the user which ones. If something is missing for the layout (client name, date), ask or leave it out.
3. **Write a JSON spec** (format below) in the scratchpad. Map the text onto blocks:
   - The opening "bottom line" bullets go in `bottomLine`.
   - Numbered sections become `heading` (numbers are added automatically).
   - Money tables become `table` with `numeric` columns; totals get `highlight`.
   - Monthly summary numbers (income / expenses / left over) can become `kpis`.
   - A recommendation becomes a `callout` with `"style": "green"`.
   - Action items become `tasks`.
4. **Build:** `node .claude/skills/meeting-summary/build.js spec.json "סיכום-פגישה-<שם>.docx"`. If `require('docx')` fails, run `npm install docx` in the scratchpad and set `NODE_PATH` to its `node_modules`.
5. **Check it:** convert to PDF (`soffice --headless --convert-to pdf`, or the docx skill's `scripts/office/soffice.py`), render pages with `pdftoppm -jpeg -r 70`, and look at every page. Fix anything cut off, a lone signature on a page, or a table split badly.
6. **Send both files** (the .docx for editing, the .pdf for sending to the client) and say in a short Hebrew message what was done.

`example.json` is a complete example with invented names and numbers; start from it. Never save real client details (names, figures, phone numbers) in this folder or anywhere in the repository: client specs and output files go only in the scratchpad.

## JSON format

```json
{
  "title": "סיכום פגישה ותוכנית עבודה",
  "client": "שם הלקוח",
  "date": "5 בנובמבר 2026",
  "greeting": "שלום וברכה.",
  "intro": ["paragraph", "..."],
  "bottomLine": ["bullet with **bold label:** text", "..."],
  "blocks": [ ... ],
  "closing": ["paragraph", "..."],
  "signature": { "name": "...", "title": "...", "contact": "..." }
}
```

`signature` is optional; the default is Israel's name, titles and contact details. In any text, `**like this**` is bold.

Block types:

| type | fields |
|---|---|
| `heading` | `text`; `"number": false` to skip the number |
| `subheading` | `text` |
| `paragraph` | `text`; optional `keepNext` (keep with what follows) |
| `label` | `text` (a small green bold line before a list) |
| `bullets` | `items` |
| `kpis` | `items`: `{ label, value, sub, highlight }` (2–4 boxes; `highlight` = mint box) |
| `table` | `headers`, `rows`, optional `widths` (fractions), `numeric` (column indexes, left-aligned numbers), `highlight` (`{ "rowIndex": "subtotal" \| "total" \| "recommended" }`) |
| `callout` | `title`, `text` and/or `items`; `"style": "green"` for a recommendation, default is a mint box |
| `tasks` | `items`: `{ title, steps: [...] }`, shown as "משימה 1", "משימה 2"... with checkboxes |

Write negative amounts with a real minus sign (`−316,000`) so they read correctly.
