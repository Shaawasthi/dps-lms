import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient } from '@/lib/supabase/server'

type Question = {
  question_uid: string
  question_text: string
  option_1: string | null
  option_2: string | null
  option_3: string | null
  option_4: string | null
  correct_answer: string
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { curriculum_ids } = (await req.json()) as { curriculum_ids: string[] }
  if (!curriculum_ids?.length) {
    return NextResponse.json({ error: 'No sessions selected.' }, { status: 400 })
  }

  const { data: questions, error } = await supabase
    .from('questions')
    .select('question_uid, question_text, option_1, option_2, option_3, option_4, correct_answer')
    .eq('is_remedy', false)
    .in('curriculum_id', curriculum_ids)
    .order('question_uid')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!questions?.length) {
    return NextResponse.json({ error: 'No diagnostic questions found for selected sessions.' }, { status: 404 })
  }

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Quiz Bank')

  ws.columns = [
    { key: 'question', width: 65 },
    { key: 'options',  width: 55 },
    { key: 'type',     width: 16 },
    { key: 'single',   width: 20 },
    { key: 'answer',   width: 24 },
    { key: 'score',    width: 10 },
    { key: 'timer',    width: 12 },
  ]

  // Header row — matches the template exactly
  const header = ws.addRow(['Question', 'Options', 'Type(Numeric)', 'Single or Multiple', 'Correct Answer Option', 'Score', 'Timer(Sec)'])
  header.font = { bold: true, size: 13 }
  header.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC9DAF8' } }
  header.getCell(5).font = { size: 11 }

  // Data rows
  for (const q of questions as Question[]) {
    const questionText = `${q.question_uid}: ${q.question_text}`
    const options = [
      q.option_1 ? `a) ${q.option_1}` : null,
      q.option_2 ? `b) ${q.option_2}` : null,
      q.option_3 ? `c) ${q.option_3}` : null,
      q.option_4 ? `d) ${q.option_4}` : null,
    ].filter(Boolean).join('\n')

    const row = ws.addRow([questionText, options, 1, 1, q.correct_answer, 5, ''])
    row.font = { size: 11 }
    row.eachCell((cell) => {
      cell.alignment = { wrapText: true, vertical: 'top' }
    })
  }

  const buffer = await wb.xlsx.writeBuffer()
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="class-test.xlsx"',
    },
  })
}
