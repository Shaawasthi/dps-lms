const fs = require('fs')
const path = require('path')
const HTMLtoDOCX = require('html-to-docx')

async function main() {
  const { marked } = await import('marked')

  const md = fs.readFileSync(path.join(__dirname, '../GUIDE.md'), 'utf-8')
  const body = marked.parse(md)

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
body { font-family: Calibri, sans-serif; font-size: 11pt; color: #111; }
h1 { font-size: 20pt; color: #1a4d1a; margin-bottom: 4px; }
h2 { font-size: 14pt; color: #1a4d1a; border-bottom: 2px solid #2d6a2d; padding-bottom: 3px; margin-top: 22px; }
h3 { font-size: 12pt; color: #2d6a2d; margin-top: 16px; }
h4 { font-size: 11pt; color: #444; margin-top: 12px; }
pre { font-family: "Courier New", monospace; font-size: 8.5pt; background: #f4f4f4; padding: 10px; border-left: 3px solid #2d6a2d; white-space: pre-wrap; word-break: break-all; margin: 10px 0; }
code { font-family: "Courier New", monospace; font-size: 9pt; background: #f0f0f0; padding: 1px 4px; }
pre code { background: none; padding: 0; }
table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 10pt; }
th { background: #2d6a2d; color: white; padding: 6px 10px; text-align: left; }
td { border: 1px solid #bbb; padding: 5px 10px; }
tr:nth-child(even) td { background: #f4f9f4; }
blockquote { border-left: 4px solid #2d6a2d; margin: 10px 0; padding: 6px 14px; background: #eef6ee; color: #333; font-style: italic; }
ul, ol { margin: 4px 0; padding-left: 22px; }
li { margin: 4px 0; line-height: 1.5; }
p { margin: 6px 0; line-height: 1.6; }
hr { border: none; border-top: 1px solid #ccc; margin: 18px 0; }
</style>
</head>
<body>${body}</body>
</html>`

  const docxBuffer = await HTMLtoDOCX(html, null, {
    title: 'DPS LMS User Guide',
    subject: 'Delhi Public School Learning Management System',
    creator: 'Equanimity Learning',
    table: { row: { cantSplit: true } },
    footer: true,
    pageNumber: true,
    font: 'Calibri',
    fontSize: 22,
    margins: { top: 720, right: 900, bottom: 720, left: 900 },
  })

  const outPath = path.join(__dirname, '../GUIDE.docx')
  fs.writeFileSync(outPath, docxBuffer)
  console.log('Written:', outPath)
}

main().catch(console.error)
