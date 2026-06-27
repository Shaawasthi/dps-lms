'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Class = { class_uid: string }
type Student = { student_id: string; name: string }
type CurriculumEntry = { id: string; unit: string; learning_goal: string }
type ScoreRow = { level: string; correct: number; total: number }

export default function RemedyPage() {
  const supabase = createClient()

  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState('')
  const [curriculum, setCurriculum] = useState<CurriculumEntry[]>([])
  const [units, setUnits] = useState<string[]>([])
  const [selectedUnit, setSelectedUnit] = useState('')
  const [goals, setGoals] = useState<CurriculumEntry[]>([])
  const [selectedCurriculumId, setSelectedCurriculumId] = useState('')
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreRow[]>([])
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')

  useEffect(() => {
    supabase
      .from('classes')
      .select('class_uid')
      .then(({ data }) => setClasses(data ?? []))
  }, [])

  useEffect(() => {
    if (!selectedClass) return
    supabase
      .from('students')
      .select('student_id, name')
      .eq('class_uid', selectedClass)
      .order('name')
      .then(({ data }) => setStudents(data ?? []))

    // Load curriculum for this class's grade+subject
    supabase
      .from('classes')
      .select('grade, subject')
      .eq('class_uid', selectedClass)
      .single()
      .then(({ data: classInfo }) => {
        if (!classInfo) return
        supabase
          .from('curriculum')
          .select('id, unit, learning_goal')
          .eq('grade', classInfo.grade)
          .eq('subject', classInfo.subject)
          .order('unit')
          .then(({ data }) => {
            setCurriculum(data ?? [])
            const uniqueUnits = Array.from(new Set((data ?? []).map((c) => c.unit)))
            setUnits(uniqueUnits)
          })
      })
  }, [selectedClass])

  useEffect(() => {
    if (!selectedUnit) {
      setGoals([])
      return
    }
    setGoals(curriculum.filter((c) => c.unit === selectedUnit))
    setSelectedCurriculumId('')
    setScoreBreakdown([])
  }, [selectedUnit, curriculum])

  useEffect(() => {
    if (!selectedCurriculumId || !selectedStudent) {
      setScoreBreakdown([])
      return
    }
    loadBreakdown(selectedStudent, selectedCurriculumId)
  }, [selectedCurriculumId, selectedStudent])

  async function loadBreakdown(studentId: string, curriculumId: string) {
    const { data: qMeta } = await supabase
      .from('questions')
      .select('question_uid, level')
      .eq('curriculum_id', curriculumId)

    if (!qMeta || qMeta.length === 0) {
      setScoreBreakdown([])
      return
    }

    const questionUids = qMeta.map((q) => q.question_uid)
    const { data: responses } = await supabase
      .from('responses')
      .select('question_uid, is_correct')
      .eq('student_id', studentId)
      .in('question_uid', questionUids)

    const LEVELS = ['Theory', 'Understanding', 'Application']
    const rows: ScoreRow[] = []
    for (const level of LEVELS) {
      const levelUids = new Set(
        qMeta.filter((q) => q.level === level).map((q) => q.question_uid)
      )
      const levelResps = (responses ?? []).filter((r) =>
        levelUids.has(r.question_uid)
      )
      rows.push({
        level,
        correct: levelResps.filter((r) => r.is_correct).length,
        total: levelResps.length,
      })
    }
    setScoreBreakdown(rows)
  }

  async function handleGeneratePDF() {
    if (!selectedStudent || !selectedCurriculumId) return
    setGenerating(true)
    setGenError('')

    try {
      const res = await fetch('/api/remedy-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudent,
          curriculum_id: selectedCurriculumId,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        setGenError(err.error ?? 'Failed to generate PDF.')
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `remedy-${selectedStudent}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setGenError('Network error generating PDF.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold">Remedy</h1>

      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        {/* Class */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Class</label>
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value)
              setSelectedStudent('')
              setSelectedUnit('')
              setSelectedCurriculumId('')
              setScoreBreakdown([])
            }}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="">Select class…</option>
            {classes.map((c) => (
              <option key={c.class_uid} value={c.class_uid}>
                {c.class_uid}
              </option>
            ))}
          </select>
        </div>

        {/* Student */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Student</label>
          <select
            value={selectedStudent}
            onChange={(e) => {
              setSelectedStudent(e.target.value)
              setScoreBreakdown([])
            }}
            disabled={!selectedClass}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm disabled:opacity-50"
          >
            <option value="">Select student…</option>
            {students.map((s) => (
              <option key={s.student_id} value={s.student_id}>
                {s.name} ({s.student_id})
              </option>
            ))}
          </select>
        </div>

        {/* Unit */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Unit</label>
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            disabled={!selectedClass}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm disabled:opacity-50"
          >
            <option value="">Select unit…</option>
            {units.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        {/* Learning goal */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Session</label>
          <select
            value={selectedCurriculumId}
            onChange={(e) => setSelectedCurriculumId(e.target.value)}
            disabled={!selectedUnit}
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm disabled:opacity-50"
          >
            <option value="">Select session…</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.learning_goal}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Score breakdown */}
      {scoreBreakdown.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <h2 className="font-medium px-5 py-4 border-b border-gray-200">
            Score Breakdown
          </h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Level</th>
                <th className="px-4 py-2 font-medium">Score</th>
                <th className="px-4 py-2 font-medium">%</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {scoreBreakdown.map((row) => {
                const pct =
                  row.total > 0
                    ? Math.round((row.correct / row.total) * 100)
                    : null
                return (
                  <tr key={row.level}>
                    <td className="px-4 py-2">{row.level}</td>
                    <td className="px-4 py-2">
                      {row.total > 0
                        ? `${row.correct} / ${row.total}`
                        : 'No data'}
                    </td>
                    <td className="px-4 py-2">{pct !== null ? `${pct}%` : '—'}</td>
                    <td className="px-4 py-2">
                      {pct === null ? (
                        <span className="text-gray-400 text-xs">—</span>
                      ) : pct >= 60 ? (
                        <span className="text-green-700 text-xs font-medium">
                          Pass
                        </span>
                      ) : (
                        <span className="text-red-600 text-xs font-medium">
                          Fail
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Generate button */}
      {selectedStudent && selectedCurriculumId && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleGeneratePDF}
            disabled={generating}
            className="bg-blue-600 text-white rounded px-5 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {generating ? 'Generating PDF…' : 'Generate Remedy PDF'}
          </button>
          {genError && <p className="text-sm text-red-600">{genError}</p>}
        </div>
      )}
    </div>
  )
}
