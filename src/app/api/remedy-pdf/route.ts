import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { createClient } from '@/lib/supabase/server'

type Question = {
  question_uid: string
  question_text: string
  option_1: string | null
  option_2: string | null
  option_3: string | null
  option_4: string | null
  option_1_tag: string | null
  option_2_tag: string | null
  option_3_tag: string | null
  option_4_tag: string | null
  correct_answer: string
  level: string
  hint: string | null
}

type Response = {
  question_uid: string
  is_correct: boolean
  response_option: string | null
}

type QuestionMeta = {
  question_uid: string
  level: string
  option_1_tag: string | null
  option_2_tag: string | null
  option_3_tag: string | null
  option_4_tag: string | null
}

const LEVELS = ['Theory', 'Understanding', 'Application'] as const

function dominantMisconception(
  responses: Response[],
  qMeta: QuestionMeta[]
): string | null {
  const metaMap = new Map(qMeta.map((q) => [q.question_uid, q]))
  const tally = new Map<string, number>()

  for (const r of responses) {
    if (r.is_correct || !r.response_option) continue
    const meta = metaMap.get(r.question_uid)
    if (!meta) continue

    // Map the chosen option letter to its tag
    const optionKey = `option_${r.response_option.toLowerCase()}_tag` as
      | 'option_1_tag'
      | 'option_2_tag'
      | 'option_3_tag'
      | 'option_4_tag'

    // Handle both letter (A/B/C/D) and number (1/2/3/4) formats
    let tag: string | null = null
    const opt = r.response_option.toUpperCase()
    if (opt === 'A' || opt === '1') tag = meta.option_1_tag
    else if (opt === 'B' || opt === '2') tag = meta.option_2_tag
    else if (opt === 'C' || opt === '3') tag = meta.option_3_tag
    else if (opt === 'D' || opt === '4') tag = meta.option_4_tag

    if (tag) tally.set(tag, (tally.get(tag) ?? 0) + 1)
  }

  if (tally.size === 0) return null

  // Return the most frequently demonstrated misconception
  return Array.from(tally.entries()).sort((a, b) => b[1] - a[1])[0][0]
}

