'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Papa from 'papaparse'

type Class = { class_uid: string }
type CurriculumEntry = { id: string; unit: string; learning_goal: string }
type Question = {
  question_uid: string
  question_text: string
  level: string | null
  is_remedy: boolean
  curriculum_id: string | null
}
type QuestionDetail = {
  question_uid: string
  question_text: string
  option_1: string | null
  option_1_tag: string | null
  option_2: string | null
  option_2_tag: string | null
  option_3: string | null
  option_3_tag: string | null
  option_4: string | null
  option_4_tag: string | null
  correct_answer: string
  level: string | null
  hint: string | null
  is_remedy: boolean
  curriculum_id: string | null
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const
const LEVELS = ['Theory', 'Understanding', 'Application']

export default function QuestionsPage() {
  const supabase = createClient()
  const [classes, setClasses] = useState<Class[]>([])
  const [curriculum, setCurriculum] = useState<CurriculumEntry[]>([])
  const [questions, setQuestions] = useState<Question[]>([])

  const [filterClass, setFilterClass] = useState('')
  const [filterUnit, setFilterUnit] = useState('')
  const [filterGoal, setFilterGoal] = useState('')
  const [filterLevel, setFilterLevel] = useState('')

  const [selected, setSelected] = useState<QuestionDetail | null>(null)
  const [editForm, setEditForm] = useState<QuestionDetail | null>(null)
  const [curriculumLabel, setCurriculumLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  const [uploadStatus, setUploadStatus] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.from('classes').select('class_uid').then(({ data }) => setClasses(data ?? []))
  }, [])

  useEffect(() => {
    if (!filterClass) { setCurriculum([]); return }
    supabase
      .from('classes').select('grade, subject').eq('class_uid', filterClass).single()
      .then(({ data: ci }) => {
        if (!ci) return setCurriculum([])
        supabase
          .from('curriculum').select('id, unit, learning_goal')
          .eq('grade', ci.grade).eq('subject', ci.subject)
          .then(({ data }) => setCurriculum(data ?? []))
      })
  }, [filterClass])

  useEffect(() => { fetchQuestions() }, [filterClass, filterUnit, filterGoal, filterLevel, curriculum])

  async function fetchQuestions() {
    const curriculumIds = curriculum
      .filter((c) => (!filterUnit || c.unit === filterUnit) && (!filterGoal || c.learning_goal === filterGoal))
      .map((c) => c.id)

    let q = supabase
      .from('questions')
      .select('question_uid, question_text, level, is_remedy, curriculum_id')
      .order('question_uid')
      .limit(500)

    if (filterClass && curriculumIds.length > 0) q = q.in('curriculum_id', curriculumIds)
    else if (filterClass && curriculum.length > 0) { setQuestions([]); return }
    if (filterLevel) q = q.eq('level', filterLevel)

    const { data } = await q
    setQuestions(data ?? [])
  }

  async function handleSelectQuestion(uid: string) {
    setSaveMsg('')
    const { data } = await supabase.from('questions').select('*').eq('question_uid', uid).single()
    if (!data) return
    setSelected(data)
    setEditForm(data)
    if (data.curriculum_id) {
      const { data: c } = await supabase
        .from('curriculum').select('unit, learning_goal').eq('id', data.curriculum_id).single()
      setCurriculumLabel(c ? `${c.unit} — ${c.learning_goal}` : data.curriculum_id)
    } else {
      setCurriculumLabel('—')
    }
  }

  function setField<K extends keyof QuestionDetail>(key: K, value: QuestionDetail[K]) {
    setEditForm((f) => f ? { ...f, [key]: value } : f)
  }

  async function handleSave() {
    if (!editForm) return
    setSaving(true)
    setSaveMsg('')
    const { error } = await supabase.from('questions').update({
      question_text: editForm.question_text,
      option_1: editForm.option_1 || null,
      option_1_tag: editForm.option_1_tag || null,
      option_2: editForm.option_2 || null,
      option_2_tag: editForm.option_2_tag || null,
      option_3: editForm.option_3 || null,
      option_3_tag: editForm.option_3_tag || null,
      option_4: editForm.option_4 || null,
      option_4_tag: editForm.option_4_tag || null,
      correct_answer: editForm.correct_answer,
      level: editForm.level,
      hint: editForm.hint || null,
      is_remedy: editForm.is_remedy,
    }).eq('question_uid', editForm.question_uid)
    setSaving(false)
    if (error) { setSaveMsg('Error: ' + error.message); return }
    setSaveMsg('Saved.')
    setSelected(editForm)
    fetchQuestions()
  }

  async function handleDelete() {
    if (!selected || !confirm(`Delete question ${selected.question_uid}?`)) return
    await supabase.from('questions').delete().eq('question_uid', selected.question_uid)
    setSelected(null)
    setEditForm(null)
    setCurriculumLabel('')
    fetchQuestions()
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
        const needsLookup = rows.some((r) => !r.curriculum_id && r.grade && r.subject && r.unit && r.learning_goal)
        const idMap = new Map<string, string>()
        if (needsLookup) {
          const grades = Array.from(new Set(rows.map((r) => r.grade).filter(Boolean)))
          const { data: cd } = await supabase.from('curriculum').select('id, grade, subject, unit, learning_goal').in('grade', grades)
          for (const c of cd ?? []) idMap.set(`${c.grade}||${c.subject}||${c.unit}||${c.learning_goal}`, c.id)
        }
        const records = rows.map((r) => ({
          question_uid: r.question_uid,
          curriculum_id: r.curriculum_id || idMap.get(`${r.grade}||${r.subject}||${r.unit}||${r.learning_goal}`) || null,
          question_text: r.question_text,
          option_1: r.option_1 || null, option_1_tag: r.option_1_tag || null,
          option_2: r.option_2 || null, option_2_tag: r.option_2_tag || null,
          option_3: r.option_3 || null, option_3_tag: r.option_3_tag || null,
          option_4: r.option_4 || null, option_4_tag: r.option_4_tag || null,
          correct_answer: r.correct_answer,
          level: r.level || null, hint: r.hint || null,
          image_url: r.image_url || null,
          is_remedy: r.is_remedy === 'true' || r.is_remedy === '1',
        }))
        const missing = records.filter((r) => !r.curriculum_id)
        if (missing.length) {
          setUploadStatus(`Error: ${missing.length} row(s) have no matching curriculum. Upload curriculum CSV first.`)
          return
        }
        const { error } = await supabase.from('questions').upsert(records, { onConflict: 'question_uid' })
        if (error) { setUploadStatus('Error: ' + error.message); return }
        setUploadStatus(`Uploaded ${records.length} questions.`)
        if (fileRef.current) fileRef.current.value = ''
        fetchQuestions()
      },
    })
  }

  const units = Array.from(new Set(curriculum.map((c) => c.unit)))
  const goals = Array.from(new Set(curriculum.filter((c) => !filterUnit || c.unit === filterUnit).map((c) => c.learning_goal)))

  const optionKeys = [
    ['option_1', 'option_1_tag'],
    ['option_2', 'option_2_tag'],
    ['option_3', 'option_3_tag'],
    ['option_4', 'option_4_tag'],
  ] as const

  return (
    <div className="max-w-6xl space-y-6">
      <h1 className="text-xl font-semibold">Questions</h1>

      {/* Upload */}
      <section className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="font-medium mb-1">Upload Questions (CSV)</h2>
        <p className="text-xs text-gray-500 mb-1">
          Columns: <span className="font-mono">question_uid, grade, subject, unit, learning_goal, question_text, option_1, option_1_tag, option_2, option_2_tag, option_3, option_3_tag, option_4, option_4_tag, correct_answer, level, hint, is_remedy</span>
        </p>
        <form onSubmit={handleUpload} className="flex items-center gap-3 mt-3">
          <input ref={fileRef} type="file" accept=".csv" required />
          <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700">Upload</button>
        </form>
        {uploadStatus && (
          <p className={`mt-2 text-sm ${uploadStatus.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>{uploadStatus}</p>
        )}
      </section>

      {/* Filters + split panel */}
      <div className="grid grid-cols-5 gap-4 items-start">
        {/* Left: filters + list */}
        <div className="col-span-2 space-y-3">
          {/* Filters */}
          <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
            <select value={filterClass} onChange={(e) => { setFilterClass(e.target.value); setFilterUnit(''); setFilterGoal('') }}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
              <option value="">All classes</option>
              {classes.map((c) => <option key={c.class_uid} value={c.class_uid}>{c.class_uid}</option>)}
            </select>
            <select value={filterUnit} onChange={(e) => { setFilterUnit(e.target.value); setFilterGoal('') }}
              disabled={!filterClass} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm disabled:opacity-50">
              <option value="">All units</option>
              {units.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <select value={filterGoal} onChange={(e) => setFilterGoal(e.target.value)}
              disabled={!filterUnit} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm disabled:opacity-50">
              <option value="">All goals</option>
              {goals.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
              <option value="">All levels</option>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          {/* Question list */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <p className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
              {questions.length} question{questions.length !== 1 ? 's' : ''}
            </p>
            {questions.length === 0 ? (
              <p className="px-3 py-4 text-sm text-gray-400">No questions.</p>
            ) : (
              <ul className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
                {questions.map((q) => (
                  <li
                    key={q.question_uid}
                    onClick={() => handleSelectQuestion(q.question_uid)}
                    className={`px-3 py-2.5 cursor-pointer hover:bg-gray-50 ${selected?.question_uid === q.question_uid ? 'bg-blue-50 border-l-2 border-blue-500' : ''}`}
                  >
                    <p className="font-mono text-xs text-gray-400">{q.question_uid}</p>
                    <p className="text-sm text-gray-800 line-clamp-2 leading-snug mt-0.5">{q.question_text}</p>
                    <div className="flex gap-2 mt-1">
                      {q.level && <span className="text-xs text-blue-600 font-medium">{q.level}</span>}
                      {q.is_remedy && <span className="text-xs text-green-600 font-medium">Remedy</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right: detail / edit */}
        <div className="col-span-3">
          {!editForm ? (
            <div className="bg-white border border-gray-200 rounded-lg flex items-center justify-center py-24 text-sm text-gray-400">
              Select a question to view and edit
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <span className="font-mono text-sm font-semibold text-gray-700">{editForm.question_uid}</span>
                <button onClick={handleDelete} className="text-xs text-red-400 hover:text-red-600">Delete</button>
              </div>

              <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Curriculum link */}
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Curriculum</p>
                  <p className="text-xs text-gray-600">{curriculumLabel}</p>
                </div>

                {/* Level + Remedy row */}
                <div className="flex gap-4 items-center">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Level</label>
                    <select
                      value={editForm.level ?? ''}
                      onChange={(e) => setField('level', e.target.value || null)}
                      className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                    >
                      <option value="">—</option>
                      {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <input
                      type="checkbox"
                      id="is_remedy"
                      checked={editForm.is_remedy}
                      onChange={(e) => setField('is_remedy', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor="is_remedy" className="text-sm text-gray-700">Remedy question</label>
                  </div>
                </div>

                {/* Correct answer */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Correct Answer</label>
                  <select
                    value={editForm.correct_answer}
                    onChange={(e) => setField('correct_answer', e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                  >
                    {OPTION_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

                {/* Question text */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Question Text</label>
                  <textarea
                    value={editForm.question_text}
                    onChange={(e) => setField('question_text', e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-y"
                  />
                </div>

                {/* Options */}
                <div>
                  <p className="text-xs text-gray-500 mb-2">Options <span className="text-gray-400">(text · misconception tag)</span></p>
                  <div className="space-y-2">
                    {optionKeys.map(([optKey, tagKey], i) => (
                      <div key={optKey} className="flex gap-2 items-center">
                        <span className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded text-xs font-bold ${
                          editForm.correct_answer === OPTION_LABELS[i]
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {OPTION_LABELS[i]}
                        </span>
                        <input
                          value={editForm[optKey] ?? ''}
                          onChange={(e) => setField(optKey, e.target.value || null)}
                          placeholder={`Option ${OPTION_LABELS[i]}`}
                          className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm"
                        />
                        <input
                          value={editForm[tagKey] ?? ''}
                          onChange={(e) => setField(tagKey, e.target.value || null)}
                          placeholder="tag"
                          className="w-24 border border-gray-300 rounded px-2 py-1.5 text-xs font-mono"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hint */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Hint</label>
                  <textarea
                    value={editForm.hint ?? ''}
                    onChange={(e) => setField('hint', e.target.value || null)}
                    rows={2}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-y"
                  />
                </div>

                {/* Save */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                  {saveMsg && (
                    <span className={`text-sm ${saveMsg.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>
                      {saveMsg}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
