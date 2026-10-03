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

function downloadBase64Pdf(base64: string, filename: string) {
  const byteChars = atob(base64)
  const bytes = new Uint8Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i)
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function RemedyPage() {
  const supabase = createClient()

  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState('')

  // Latest batch + session picker
  const [latestBatch, setLatestBatch] = useState<{ id: string; uploaded_at: string } | null>(null)
  const [batchQuestionUids, setBatchQuestionUids] = useState<string[]>([])
  const [allSessions, setAllSessions] = useState<CurriculumEntry[]>([])
  const [sessionDates, setSessionDates] = useState<Record<string, string>>({})
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set())
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
    setAllSessions([])
    setSessionDates({})
    setSelectedSessionIds(new Set())
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
      .then(async ({ data: batches }) => {
        if (!batches?.length) { setLoadingSessions(false); return }
        setLatestBatch(batches[0]) // most recent, for display only

        // Get all question UIDs + batch IDs across ALL batches for this class
        const batchIds = batches.map((b) => b.id)
        const batchDateMap = new Map(batches.map((b) => [b.id, b.uploaded_at]))

        const { data: batchResps } = await supabase
          .from('responses')
          .select('question_uid, upload_batch_id')
          .in('upload_batch_id', batchIds)

        const uids = Array.from(new Set((batchResps ?? []).map((r) => r.question_uid)))
        setBatchQuestionUids(uids)

        if (!uids.length) { setLoadingSessions(false); return }

        // Map UIDs → curriculum entries (diagnostic questions only)
        const { data: qMeta } = await supabase
          .from('questions')
          .select('question_uid, curriculum_id')
          .in('question_uid', uids)
          .eq('is_remedy', false)

        // Build curriculum_id → latest response date
        const uidToBatchId = new Map((batchResps ?? []).map((r) => [r.question_uid, r.upload_batch_id]))
        const dateMap: Record<string, string> = {}
        for (const q of qMeta ?? []) {
          if (!q.curriculum_id) continue
          const date = batchDateMap.get(uidToBatchId.get(q.question_uid) ?? '') ?? ''
          if (!dateMap[q.curriculum_id] || date > dateMap[q.curriculum_id]) {
            dateMap[q.curriculum_id] = date
          }
        }

        const curricIds = Array.from(new Set((qMeta ?? []).filter((q) => q.curriculum_id).map((q) => q.curriculum_id)))
        const { data: sessions } = await supabase
          .from('curriculum')
          .select('id, unit, learning_goal')
          .in('id', curricIds)

        const sessionList = sessions ?? []
        setAllSessions(sessionList)
        setSessionDates(dateMap)
        // Default: all sessions selected
        setSelectedSessionIds(new Set(sessionList.map((s) => s.id)))
        setCoveredSessions(sessionList)
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

  // ── Session picker ─────────────────────────────────────────────────────────
  function toggleSession(id: string) {
    const next = new Set(selectedSessionIds)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelectedSessionIds(next)
    setCoveredSessions(allSessions.filter((s) => next.has(s.id)))
    setSessionScores([])
    setDetectedCodes([])
  }

  function selectAllSessions() {
    setSelectedSessionIds(new Set(allSessions.map((s) => s.id)))
    setCoveredSessions(allSessions)
    setSessionScores([])
    setDetectedCodes([])
  }

  function clearAllSessions() {
    setSelectedSessionIds(new Set())
    setCoveredSessions([])
    setSessionScores([])
    setDetectedCodes([])
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
          let errMsg = 'Failed to generate PDF.'
          try { errMsg = (await res.json()).error ?? errMsg } catch { /* non-JSON body */ }
          setGenError(`Error for ${sid}: ${errMsg}`)
          continue
        }

        const { questionsPdf, answersPdf } = (await res.json()) as {
          questionsPdf: string
          answersPdf: string
        }
        const studentName = students.find((s) => s.student_id === sid)?.name ?? sid
        downloadBase64Pdf(questionsPdf, `remedy-${studentName}-${sid}.pdf`)
        await new Promise((resolve) => setTimeout(resolve, 150))
        downloadBase64Pdf(answersPdf, `remedy-answers-${studentName}-${sid}.pdf`)

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

      {/* Session picker */}
      {selectedClass && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium">Sessions to include</h2>
            {allSessions.length > 0 && (
              <div className="flex gap-3">
                <button onClick={selectAllSessions} className="text-xs text-blue-600 hover:underline">All</button>
                <button onClick={clearAllSessions} className="text-xs text-gray-400 hover:underline">Clear</button>
              </div>
            )}
          </div>

          {loadingSessions && <p className="text-sm text-gray-400">Detecting sessions…</p>}
          {!loadingSessions && !latestBatch && (
            <p className="text-sm text-gray-400">No responses uploaded for this class yet.</p>
          )}
          {!loadingSessions && latestBatch && !allSessions.length && (
            <p className="text-sm text-gray-400">No sessions detected in uploads.</p>
          )}
          {allSessions.length > 0 && (
            <ul className="space-y-2">
              {allSessions.map((s) => (
                <li key={s.id} className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id={`session-${s.id}`}
                    checked={selectedSessionIds.has(s.id)}
                    onChange={() => toggleSession(s.id)}
                    className="mt-0.5 cursor-pointer"
                  />
                  <label htmlFor={`session-${s.id}`} className="flex-1 text-sm cursor-pointer">
                    <span className="text-gray-400 text-xs">{s.unit} · </span>
                    {s.learning_goal}
                  </label>
                  {sessionDates[s.id] && (
                    <span className="text-xs text-gray-400 shrink-0 mt-0.5">
                      {new Date(sessionDates[s.id]).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                  )}
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
