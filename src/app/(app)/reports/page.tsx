'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Class = { class_uid: string }
type Student = { student_id: string; name: string; roll_number: string }
type CurriculumEntry = { id: string; unit: string; learning_goal: string }
type Response = {
  question_uid: string
  student_id: string
  is_correct: boolean
}
type QuestionMeta = {
  question_uid: string
  curriculum_id: string
  level: string
}

type ScoreKey = `${string}||${string}||${string}` // student_id||curriculum_id||level

const LEVELS = ['Theory', 'Understanding', 'Application'] as const

export default function ReportsPage() {
  const supabase = createClient()
  const [classes, setClasses] = useState<Class[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [curriculum, setCurriculum] = useState<CurriculumEntry[]>([])
  const [scores, setScores] = useState<
    Map<ScoreKey, { correct: number; total: number }>
  >(new Map())
  const [loading, setLoading] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  useEffect(() => {
    supabase
      .from('classes')
      .select('class_uid')
      .then(({ data }) => setClasses(data ?? []))
  }, [])

  useEffect(() => {
    if (!selectedClass) return
    setLoading(true)
    loadReport(selectedClass)
  }, [selectedClass])

  async function loadReport(classUid: string) {
    // Fetch the class's grade+subject, then load matching curriculum
    const { data: classInfo } = await supabase
      .from('classes')
      .select('grade, subject')
      .eq('class_uid', classUid)
      .single()

    const [{ data: studs }, { data: curric }] = await Promise.all([
      supabase
        .from('students')
        .select('student_id, name, roll_number')
        .eq('class_uid', classUid)
        .order('roll_number'),
      classInfo
        ? supabase
            .from('curriculum')
            .select('id, unit, learning_goal')
            .eq('grade', classInfo.grade)
            .eq('subject', classInfo.subject)
        : Promise.resolve({ data: [] }),
    ])

    setStudents(studs ?? [])
    setCurriculum(curric ?? [])

    const curricIds = (curric ?? []).map((c) => c.id)
    if (curricIds.length === 0) {
      setScores(new Map())
      setLoading(false)
      return
    }

    const { data: qMeta } = await supabase
      .from('questions')
      .select('question_uid, curriculum_id, level')
      .in('curriculum_id', curricIds)

    const studentIds = (studs ?? []).map((s) => s.student_id)
    const questionUids = (qMeta ?? []).map((q) => q.question_uid)

    if (questionUids.length === 0 || studentIds.length === 0) {
      setScores(new Map())
      setLoading(false)
      return
    }

    const { data: resps } = await supabase
      .from('responses')
      .select('question_uid, student_id, is_correct')
      .in('student_id', studentIds)
      .in('question_uid', questionUids)

    const qMap = new Map<string, QuestionMeta>(
      (qMeta ?? []).map((q) => [q.question_uid, q])
    )

    const scoreMap = new Map<ScoreKey, { correct: number; total: number }>()
    for (const r of resps ?? []) {
      const q = qMap.get(r.question_uid)
      if (!q || !q.level) continue
      const key: ScoreKey = `${r.student_id}||${q.curriculum_id}||${q.level}`
      const prev = scoreMap.get(key) ?? { correct: 0, total: 0 }
      scoreMap.set(key, {
        correct: prev.correct + (r.is_correct ? 1 : 0),
        total: prev.total + 1,
      })
    }

    setScores(scoreMap)
    setLoading(false)
  }

  function pct(student_id: string, curriculum_id: string, level: string) {
    const key: ScoreKey = `${student_id}||${curriculum_id}||${level}`
    const s = scores.get(key)
    if (!s || s.total === 0) return null
    return Math.round((s.correct / s.total) * 100)
  }

  function cellColor(p: number | null) {
    if (p === null) return 'bg-gray-50 text-gray-300'
    if (p >= 60) return 'bg-green-50 text-green-800'
    return 'bg-red-50 text-red-700'
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Reports</h1>

      <div className="flex items-center gap-3">
        <select
          value={selectedClass}
          onChange={(e) => {
            setSelectedClass(e.target.value)
            setSelectedStudent(null)
          }}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm"
        >
          <option value="">Select class…</option>
          {classes.map((c) => (
            <option key={c.class_uid} value={c.class_uid}>
              {c.class_uid}
            </option>
          ))}
        </select>
        {selectedStudent && (
          <button
            onClick={() => setSelectedStudent(null)}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Back to class view
          </button>
        )}
      </div>

      {loading && (
        <p className="text-sm text-gray-500">Loading report…</p>
      )}

      {/* Student detail view */}
      {selectedStudent && !loading && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="font-medium">
              {selectedStudent.name}{' '}
              <span className="text-gray-400 font-normal text-sm">
                ({selectedStudent.student_id})
              </span>
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Unit</th>
                <th className="px-4 py-2 font-medium">Learning Goal</th>
                {LEVELS.map((l) => (
                  <th key={l} className="px-4 py-2 font-medium">
                    {l}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {curriculum.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2">{c.unit}</td>
                  <td className="px-4 py-2">{c.learning_goal}</td>
                  {LEVELS.map((l) => {
                    const p = pct(selectedStudent.student_id, c.id, l)
                    return (
                      <td
                        key={l}
                        className={`px-4 py-2 text-center font-medium ${cellColor(p)}`}
                      >
                        {p !== null ? `${p}%` : '—'}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Class matrix */}
      {!selectedStudent && selectedClass && !loading && students.length > 0 && (
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white border border-gray-200 px-3 py-2 text-left font-medium whitespace-nowrap">
                  Student
                </th>
                {curriculum.map((c) =>
                  LEVELS.map((l) => (
                    <th
                      key={`${c.id}-${l}`}
                      className="border border-gray-200 px-2 py-1 font-medium text-gray-500 max-w-[60px] whitespace-nowrap overflow-hidden"
                      title={`${c.learning_goal} – ${l}`}
                    >
                      {c.unit.slice(0, 8)}…{l[0]}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.student_id} className="hover:bg-gray-50">
                  <td className="sticky left-0 bg-white border border-gray-200 px-3 py-1.5 whitespace-nowrap">
                    <button
                      onClick={() => setSelectedStudent(s)}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {s.name}
                    </button>
                  </td>
                  {curriculum.map((c) =>
                    LEVELS.map((l) => {
                      const p = pct(s.student_id, c.id, l)
                      return (
                        <td
                          key={`${c.id}-${l}`}
                          className={`border border-gray-200 px-2 py-1.5 text-center font-medium ${cellColor(p)}`}
                        >
                          {p !== null ? `${p}%` : '—'}
                        </td>
                      )
                    })
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!selectedStudent &&
        selectedClass &&
        !loading &&
        students.length === 0 && (
          <p className="text-sm text-gray-500">
            No students found for this class.
          </p>
        )}
    </div>
  )
}
