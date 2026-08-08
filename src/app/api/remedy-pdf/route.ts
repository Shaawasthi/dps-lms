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
  difficulty: string | null
  question_type: string | null
  hint: string | null
}

type ResponseRow = {
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

// ── Bloom's taxonomy grouping ────────────────────────────────────────────────
//
// Lower  = Understand (and legacy Theory)
// Middle = Apply, Analyze (and legacy Understanding)
// Higher = Evaluate, Create (and legacy Application)
//
const BLOOM_GROUPS = ['Lower', 'Middle', 'Higher'] as const
type BloomGroup = (typeof BLOOM_GROUPS)[number]

function getBloomGroup(level: string): BloomGroup {
  if (level === 'Understand' || level === 'Theory') return 'Lower'
  if (level === 'Apply' || level === 'Analyze' || level === 'Understanding') return 'Middle'
  return 'Higher' // Evaluate, Create, Application
}

// ── Distribution table (20 questions total by Bloom's group) ─────────────────
//
// miscCount │ Lower │ Middle │ Higher │ Bloom's groups
// ──────────┼───────┼────────┼────────┼──────────────────────────────────────
//     0     │   0   │   6    │   14   │ Understand / Apply+Analyze / Eval+Create
//     1     │   6   │   4    │   10   │
//     2     │   6   │   6    │    8   │
//    3+     │  10   │   6    │    4   │
//
// Within each group: 40% Easy / 30% Medium / 30% Hard (best-effort, with fallback)
//
function getGroupDistribution(miscCount: number): Record<BloomGroup, number> {
  if (miscCount === 0) return { Lower: 0, Middle: 6, Higher: 14 }
  if (miscCount === 1) return { Lower: 6, Middle: 4, Higher: 10 }
  if (miscCount === 2) return { Lower: 6, Middle: 6, Higher: 8 }
  return { Lower: 10, Middle: 6, Higher: 4 }
}

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const
type Difficulty = (typeof DIFFICULTIES)[number]

function getDiffTargets(n: number): Record<Difficulty, number> {
  const easy = Math.round(n * 0.4)
  const hard = Math.round(n * 0.3)
  return { Easy: easy, Medium: n - easy - hard, Hard: hard }
}

// ── Misconception helpers ────────────────────────────────────────────────────

function getMisconceptions(responses: ResponseRow[], qMeta: QuestionMeta[]): Set<string> {
  const metaMap = new Map(qMeta.map((q) => [q.question_uid, q]))
  const codes = new Set<string>()
  for (const r of responses) {
    if (r.is_correct || !r.response_option) continue
    const meta = metaMap.get(r.question_uid)
    if (!meta) continue
    const opt = r.response_option.toUpperCase()
    let tag: string | null = null
    if (opt === 'A' || opt === '1') tag = meta.option_1_tag
    else if (opt === 'B' || opt === '2') tag = meta.option_2_tag
    else if (opt === 'C' || opt === '3') tag = meta.option_3_tag
    else if (opt === 'D' || opt === '4') tag = meta.option_4_tag
    if (tag) codes.add(tag)
  }
  return codes
}

function dominantCode(responses: ResponseRow[], qMeta: QuestionMeta[]): string | null {
  const metaMap = new Map(qMeta.map((q) => [q.question_uid, q]))
  const tally = new Map<string, number>()
  for (const r of responses) {
    if (r.is_correct || !r.response_option) continue
    const meta = metaMap.get(r.question_uid)
    if (!meta) continue
    const opt = r.response_option.toUpperCase()
    let tag: string | null = null
    if (opt === 'A' || opt === '1') tag = meta.option_1_tag
    else if (opt === 'B' || opt === '2') tag = meta.option_2_tag
    else if (opt === 'C' || opt === '3') tag = meta.option_3_tag
    else if (opt === 'D' || opt === '4') tag = meta.option_4_tag
    if (tag) tally.set(tag, (tally.get(tag) ?? 0) + 1)
  }
  if (tally.size === 0) return null
  return Array.from(tally.entries()).sort((a, b) => b[1] - a[1])[0][0]
}

function hasAnyTag(q: Question, codes: Set<string>): boolean {
  return [q.option_1_tag, q.option_2_tag, q.option_3_tag, q.option_4_tag].some(
    (t) => t !== null && codes.has(t)
  )
}

// ── Route ────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { student_id, curriculum_ids } = body as {
    student_id: string
    curriculum_ids: string[]
  }

  if (!curriculum_ids?.length) {
    return NextResponse.json({ error: 'No sessions provided.' }, { status: 400 })
  }

  // ── Fetch base data ──────────────────────────────────────────────────────
  const [{ data: student }, { data: curricArr }, { data: diagMetaRaw }] = await Promise.all([
    supabase.from('students').select('name, student_id').eq('student_id', student_id).single(),
    supabase.from('curriculum').select('id, unit, learning_goal').in('id', curriculum_ids),
    supabase
      .from('questions')
      .select('question_uid, level, option_1_tag, option_2_tag, option_3_tag, option_4_tag')
      .in('curriculum_id', curriculum_ids)
      .eq('is_remedy', false),
  ])

  // Remedy pool across all covered sessions (with new fields)
  const { data: remedyRaw } = await (supabase
    .from('questions')
    .select(
      'question_uid, question_text, option_1, option_2, option_3, option_4, ' +
      'option_1_tag, option_2_tag, option_3_tag, option_4_tag, ' +
      'correct_answer, level, difficulty, question_type, hint'
    )
    .in('curriculum_id', curriculum_ids)
    .eq('is_remedy', true) as unknown as Promise<{ data: Question[] | null }>)

  const diagMeta: QuestionMeta[] = diagMetaRaw ?? []
  const remedyPool: Question[] = remedyRaw ?? []

  // ── Student responses on diagnostic questions ────────────────────────────
  const diagUids = diagMeta.map((q) => q.question_uid)
  const { data: responsesRaw } = diagUids.length
    ? await supabase
        .from('responses')
        .select('question_uid, is_correct, response_option')
        .eq('student_id', student_id)
        .in('question_uid', diagUids)
    : { data: [] }
  const responses: ResponseRow[] = responsesRaw ?? []

  // ── Misconception analysis ───────────────────────────────────────────────
  const studentCodes = getMisconceptions(responses, diagMeta)
  const topCode = dominantCode(responses, diagMeta)
  const miscCount = studentCodes.size
  const groupDist = getGroupDistribution(miscCount)

  const sessionCodes = new Set<string>()
  for (const q of remedyPool) {
    for (const t of [q.option_1_tag, q.option_2_tag, q.option_3_tag, q.option_4_tag]) {
      if (t) sessionCodes.add(t)
    }
  }
  const otherSessionCodes = new Set(
    Array.from(sessionCodes).filter((c) => !studentCodes.has(c))
  )

  let topDesc: string | null = null
  if (topCode) {
    const { data: mc } = await supabase
      .from('misconceptions')
      .select('description')
      .eq('code', topCode)
      .single()
    topDesc = mc?.description ?? null
  }

  // ── Build question list ──────────────────────────────────────────────────
  //
  // Primary:   Bloom's group distribution (Lower / Middle / Higher)
  // Secondary: 40% Easy / 30% Medium / 30% Hard within each group
  //
  // Three-tier misconception priority at each step:
  //   P1 → student's own codes
  //   P2 → other session codes
  //   P3 → any remedy question in that pool
  //
  const selected: Question[] = []
  const usedUids = new Set<string>()

  function take(pool: Question[], n: number): Question[] {
    const picked: Question[] = []
    for (const q of pool) {
      if (picked.length >= n) break
      if (!usedUids.has(q.question_uid)) {
        picked.push(q)
        usedUids.add(q.question_uid)
      }
    }
    return picked
  }

  function selectPriority(pool: Question[], n: number): Question[] {
    let rem = n
    const out: Question[] = []

    if (rem > 0 && studentCodes.size > 0) {
      const taken = take(pool.filter((q) => hasAnyTag(q, studentCodes)), rem)
      out.push(...taken); rem -= taken.length
    }
    if (rem > 0 && otherSessionCodes.size > 0) {
      const taken = take(pool.filter((q) => hasAnyTag(q, otherSessionCodes)), rem)
      out.push(...taken); rem -= taken.length
    }
    if (rem > 0) {
      const taken = take(pool, rem)
      out.push(...taken)
    }
    return out
  }

  for (const group of BLOOM_GROUPS) {
    let groupRem = groupDist[group]
    if (groupRem === 0) continue

    const groupPool = remedyPool.filter((q) => getBloomGroup(q.level) === group)
    const diffTargets = getDiffTargets(groupRem)

    // Phase 1: difficulty-aware selection (40 / 30 / 30 split)
    for (const diff of DIFFICULTIES) {
      if (diffTargets[diff] === 0) continue
      const diffPool = groupPool.filter((q) => q.difficulty === diff)
      const taken = selectPriority(diffPool, diffTargets[diff])
      selected.push(...taken)
      groupRem -= taken.length
    }

    // Phase 2: group fallback — any difficulty remaining in group
    if (groupRem > 0) {
      const taken = selectPriority(groupPool, groupRem)
      selected.push(...taken)
    }
  }

  // Global fallback: fill any remaining slots from full pool
  const globalRem = 20 - selected.length
  if (globalRem > 0) {
    const taken = selectPriority(remedyPool, globalRem)
    selected.push(...taken)
  }

  if (selected.length === 0) {
    return NextResponse.json(
      { error: 'No remedy questions found for this session.' },
      { status: 404 }
    )
  }

  // ── Log this generation (fire-and-forget) ────────────────────────────────
  const theoryCnt = selected.filter((q) => getBloomGroup(q.level) === 'Lower').length
  const understandingCnt = selected.filter((q) => getBloomGroup(q.level) === 'Middle').length
  const applicationCnt = selected.filter((q) => getBloomGroup(q.level) === 'Higher').length

  const firstCurric = (curricArr ?? [])[0]
  const sessionNames = (curricArr ?? []).map((c) => c.learning_goal).join(', ')

  supabase
    .from('remedy_logs')
    .insert({
      student_id,
      student_name: student?.name ?? student_id,
      curriculum_id: firstCurric?.id ?? curriculum_ids[0],
      unit: firstCurric?.unit ?? '',
      session_name: sessionNames,
      misconception_count: miscCount,
      theory_count: theoryCnt,
      understanding_count: understandingCnt,
      application_count: applicationCnt,
      total_questions: selected.length,
      generated_by: user.id,
    })
    .then()

  // ── PDF generation ───────────────────────────────────────────────────────
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

  const tierLabel =
    miscCount === 0
      ? 'Misconceptions: None identified — general challenge questions'
      : miscCount === 1
      ? `Misconception: ${topCode}${topDesc ? ` — ${topDesc}` : ''}`
      : `Misconceptions identified: ${Array.from(studentCodes).join(', ')}`

  const sessionsLine = (curricArr ?? []).map((c) => c.learning_goal).join(' · ')

  const headerLines = [
    `Student: ${student?.name ?? student_id}`,
    `Sessions: ${sessionsLine}`,
    tierLabel,
    `Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`,
  ]

  for (const line of headerLines) {
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
  selected.forEach((q, i) => {
    const qLines = wrapText(`Q${i + 1}. ${q.question_text}`, CONTENT_WIDTH, 11)
    ensureSpace(qLines.length * 16 + 80)

    for (const line of qLines) {
      page.drawText(line, { x: MARGIN, y, size: 11, font: boldFont, color: rgb(0, 0, 0) })
      y -= 15
    }

    y -= 4

    const opts = [
      { label: 'A', text: q.option_1 },
      { label: 'B', text: q.option_2 },
      { label: 'C', text: q.option_3 },
      { label: 'D', text: q.option_4 },
    ].filter((o) => o.text)

    if (opts.length > 0) {
      // MCQ / Assertion-Reason: show lettered options
      for (const opt of opts) {
        const lines = wrapText(`${opt.label}) ${opt.text}`, CONTENT_WIDTH - 16, 10)
        ensureSpace(lines.length * 14 + 4)
        for (const line of lines) {
          page.drawText(line, { x: MARGIN + 16, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) })
          y -= 13
        }
      }
    } else {
      // Short Answer / Long Answer: draw blank writing lines
      const lineCount = q.question_type === 'Long Answer' ? 8 : 4
      for (let li = 0; li < lineCount; li++) {
        ensureSpace(24)
        page.drawLine({
          start: { x: MARGIN + 16, y: y - 4 },
          end: { x: PAGE_WIDTH - MARGIN, y: y - 4 },
          thickness: 0.4,
          color: rgb(0.75, 0.75, 0.75),
        })
        y -= 22
      }
    }

    if (q.hint) {
      y -= 4
      const isOpenEnded = opts.length === 0
      const hintPrefix = isOpenEnded ? 'Model answer: ' : 'Hint: '
      const hintLines = wrapText(hintPrefix + q.hint, CONTENT_WIDTH - 16, 9)
      ensureSpace(hintLines.length * 12 + 6)
      for (const line of hintLines) {
        page.drawText(line, { x: MARGIN + 16, y, size: 9, font, color: rgb(0.3, 0.5, 0.3) })
        y -= 12
      }
    }

    y -= 14

    if (i < selected.length - 1) {
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
