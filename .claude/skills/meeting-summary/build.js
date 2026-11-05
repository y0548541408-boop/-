#!/usr/bin/env node
// Builds a client meeting summary as a Word file in the brand style of
// "שרמן – משכנתאות וכלכלת המשפחה" (brand guide: green #1F5F5B, terracotta #C8734A,
// cream backgrounds, no red).
//
// Usage: node build.js <summary.json> <output.docx>
// The JSON format is documented in SKILL.md; example.json is a full example.

const fs = require("fs");
const path = require("path");
let docx;
try {
  docx = require("docx");
} catch {
  console.error('The "docx" package is missing. Run: npm install docx (in any folder), then try again with NODE_PATH pointing to it.');
  process.exit(1);
}
const {
  AlignmentType, BorderStyle, Document, Footer, Header, ImageRun, LevelFormat, Packer, PageNumber,
  Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType, TableLayoutType,
} = docx;

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error("Usage: node build.js <summary.json> <output.docx>");
  process.exit(1);
}
const spec = JSON.parse(fs.readFileSync(inPath, "utf8"));

// Brand colors
const GREEN = "1F5F5B";
const ACCENT = "C8734A";
const ACCENT_INK = "A35530"; // accent for small text (readable contrast)
const CREAM = "F7F2E8";
const CREAM_D = "EFE7D6";
const MINT = "DCEBE7";
const INK = "1B2B2A";
const WHITE = "FFFFFF";
const FONT = "Arial";

const PAGE_W = 11906; // A4
const MARGIN = 1134; // 2 cm
const W = PAGE_W - 2 * MARGIN;

const logo = fs.readFileSync(path.join(__dirname, "logo.png"));
const LOGO_RATIO = 510 / 1830;

const DEFAULT_SIGNATURE = {
  name: "ישראל שרמן",
  title: "יועץ ומאמן לכלכלת המשפחה ויועץ משכנתאות | חבר בהתאחדות יועצי המשכנתאות | חבר באיגוד היועצים והמאמנים לכלכלת המשפחה",
  contact: "053-950-8209  |  y0539508209@gmail.com",
};

// ---------- text helpers ----------
const run = (text, o = {}) =>
  new TextRun({ text, rightToLeft: !o.ltr, bold: o.bold, color: o.color || INK, size: o.size || 22, font: FONT });

/** "**bold** and plain" -> runs. Bold parts use the given bold color (default ink). */
function rich(text, o = {}) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part) =>
    part.startsWith("**") && part.endsWith("**")
      ? run(part.slice(2, -2), { ...o, bold: true, color: o.boldColor || o.color })
      : run(part, o)
  );
}

function para(children, o = {}) {
  return new Paragraph({
    bidirectional: !o.ltr,
    alignment: o.align,
    spacing: { before: o.before ?? 0, after: o.after ?? 120, line: o.line ?? 320 },
    keepNext: o.keepNext,
    border: o.border,
    numbering: o.bullet ? { reference: "bullets", level: 0 } : o.check ? { reference: "checks", level: 0 } : undefined,
    children,
  });
}

const none = { style: BorderStyle.NONE, size: 0, color: WHITE };
const noBorders = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };
const spacer = (after = 120) => new Paragraph({ spacing: { before: 0, after }, children: [] });

function cell(children, o = {}) {
  return new TableCell({
    width: { size: o.width, type: WidthType.DXA },
    shading: o.fill ? { type: ShadingType.CLEAR, color: "auto", fill: o.fill } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: o.pad ?? 110, bottom: o.pad ?? 110, left: 160, right: 160 },
    borders: o.borders,
    children,
  });
}

function box(children, { fill, strip }) {
  return new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: [W],
    visuallyRightToLeft: true,
    borders: noBorders,
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          cell(children, { width: W, fill, pad: 150, borders: { top: none, bottom: none, left: none, right: { style: BorderStyle.SINGLE, size: 36, color: strip } } }),
        ],
      }),
    ],
  });
}

function splitWidths(fractions, n) {
  const f = fractions && fractions.length === n ? fractions : Array(n).fill(1 / n);
  const sum = f.reduce((a, b) => a + b, 0);
  const widths = f.map((x) => Math.round((x / sum) * W));
  widths[widths.length - 1] += W - widths.reduce((a, b) => a + b, 0);
  return widths;
}

// ---------- blocks ----------
let sectionNo = 0;

