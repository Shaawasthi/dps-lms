'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Papa from 'papaparse'

type Class = { class_uid: string }
type CurriculumEntry = {
  id: string
  class_uid: string
  unit: string
  learning_goal: string
}
type Question = {
  question_uid: string
  question_text: string
  level: string
  is_remedy: boolean
  curriculum_id: string
}

export default function QuestionsPage() {
  const supabase = createClient()
  const [classes, setClasses] = useState<Class[]>([])
  const [curriculum, setCurriculum] = useState<CurriculumEntry[]>([])
  const [questions, setQuestions] = useState<Question[]>([])

  const [filterClass, setFilterClass] = useState('')
  const [filterUnit, setFilterUnit] = useState('')
  const [filterGoal, setFilterGoal] = useState('')
  const [filterLevel, setFilterLevel] = useState('')

  const [uploadStatus, setUploadStatus] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase
      .from('classes')
      .select('class_uid')
      .then(({ data }) => setClasses(data ?? []))
  }, [])

  useEffect(() => {
    if (!filterClass) {
      setCurriculum([])
      return
    }
    supabase
      .from('curriculum')
      .select('*')
      .eq('class_uid', filterClass)
      .then(({ data }) => setCurriculum(data ?? []))
  }, [filterClass])

  useEffect(() => {
    fetchQuestions()
  }, [filterClass, filterUnit, filterGoal, filterLevel])

  async function fetchQuestions() {
    const curriculumIds = curriculum
      .filter(
        (c) =>
          (!filterUnit || c.unit === filterUnit) &&
          (!filterGoal || c.learning_goal === filterGoal)
      )
      .map((c) => c.id)

    let q = supabase
      .from('questions')
      .select('question_uid, question_text, level, is_remedy, curriculum_id')
      .order('question_uid')
      .limit(200)

    if (filterClass && curriculumIds.length > 0) {
      q = q.in('curriculum_id', curriculumIds)
    } else if (filterClass && curriculumIds.length === 0 && curriculum.length > 0) {
      setQuestions([])
      return
    }

    if (filterLevel) q = q.eq('level', filterLevel)

    const { data } = await q
    setQuestions(data ?? [])
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    setUploadStatus('')
    const file = fileRef.current?.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        const rows = result.data as Array<Record<string, string>>

        // Build curriculum lookup map using grade+subject+unit+learning_goal
        const needsLookup = rows.some((r) => !r.curriculum_id && r.grade && r.subject && r.unit && r.learning_goal)
        const idMap = new Map<string, string>()

        if (needsLookup) {
          const grades = Array.from(new Set(rows.map((r) => r.grade).filter(Boolean)))
          const { data: curriculumData } = await supabase
            .from('curriculum')
            .select('id, grade, subject, unit, learning_goal')
            .in('grade', grades)

          for (const c of curriculumData ?? []) {
            idMap.set(`${c.grade}||${c.subject}||${c.unit}||${c.learning_goal}`, c.id)
          }
        }

        const records = rows.map((r) => {
          const curriculumId = r.curriculum_id ||
            idMap.get(`${r.grade}||${r.subject}||${r.unit}||${r.learning_goal}`) ||
            null
          return {
            question_uid: r.question_uid,
            curriculum_id: curriculumId,
            question_text: r.question_text,
            option_1: r.option_1 || null,
            option_2: r.option_2 || null,
            option_3: r.option_3 || null,
            option_4: r.option_4 || null,
            option_1_tag: r.option_1_tag || null,
            option_2_tag: r.option_2_tag || null,
            option_3_tag: r.option_3_tag || null,
            option_4_tag: r.option_4_tag || null,
            correct_answer: r.correct_answer,
            level: r.level || null,
            hint: r.hint || null,
            image_url: r.image_url || null,
            is_remedy: r.is_remedy === 'true' || r.is_remedy === '1',
          }
        })

        const missingCurriculum = records.filter((r) => !r.curriculum_id)
        if (missingCurriculum.length > 0) {
          setUploadStatus(
            `Error: ${missingCurriculum.length} row(s) have no matching curriculum entry. ` +
            `Upload the curriculum CSV first, or check grade/subject/unit/learning_goal values.`
          )
          return
        }

        const { error } = await supabase
          .from('questions')
          .upsert(records, { onConflict: 'question_uid' })

        if (error) {
          setUploadStatus('Error: ' + error.message)
        } else {
          setUploadStatus(`Uploaded ${records.length} questions.`)
          if (fileRef.current) fileRef.current.value = ''
          fetchQuestions()
        }
      },
    })
  }

  const units = Array.from(new Set(curriculum.map((c) => c.unit)))
  const goals = Array.from(
    new Set(
      curriculum
        .filter((c) => !filterUnit || c.unit === filterUnit)
        .map((c) => c.learning_goal)
    )
  )

  return (
    <div className="max-w-5xl space-y-8">
      <h1 className="text-xl font-semibold">Questions</h1>

      {/* Upload */}
      <section className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="font-medium mb-1">Upload Questions (CSV)</h2>
        <p className="text-xs text-gray-500 mb-1">
          Columns: <span className="font-mono">question_uid, grade, subject, unit, learning_goal, question_text, option_1, option_1_tag, option_2, option_2_tag, option_3, option_3_tag, option_4, option_4_tag, correct_answer, level, hint, is_remedy</span>
        </p>
        <p className="text-xs text-gray-400 mb-4">
          Use <span className="font-mono">grade + subject + unit + learning_goal</span> to link questions to curriculum (upload curriculum CSV first).
        </p>
        <form onSubmit={handleUpload} className="flex items-center gap-3">
          <input ref={fileRef} type="file" accept=".csv" required />
          <button
            type="submit"
            className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700"
          >
            Upload
          </button>
        </form>
        {uploadStatus && (
          <p
            className={`mt-2 text-sm ${uploadStatus.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}
          >
            {uploadStatus}
          </p>
        )}
      </section>

      {/* Filters */}
      <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex flex-wrap gap-3">
          <select
            value={filterClass}
            onChange={(e) => {
              setFilterClass(e.target.value)
              setFilterUnit('')
              setFilterGoal('')
            }}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.class_uid} value={c.class_uid}>
                {c.class_uid}
              </option>
            ))}
          </select>

          <select
            value={filterUnit}
            onChange={(e) => {
              setFilterUnit(e.target.value)
              setFilterGoal('')
            }}
            disabled={!filterClass}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm disabled:opacity-50"
          >
            <option value="">All units</option>
            {units.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>

          <select
            value={filterGoal}
            onChange={(e) => setFilterGoal(e.target.value)}
            disabled={!filterUnit}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm disabled:opacity-50"
          >
            <option value="">All goals</option>
            {goals.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="">All levels</option>
            <option value="Theory">Theory</option>
            <option value="Understanding">Understanding</option>
            <option value="Application">Application</option>
          </select>
        </div>

        {questions.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-500">No questions.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                {['UID', 'Question', 'Level', 'Remedy'].map((h) => (
                  <th key={h} className="px-4 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {questions.map((q) => (
                <tr key={q.question_uid}>
                  <td className="px-4 py-2 font-mono text-xs whitespace-nowrap">
                    {q.question_uid}
                  </td>
                  <td className="px-4 py-2 max-w-sm truncate">
                    {q.question_text}
                  </td>
                  <td className="px-4 py-2">{q.level}</td>
                  <td className="px-4 py-2">
                    {q.is_remedy ? (
                      <span className="text-green-700 text-xs font-medium">
                        Yes
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">No</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