export async function POST(request: NextRequest) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { student_id, curriculum_id } = body as {
    student_id: string
    curriculum_id: string
  }

  // Fetch student + curriculum info in parallel
  const [{ data: student }, { data: curric }, { data: qMeta }] =
    await Promise.all([
      supabase
        .from('students')
        .select('name, student_id')
        .eq('student_id', student_id)
        .single(),
      supabase
        .from('curriculum')
        .select('unit, learning_goal')
        .eq('id', curriculum_id)
        .single(),
      supabase
        .from('questions')
        .select(
          'question_uid, level, option_1_tag, option_2_tag, option_3_tag, option_4_tag'
        )
        .eq('curriculum_id', curriculum_id),
    ])

  const questionUids = (qMeta ?? []).map((q) => q.question_uid)

  // Fetch student responses for this session
  const { data: responses } = questionUids.length
    ? await supabase
        .from('responses')
        .select('question_uid, is_correct, response_option')
        .eq('student_id', student_id)
        .in('question_uid', questionUids)
    : { data: [] }

  const allResponses = responses ?? []

  // Determine target level (lowest failing level < 60%)
  let targetLevel: string | null = null
  if (allResponses.length > 0) {
    for (const level of LEVELS) {
      const levelUids = new Set(
        (qMeta ?? []).filter((q) => q.level === level).map((q) => q.question_uid)
      )
      const levelResps = allResponses.filter((r) => levelUids.has(r.question_uid))
      if (levelResps.length === 0) continue
      const pct =
        (levelResps.filter((r) => r.is_correct).length / levelResps.length) * 100
      if (pct < 60) {
        targetLevel = level
        break
      }
    }
  }

  // Find dominant misconception from wrong answers
  const topMisconception = dominantMisconception(allResponses, qMeta ?? [])

  // Fetch misconception description if we found one
  let misconceptionDesc: string | null = null
  if (topMisconception) {
    const { data: mc } = await supabase
      .from('misconceptions')
      .select('description')
      .eq('code', topMisconception)
      .single()
    misconceptionDesc = mc?.description ?? null
  }

  // Build remedy question query
  // Priority 1: remedy questions for the dominant misconception tag
  // Priority 2: all remedy questions for the session (filtered by level if known)
  let questions: Question[] = []

  if (topMisconception) {
    // Pull questions where any option tag matches the dominant misconception
    // These are questions DESIGNED to address this specific misconception
    const { data: mcQuestions } = await supabase
      .from('questions')
      .select(
        'question_uid, question_text, option_1, option_2, option_3, option_4, option_1_tag, option_2_tag, option_3_tag, option_4_tag, correct_answer, level, hint'
      )
      .eq('curriculum_id', curriculum_id)
      .eq('is_remedy', true)
      .or(
        `option_1_tag.eq.${topMisconception},option_2_tag.eq.${topMisconception},option_3_tag.eq.${topMisconception},option_4_tag.eq.${topMisconception}`
      )
      .limit(10)

    questions = mcQuestions ?? []
  }

  // Fill remaining slots from general session remedy questions
  if (questions.length < 5) {
    let fillQuery = supabase
      .from('questions')
      .select(
        'question_uid, question_text, option_1, option_2, option_3, option_4, option_1_tag, option_2_tag, option_3_tag, option_4_tag, correct_answer, level, hint'
      )
      .eq('curriculum_id', curriculum_id)
      .eq('is_remedy', true)

    if (targetLevel) fillQuery = fillQuery.eq('level', targetLevel)

    // Exclude questions already included
    const alreadyIn = questions.map((q) => q.question_uid)
    if (alreadyIn.length > 0) {
      fillQuery = fillQuery.not('question_uid', 'in', `(${alreadyIn.join(',')})`)
    }

    const { data: fillQuestions } = await fillQuery
      .order('level')
      .limit(20 - questions.length)

    questions = [...questions, ...(fillQuestions ?? [])]
  }

  if (questions.length === 0) {
    return NextResponse.json(
      { error: 'No remedy questions found for this session.' },
      { status: 404 }
    )
  }

  // ── PDF generation ──────────────────────────────────────────────
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold)

  const PAGE_WIDTH = 595
  const PAGE_HEIGHT = 842
  const MARGIN = 50
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

  function addPage() {
    return pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  }

  function wrapText(text: string, maxWidth: number, size: number): string[] {
    const words = text.split(' ')
    const lines: string[] = []
    let current = ''
    for (const word of words) {
      const test = current ? `${current} ${word}` : word
      if (font.widthOfTextAtSize(test, size) > maxWidth && current) {
        lines.push(current)
        current = word
      } else {
        current = test
      }
    }
    if (current) lines.push(current)
    return lines
  }

  let page = addPage()
  let y = PAGE_HEIGHT - MARGIN

  function ensureSpace(needed: number) {
    if (y - needed < MARGIN) {
      page = addPage()
      y = PAGE_HEIGHT - MARGIN
    }
  }

  // Header
  page.drawText('Remedy Worksheet', {
    x: MARGIN, y, size: 18, font: boldFont, color: rgb(0.1, 0.3, 0.7),
  })
  y -= 26

  const meta = [
    `Student: ${student?.name ?? student_id}`,
    `Session: ${curric?.unit ?? ''} — ${curric?.learning_goal ?? ''}`,
    ...(targetLevel ? [`Focus Level: ${targetLevel}`] : []),
    ...(topMisconception
      ? [`Addressing: ${topMisconception}${misconceptionDesc ? ` — ${misconceptionDesc}` : ''}`]
      : []),
    `Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`,
  ]

  for (const line of meta) {
    const wrapped = wrapText(line, CONTENT_WIDTH, 10)
    for (const l of wrapped) {
      page.drawText(l, { x: MARGIN, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) })
      y -= 14
    }
  }

  y -= 6
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  })
  y -= 16

  // Questions
  questions.forEach((q, i) => {
    const qLines = wrapText(`Q${i + 1}. ${q.question_text}`, CONTENT_WIDTH, 11)
    ensureSpace(qLines.length * 16 + 80)

    // Question text
    for (const line of qLines) {
      page.drawText(line, { x: MARGIN, y, size: 11, font: boldFont, color: rgb(0, 0, 0) })
      y -= 15
    }

    // Level badge
    page.drawText(`[${q.level}]`, {
      x: PAGE_WIDTH - MARGIN - font.widthOfTextAtSize(`[${q.level}]`, 9),
      y: y + 15 * qLines.length,
      size: 9, font, color: rgb(0.5, 0.5, 0.5),
    })

    y -= 4

    // Options
    const opts = [
      { label: 'A', text: q.option_1 },
      { label: 'B', text: q.option_2 },
      { label: 'C', text: q.option_3 },
      { label: 'D', text: q.option_4 },
    ].filter((o) => o.text)

    for (const opt of opts) {
      const lines = wrapText(`${opt.label}) ${opt.text}`, CONTENT_WIDTH - 16, 10)
      ensureSpace(lines.length * 14 + 4)
      for (const line of lines) {
        page.drawText(line, { x: MARGIN + 16, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) })
        y -= 13
      }
    }

    // Hint
    if (q.hint) {
      y -= 4
      const hintLines = wrapText(`Hint: ${q.hint}`, CONTENT_WIDTH - 16, 9)
      ensureSpace(hintLines.length * 12 + 6)
      for (const line of hintLines) {
        page.drawText(line, { x: MARGIN + 16, y, size: 9, font, color: rgb(0.3, 0.5, 0.3) })
        y -= 12
      }
    }

    y -= 14

    if (i < questions.length - 1) {
      page.drawLine({
        start: { x: MARGIN, y },
        end: { x: PAGE_WIDTH - MARGIN, y },
        thickness: 0.3, color: rgb(0.85, 0.85, 0.85),
      })
      y -= 14
    }
  })

  const pdfBytes = await pdf.save()

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="remedy-${student_id}.pdf"`,
    },
  })
}