const blocks = {
  heading(b) {
    sectionNo += 1;
    const num = b.number === false ? [] : [run(`${sectionNo}. `, { bold: true, color: ACCENT, size: 30 })];
    return [
      para([...num, run(b.text, { bold: true, color: GREEN, size: 30 })], {
        before: 300,
        after: 140,
        keepNext: true,
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: CREAM_D, space: 6 } },
      }),
    ];
  },
  subheading(b) {
    return [para([run(b.text, { bold: true, color: GREEN, size: 25 })], { before: 240, after: 100, keepNext: true })];
  },
  paragraph(b) {
    return [para(rich(b.text), { after: b.after ?? 120, keepNext: b.keepNext })];
  },
  label(b) {
    return [para([run(b.text, { bold: true, color: GREEN })], { before: 160, after: 80, keepNext: true })];
  },
  bullets(b) {
    return b.items.map((it, i) => para(rich(it), { bullet: true, after: i === b.items.length - 1 ? 160 : 60 }));
  },
  kpis(b) {
    const gap = 160;
    const n = b.items.length;
    const boxW = Math.floor((W - gap * (n - 1)) / n);
    const widths = [];
    const cells = [];
    b.items.forEach((it, i) => {
      widths.push(boxW);
      cells.push(
        cell(
          [
            para([run(it.label, { size: 20 })], { after: 40, align: AlignmentType.CENTER }),
            para([run(it.value, { bold: true, color: GREEN, size: 36, ltr: true })], { after: 20, align: AlignmentType.CENTER, ltr: true }),
            para([run(it.sub || " ", { size: 18 })], { after: 0, align: AlignmentType.CENTER }),
          ],
          { width: boxW, fill: it.highlight ? MINT : CREAM, pad: 180 }
        )
      );
      if (i < n - 1) {
        widths.push(gap);
        cells.push(cell([para([], { after: 0 })], { width: gap }));
      }
    });
    return [
      new Table({
        width: { size: widths.reduce((a, c) => a + c, 0), type: WidthType.DXA },
        columnWidths: widths,
        visuallyRightToLeft: true,
        layout: TableLayoutType.FIXED,
        borders: noBorders,
        rows: [new TableRow({ children: cells })],
      }),
      spacer(120),
    ];
  },
  table(b) {
    const widths = splitWidths(b.widths, b.headers.length);
    const numeric = b.numeric || [];
    const highlight = b.highlight || {};
    const last = b.rows.length - 1;
    const border = { style: BorderStyle.SINGLE, size: 4, color: CREAM_D };
    const head = new TableRow({
      tableHeader: true,
      children: b.headers.map((h, i) => cell([para([run(h, { bold: true, color: WHITE })], { after: 0, keepNext: true })], { width: widths[i], fill: GREEN })),
    });
    const body = b.rows.map((row, ri) => {
      const style = highlight[ri];
      const fill = style === "total" || style === "recommended" ? MINT : style === "subtotal" ? CREAM_D : ri % 2 ? CREAM : WHITE;
      const strong = style === "total" || style === "subtotal";
      return new TableRow({
        cantSplit: true,
        children: row.map((value, ci) => {
          const isNum = numeric.includes(ci);
          const content = isNum
            ? [run(String(value), { ltr: true, bold: strong, color: style === "total" ? GREEN : INK, size: style === "total" ? 24 : 22 })]
            : rich(String(value), { bold: strong, boldColor: INK });
          return cell([para(content, { after: 0, ltr: isNum, align: isNum ? AlignmentType.LEFT : undefined, line: 300, keepNext: ri < last })], {
            width: widths[ci],
            fill,
          });
        }),
      });
    });
    return [
      new Table({
        width: { size: W, type: WidthType.DXA },
        columnWidths: widths,
        visuallyRightToLeft: true,
        layout: TableLayoutType.FIXED,
        borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
        rows: [head, ...body],
      }),
      spacer(160),
    ];
  },
  callout(b) {
    const green = b.style === "green";
    const color = green ? WHITE : INK;
    const kids = [];
    if (b.title) kids.push(para([run(b.title, { bold: true, color: green ? WHITE : GREEN, size: green ? 26 : 28 })], { after: 100 }));
    if (b.text) kids.push(para(rich(b.text, { color, boldColor: color }), { after: b.items ? 80 : 0 }));
    (b.items || []).forEach((it, i, arr) => kids.push(para(rich(it, { color, boldColor: color }), { bullet: true, after: i === arr.length - 1 ? 0 : 80 })));
    return [box(kids, green ? { fill: GREEN, strip: ACCENT } : { fill: MINT, strip: GREEN }), spacer(120)];
  },
  tasks(b) {
    const out = [];
    b.items.forEach((t, i) => {
      out.push(
        box(
          [
            para([run(`משימה ${i + 1}  `, { bold: true, color: ACCENT_INK }), run(t.title, { bold: true, color: GREEN, size: 25 })], { after: 100 }),
            ...t.steps.map((s) => para(rich(s), { check: true, after: 60 })),
          ],
          { fill: CREAM, strip: ACCENT }
        )
      );
      out.push(spacer(80));
    });
    return out;
  },
};

