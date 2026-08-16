'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Class = { class_uid: string }
type Student = { student_id: string; name: string }
type CurriculumEntry = { id: string; unit: string; learning_goal: string }
type LevelScore = { level: string; correct: number; total: number }
type SessionScore = { session: CurriculumEntry; levels: LevelScore[] }

const ALL_STUDENTS = '__all__'
const LEVELS = ['Theory', 'Understanding', 'Application'] as const

// L = Lower (Understand)  M = Middle (Apply/Analyze)  H = Higher (Evaluate/Create)
// Difficulty split within each group: 40% Easy · 30% Medium · 30% Hard
function distributionLabel(miscCount: number) {
  if (miscCount === 0) return '0L / 6M / 14H'
  if (miscCount === 1) return '6L / 4M / 10H'
  if (miscCount === 2) return '6L / 6M / 8H'
  return '10L / 6M / 4H'
}

export default function RemedyPage() {
  const supabase = createClient()

  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState('')

  // Latest batch + auto-detected covered sessions
  const [latestBatch, setLatestBatch] = useState<{ id: string; uploaded_at: string } | null>(null)
  const [batchQuestionUids, setBatchQuestionUids] = useState<string[]>([])
  const [coveredSessions, setCoveredSessions] = useState<CurriculumEntry[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)

  // Per-student score breakdown and detected misconceptions
  const [sessionScores, setSessionScores] = useState<SessionScore[]>([])
  const [detectedCodes, setDetectedCodes] = useState<string[]>([])
  const [loadingScores, setLoadingScores] = useState(false)

  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState('')
  const [genError, setGenError] = useState('')

  // ── Load classes ───────────────────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from('classes')
      .select('class_uid')
      .then(({ data }) => setClasses(data ?? []))
  }, [])

  // ── On class change: load students + detect covered sessions ───────────────
  useEffect(() => {
    if (!selectedClass) return
    setSelectedStudent('')
    setCoveredSessions([])
    setBatchQuestionUids([])
    setLatestBatch(null)
    setSessionScores([])
    setDetectedCodes([])

    supabase
      .from('students')
      .select('student_id, name')
      .eq('class_uid', selectedClass)
      .order('name')
      .then(({ data }) => setStudents(data ?? []))

    setLoadingSessions(true)
    supabase
      .from('upload_batches')
      .select('id, uploaded_at')
      .eq('class_uid', selectedClass)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .then(async ({ data: batches }) => {
        if (!batches?.length) { setLoadingSessions(false); return }
        const batch = batches[0]
        setLatestBatch(batch)

        // Get all question UIDs from the batch's responses
        const { data: batchResps } = await supabase
          .from('responses')
          .select('question_uid')
          .eq('upload_batch_id', batch.id)

        const uids = Array.from(new Set((batchResps ?? []).map((r) => r.question_uid)))
        setBatchQuestionUids(uids)

        if (!uids.length) { setLoadingSessions(false); return }

        // Map UIDs → curriculum entries
        const { data: qMeta } = await supabase
          .from('questions')
          .select('curriculum_id')
          .in('question_uid', uids)

        const curricIds = Array.from(new Set((qMeta ?? []).map((q) => q.curriculum_id)))
        const { data: sessions } = await supabase
          .from('curriculum')
          .select('id, unit, learning_goal')
          .in('id', curricIds)

        setCoveredSessions(sessions ?? [])
        setLoadingSessions(false)
      })
  }, [selectedClass])

  // ── On student change: compute per-session scores + misconceptions ──────────
  useEffect(() => {
    setSessionScores([])
    setDetectedCodes([])
    if (
      !selectedStudent ||
      selectedStudent === ALL_STUDENTS ||
      !coveredSessions.length ||
      !batchQuestionUids.length
    )
      return
    setLoadingScores(true)
    computeStudentData(selectedStudent)
  }, [selectedStudent, coveredSessions, batchQuestionUids])

  async function computeStudentData(studentId: string) {
    const curricIds = coveredSessions.map((s) => s.id)

    // Diagnostic question metas for covered sessions, intersected with batch UIDs
    const { data: qMetaRaw } = await supabase
      .from('questions')
      .select('question_uid, curriculum_id, level, option_1_tag, option_2_tag, option_3_tag, option_4_tag')
      .in('curriculum_id', curricIds)
      .in('question_uid', batchQuestionUids)
      .eq('is_remedy', false)

    const qMeta = qMetaRaw ?? []
    if (!qMeta.length) { setLoadingScores(false); return }

    // Student responses for those questions
    const { data: responses } = await supabase
      .from('responses')
      .select('question_uid, is_correct, response_option')
      .eq('student_id', studentId)
      .in('question_uid', qMeta.map((q) => q.question_uid))

    const resps = responses ?? []
    const qMap = new Map(qMeta.map((q) => [q.question_uid, q]))

    // Per-session, per-level scores
    const scores: SessionScore[] = coveredSessions.map((session) => ({
      session,
      levels: LEVELS.map((level) => {
        const levelUids = new Set(
          qMeta
            .filter((q) => q.curriculum_id === session.id && q.level === level)
            .map((q) => q.question_uid)
        )
        const lr = resps.filter((r) => levelUids.has(r.question_uid))
        return { level, correct: lr.filter((r) => r.is_correct).length, total: lr.length }
      }),
    }))
    setSessionScores(scores)

    // Detect misconception codes from wrong answers
    const codes = new Set<string>()
    for (const r of resps) {
      if (r.is_correct || !r.response_option) continue
      const meta = qMap.get(r.question_uid)
      if (!meta) continue
      const opt = r.response_option.toUpperCase()
      let tag: string | null = null
      if (opt === 'A' || opt === '1') tag = meta.option_1_tag
      else if (opt === 'B' || opt === '2') tag = meta.option_2_tag
      else if (opt === 'C' || opt === '3') tag = meta.option_3_tag
      else if (opt === 'D' || opt === '4') tag = meta.option_4_tag
      if (tag) codes.add(tag)
    }
    setDetectedCodes(Array.from(codes))
    setLoadingScores(false)
  }

  // ── Generate PDF(s) ────────────────────────────────────────────────────────
  async function handleGeneratePDF() {
    if (!selectedStudent || !coveredSessions.length) return
    setGenerating(true)
    setGenError('')
    setGenProgress('')

    const targets =
      selectedStudent === ALL_STUDENTS
        ? students.map((s) => s.student_id)
        : [selectedStudent]

    const curriculumIds = coveredSessions.map((s) => s.id)

    for (let i = 0; i < targets.length; i++) {
      const sid = targets[i]
      if (targets.length > 1) setGenProgress(`Generating ${i + 1} / ${targets.length}…`)

      try {
        const res = await fetch('/api/remedy-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ student_id: sid, curriculum_ids: curriculumIds }),
        })

        if (!res.ok) {
          const err = await res.json()
          setGenError(`Error for ${sid}: ${err.error ?? 'Failed to generate PDF.'}`)
          continue
        }

        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const studentName = students.find((s) => s.student_id === sid)?.name ?? sid
        a.download = `remedy-${studentName}-${sid}.pdf`
        a.click()
        URL.revokeObjectURL(url)

        if (i < targets.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 300))
        }
      } catch {
        setGenError(`Network error generating PDF for ${sid}.`)
      }
    }

    setGenerating(false)
    setGenProgress('')
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold">Remedy</h1>

      {/* Selectors */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Class</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="">Select class…</option>
            {classes.map((c) => (
              <option key={c.class_uid} value={c.class_uid}>{c.class_uid}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Student</label>
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            disabled={!selectedClass}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm disabled:opacity-50"
          >
            <option value="">Select student…</option>
            <option value={ALL_STUDENTS}>All students ({students.length})</option>
            {students.map((s) => (
              <option key={s.student_id} value={s.student_id}>
                {s.name} ({s.student_id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sessions from latest batch */}
      {selectedClass && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium">Sessions from latest upload</h2>
            {latestBatch && (
              <span className="text-xs text-gray-400">
                {new Date(latestBatch.uploaded_at).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
              </span>
            )}
          </div>

          {loadingSessions && (
            <p className="text-sm text-gray-400">Detecting sessions…</p>
          )}
          {!loadingSessions && !latestBatch && (
            <p className="text-sm text-gray-400">No responses uploaded for this class yet.</p>
          )}
          {!loadingSessions && latestBatch && !coveredSessions.length && (
            <p className="text-sm text-gray-400">No sessions detected in latest upload.</p>
          )}
          {coveredSessions.length > 0 && (
            <ul className="space-y-1.5">
              {coveredSessions.map((s) => (
                <li key={s.id} className="flex items-start gap-2 text-sm">
                  <span className="text-green-500 mt-px">✓</span>
                  <span>
                    <span className="text-gray-400 text-xs">{s.unit} · </span>
                    {s.learning_goal}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Score breakdown — individual student only */}
      {loadingScores && <p className="text-sm text-gray-400">Computing scores…</p>}

      {sessionScores.length > 0 && selectedStudent !== ALL_STUDENTS && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-medium">Score Breakdown</h2>
            <span className="text-xs text-gray-500 text-right">
              {detectedCodes.length} misconception{detectedCodes.length !== 1 ? 's' : ''} →{' '}
              <span
                className="font-mono font-medium"
                title="L: Understand · M: Apply/Analyze · H: Evaluate/Create · difficulty: 40% Easy / 30% Medium / 30% Hard"
              >
                {distributionLabel(detectedCodes.length)}
              </span>
            </span>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Session</th>
                {LEVELS.map((l) => (
                  <th key={l} className="px-4 py-2 font-medium text-center">{l}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sessionScores.map(({ session, levels }) => (
                <tr key={session.id}>
                  <td className="px-4 py-2 text-xs">{session.learning_goal}</td>
                  {levels.map((l) => {
                    const pct = l.total > 0 ? Math.round((l.correct / l.total) * 100) : null
                    return (
                      <td key={l.level} className="px-4 py-2 text-center text-xs">
                        {pct !== null ? `${pct}%` : '—'}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {detectedCodes.length > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-500">
              Misconceptions: {detectedCodes.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Generate */}
      {selectedStudent && coveredSessions.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleGeneratePDF}
            disabled={generating}
            className="bg-blue-600 text-white rounded px-5 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {generating
              ? genProgress || 'Generating PDF…'
              : selectedStudent === ALL_STUDENTS
              ? `Generate PDFs for All Students (${students.length})`
              : 'Generate Remedy PDF'}
          </button>
          {genError && <p className="text-sm text-red-600">{genError}</p>}
        </div>
      )}
    </div>
  )
}
