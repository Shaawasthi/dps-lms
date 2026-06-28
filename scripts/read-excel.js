const ExcelJS = require('exceljs')
const wb = new ExcelJS.Workbook()
wb.xlsx.readFile('C:/Users/shank/Downloads/Question_Template_-_Copy-grade_7_ch_10-options added.xlsx').then(() => {
  wb.eachSheet((sheet) => {
    console.log('=== Sheet:', sheet.name, 'rows:', sheet.rowCount, 'cols:', sheet.columnCount, '===')

    // Print all merged cell ranges
    const merges = sheet._merges
    if (merges) {
      console.log('Merged ranges:', Object.keys(merges).join(', '))
    }

    sheet.eachRow({ includeEmpty: false }, (row, rn) => {
      if (rn > 60) return
      const cells = []
      row.eachCell({ includeEmpty: true }, (cell, cn) => {
        const val = cell.value
        if (val === null || val === undefined || val === '') return
        const info = {
          col: cn,
          addr: cell.address,
          val: typeof val === 'object' && val.richText ? val.richText.map(r => r.text).join('') : String(val),
          merged: cell.isMerged || false,
        }
        if (cell.style && cell.style.fill && cell.style.fill.fgColor) {
          info.bg = cell.style.fill.fgColor.argb || cell.style.fill.fgColor.theme
        }
        if (cell.style && cell.style.font) {
          info.bold = cell.style.font.bold
          info.color = cell.style.font.color ? (cell.style.font.color.argb || cell.style.font.color.theme) : undefined
          info.size = cell.style.font.size
        }
        cells.push(info)
      })
      if (cells.length > 0) console.log('Row', rn, JSON.stringify(cells))
    })
  })
})