// ---------- document ----------
const children = [
  new Paragraph({
    bidirectional: true,
    spacing: { before: 0, after: 200, line: 240, lineRule: "auto" },
    children: [new ImageRun({ type: "png", data: logo, transformation: { width: 260, height: Math.round(260 * LOGO_RATIO) }, altText: { title: "שרמן", description: "שרמן – משכנתאות וכלכלת המשפחה", name: "logo" } })],
  }),
  para([run(spec.title || "סיכום פגישה ותוכנית עבודה", { bold: true, color: GREEN, size: 44 })], { before: 120, after: 60 }),
  para(
    [run(spec.client || "", { bold: true, color: ACCENT_INK, size: 24 }), ...(spec.date ? [run(`  |  ${spec.date}`, { color: ACCENT_INK, size: 24 })] : [])],
    { after: 280, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 10 } } }
  ),
];
if (spec.greeting) children.push(para([run(spec.greeting, { bold: true, size: 24 })], { after: 120 }));
(spec.intro || []).forEach((t, i, arr) => children.push(para(rich(t), { after: i === arr.length - 1 ? 240 : 120 })));
if (spec.bottomLine && spec.bottomLine.length) children.push(...blocks.callout({ title: "בשורה התחתונה", items: spec.bottomLine }));
for (const b of spec.blocks || []) {
  const fn = blocks[b.type];
  if (!fn) throw new Error(`Unknown block type: ${b.type}`);
  children.push(...fn(b));
}
(spec.closing || []).forEach((t, i) => children.push(para(rich(t), { before: i === 0 ? 240 : 0, keepNext: true, after: 120 })));
const sig = { ...DEFAULT_SIGNATURE, ...(spec.signature || {}) };
children.push(
  para([run(sig.name, { bold: true, color: GREEN, size: 28 })], { before: 120, after: 40, keepNext: true }),
  para([run(sig.title, { size: 19 })], { after: 40, keepNext: true, line: 280 }),
  para([run(sig.contact, { size: 19, color: ACCENT_INK, ltr: true })], { after: 0 })
);

const header = new Header({
  children: [
    new Paragraph({
      bidirectional: true,
      spacing: { before: 0, after: 0, line: 240, lineRule: "auto" },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: CREAM_D, space: 6 } },
      children: [new ImageRun({ type: "png", data: logo, transformation: { width: 130, height: Math.round(130 * LOGO_RATIO) }, altText: { title: "שרמן", description: "שרמן – משכנתאות וכלכלת המשפחה", name: "logo-small" } })],
    }),
  ],
});
const footer = new Footer({
  children: [
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: CREAM_D, space: 6 } },
      children: [
        run("חותמים בראש שקט.", { color: GREEN, size: 18, bold: true }),
        run("   |   שרמן · משכנתאות וכלכלת המשפחה   |   עמוד ", { size: 18 }),
        new TextRun({ children: [PageNumber.CURRENT], size: 18, color: INK, font: FONT }),
      ],
    }),
  ],
});

const doc = new Document({
  creator: sig.name,
  title: `${spec.title || "סיכום פגישה"}${spec.client ? ` – ${spec.client}` : ""}`,
  styles: { default: { document: { run: { font: FONT, size: 22, color: INK }, paragraph: { spacing: { line: 320 } } } } },
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "●", alignment: AlignmentType.LEFT, style: { run: { color: ACCENT, size: 16 }, paragraph: { indent: { left: 400, hanging: 280 } } } }] },
      { reference: "checks", levels: [{ level: 0, format: LevelFormat.BULLET, text: "☐", alignment: AlignmentType.LEFT, style: { run: { color: GREEN, size: 24 }, paragraph: { indent: { left: 440, hanging: 320 } } } }] },
    ],
  },
  sections: [
    {
      properties: {
        titlePage: true,
        page: { size: { width: PAGE_W, height: 16838 }, margin: { top: 1500, bottom: 1100, left: MARGIN, right: MARGIN, header: 450, footer: 450 } },
      },
      headers: { first: new Header({ children: [new Paragraph({ children: [] })] }), default: header },
      footers: { first: footer, default: footer },
      children,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(outPath, buf);
  console.log("wrote", outPath);
});
