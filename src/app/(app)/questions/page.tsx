'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Papa from 'papaparse'
import { downloadSampleCsv } from '@/lib/downloadCsv'
import { useRole } from '@/context/RoleContext'

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

type QType = 'diagnostic' | 'remedy'
const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const
const LEVELS = ['Theory', 'Understanding', 'Application']
const optionKeys = [
  ['option_1', 'option_1_tag'],
  ['option_2', 'option_2_tag'],
  ['option_3', 'option_3_tag'],
  ['option_4', 'option_4_tag'],
] as const

export default function QuestionsPage() {
  const supabase = createClient()
  const role = useRole()
  const isAdmin = role === 'admin'

  const [classes, setClasses] = useState<Class[]>([])
  const [curriculum, setCurriculum] = useState<CurriculumEntry[]>([])
  const [questions, setQuestions] = useState<Question[]>([])

  const [qType, setQType] = useState<QType>('diagnostic')
  const [filterClass, setFilterClass] = useState('')
  const [filterUnit, setFilterUnit] = useState('')
  const [filterLevel, setFilterLevel] = useState('')

  // Multi-select sessions
  const [selectedCurriculumIds, setSelectedCurriculumIds] = useState<string[]>([])
  const [sessionDropdownOpen, setSessionDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [selected, setSelected] = useState<QuestionDetail | null>(null)
  const [editForm, setEditForm] = useState<QuestionDetail | null>(null)
  const [curriculumLabel, setCurriculumLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')

  const [uploadStatus, setUploadStatus] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Click-outside to close session dropdown
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSessionDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    supabase.from('classes').select('class_uid').then(({ data }) => setClasses(data ?? []))
  }, [])

  useEffect(() => {
    if (!filterClass) { setCurriculum([]); return }
    supabase.from('classes').select('grade, subject').eq('class_uid', filterClass).single()
      .then(({ data: ci }) => {
        if (!ci) return setCurriculum([])
        supabase.from('curriculum').select('id, unit, learning_goal')
          .eq('grade', ci.grade).eq('subject', ci.subject)
          .then(({ data }) => setCurriculum(data ?? []))
      })
    setSelectedCurriculumIds([])
    setFilterUnit('')
  }, [filterClass])

  useEffect(() => {
    setSelectedCurriculumIds([])
    setSessionDropdownOpen(false)
  }, [filterUnit])

  useEffect(() => { fetchQuestions() }, [qType, filterClass, filterUnit, selectedCurriculumIds, filterLevel, curriculum])

  async function fetchQuestions() {
    // Sessions in scope: if unit is selected, restrict to that unit; otherwise all
    const scopedIds = curriculum
      .filter((c) => !filterUnit || c.unit === filterUnit)
      .map((c) => c.id)

    // If user has chosen specific sessions, use those; otherwise use scoped ids
    const curriculumIds = selectedCurriculumIds.length > 0 ? selectedCurriculumIds : scopedIds

    let q = supabase
      .from('questions')
      .select('question_uid, question_text, level, is_remedy, curriculum_id')
      .eq('is_remedy', qType === 'remedy')
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
      const { data: c } = await supabase.from('curriculum').select('unit, learning_goal').eq('id', data.curriculum_id).single()
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
    setSaving(true); setSaveMsg('')
    const { error } = await supabase.from('questions').update({
      question_text: editForm.question_text,
      option_1: editForm.option_1 || null, option_1_tag: editForm.option_1_tag || null,
      option_2: editForm.option_2 || null, option_2_tag: editForm.option_2_tag || null,
      option_3: editForm.option_3 || null, option_3_tag: editForm.option_3_tag || null,
      option_4: editForm.option_4 || null, option_4_tag: editForm.option_4_tag || null,
      correct_answer: editForm.correct_answer, level: editForm.level,
      hint: editForm.hint || null, is_remedy: editForm.is_remedy,
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
    setSelected(null); setEditForm(null); setCurriculumLabel('')
    fetchQuestions()
  }

  async function handleDownloadClassTest() {
    setDownloading(true); setDownloadError('')
    try {
      const res = await fetch('/api/class-test-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ curriculum_ids: selectedCurriculumIds }),
      })
      if (!res.ok) {
        const err = await res.json()
        setDownloadError(err.error ?? 'Failed to generate Excel.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `class-test-${filterClass || 'questions'}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setDownloadError('Network error generating file.')
    } finally {
      setDownloading(false)
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault(); setUploadStatus('')
    const file = fileRef.current?.files?.[0]
    if (!file) return
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
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
          correct_answer: r.correct_answer, level: r.level || null,
          hint: r.hint || null, image_url: r.image_url || null,
          is_remedy: r.is_remedy === 'true' || r.is_remedy === '1',
        }))
        const missing = records.filter((r) => !r.curriculum_id)
        if (missing.length) { setUploadStatus(`Error: ${missing.length} row(s) have no matching session.`); return }
        const { error } = await supabase.from('questions').upsert(records, { onConflict: 'question_uid' })
        if (error) { setUploadStatus('Error: ' + error.message); return }
        setUploadStatus(`Uploaded ${records.length} questions.`)
        if (fileRef.current) fileRef.current.value = ''
        fetchQuestions()
      },
    })
  }

  const units = Array.from(new Set(curriculum.map((c) => c.unit)))
  const filteredSessions = curriculum.filter((c) => !filterUnit || c.unit === filterUnit)
  const allSelected = filteredSessions.length > 0 && selectedCurriculumIds.length === filteredSessions.length
  const someSelected = selectedCurriculumIds.length > 0 && !allSelected

  function toggleSession(id: string) {
    setSelectedCurriculumIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function toggleAllSessions() {
    if (allSelected) setSelectedCurriculumIds([])
    else setSelectedCurriculumIds(filteredSessions.map((c) => c.id))
  }

  return (
    <div className="max-w-6xl space-y-6">
      <h1 className="text-xl font-semibold">Questions</h1>

      {/* Upload — admin only */}
      {isAdmin && (
        <section className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between gap-3 mb-1">
            <p className="text-xs text-gray-500">
              Columns: <span className="font-mono">question_uid, grade, subject, unit, learning_goal, question_text, option_1, option_1_tag, option_2, option_2_tag, option_3, option_3_tag, option_4, option_4_tag, correct_answer, level, hint, is_remedy</span>
            </p>
            <button type="button"
              onClick={() => downloadSampleCsv(
                'sample-questions.csv',
                ['question_uid','grade','subject','unit','learning_goal','question_text','option_1','option_1_tag','option_2','option_2_tag','option_3','option_3_tag','option_4','option_4_tag','correct_answer','level','hint','is_remedy'],
                ['G7Ch1S1Q1','7','Science','Chapter 1 Session 1: The Web of Science','Students will identify the steps of the scientific method','What is the first step of the scientific method?','Make an observation','G7C1.1','Form a hypothesis','G7C1.2','Conduct an experiment','','Draw a conclusion','','A','Theory','Science starts with noticing things around us','false']
              )}
              className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2 whitespace-nowrap flex-shrink-0">
              Download sample
            </button>
          </div>
          <form onSubmit={handleUpload} className="flex items-center gap-3 mt-3">
            <input ref={fileRef} type="file" accept=".csv" required />
            <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700">Upload</button>
          </form>
          {uploadStatus && (
            <p className={`mt-2 text-sm ${uploadStatus.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>{uploadStatus}</p>
          )}
        </section>
      )}

      {/* Filters + split panel */}
      <div className="grid grid-cols-5 gap-4 items-start">
        {/* Left */}
        <div className="col-span-2 space-y-3">
          {/* Filters */}
          <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
            {/* Class */}
            <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
              <option value="">All classes</option>
              {classes.map((c) => <option key={c.class_uid} value={c.class_uid}>{c.class_uid}</option>)}
            </select>

            {/* Unit */}
            <select value={filterUnit} onChange={(e) => setFilterUnit(e.target.value)}
              disabled={!filterClass}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm disabled:opacity-50">
              <option value="">All units</option>
              {units.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>

            {/* Session multi-select */}
            <div ref={dropdownRef} className="relative">
              <button type="button"
                onClick={() => setSessionDropdownOpen((o) => !o)}
                disabled={!filterClass}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm text-left flex items-center justify-between disabled:opacity-50 bg-white">
                <span className="truncate text-gray-700">
                  {selectedCurriculumIds.length === 0
                    ? 'All sessions'
                    : `${selectedCurriculumIds.length} session${selectedCurriculumIds.length > 1 ? 's' : ''} selected`}
                </span>
                <span className="text-gray-400 ml-2 flex-shrink-0">▾</span>
              </button>

              {sessionDropdownOpen && filteredSessions.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                  {/* Select all */}
                  <label className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                    <input type="checkbox" checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected }}
                      onChange={toggleAllSessions}
                      className="w-4 h-4 rounded flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-700">Select all</span>
                  </label>
                  {filteredSessions.map((c) => (
                    <label key={c.id} className="flex items-start gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox"
                        checked={selectedCurriculumIds.includes(c.id)}
                        onChange={() => toggleSession(c.id)}
                        className="w-4 h-4 rounded flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-gray-700 leading-snug">{c.learning_goal}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Level */}
            <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
              <option value="">All levels</option>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          {/* Tabs + question list */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex border-b border-gray-200">
              {(['diagnostic', 'remedy'] as QType[]).map((t) => (
                <button key={t} onClick={() => { setQType(t); setSelected(null); setEditForm(null) }}
                  className={`flex-1 px-3 py-2.5 text-sm font-medium capitalize transition-colors ${
                    qType === t
                      ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50/50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}>
                  {t}
                </button>
              ))}
            </div>

            <p className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
              {questions.length} question{questions.length !== 1 ? 's' : ''}
            </p>

            {questions.length === 0 ? (
              <p className="px-3 py-4 text-sm text-gray-400">No {qType} questions.</p>
            ) : (
              <ul className="divide-y divide-gray-100 max-h-[52vh] overflow-y-auto">
                {questions.map((q) => (
                  <li key={q.question_uid}
                    onClick={() => handleSelectQuestion(q.question_uid)}
                    className={`px-3 py-2.5 cursor-pointer hover:bg-gray-50 ${
                      selected?.question_uid === q.question_uid ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                    }`}>
                    <p className="font-mono text-xs text-gray-400">{q.question_uid}</p>
                    <p className="text-sm text-gray-800 line-clamp-2 leading-snug mt-0.5">{q.question_text}</p>
                    {q.level && <span className="text-xs text-blue-600 font-medium mt-1 block">{q.level}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Download Class Test — only on Diagnostic tab with sessions selected */}
          {qType === 'diagnostic' && selectedCurriculumIds.length > 0 && (
            <div className="space-y-1">
              <button onClick={handleDownloadClassTest} disabled={downloading}
                className="w-full bg-green-700 text-white rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-green-800 disabled:opacity-50 flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {downloading
                  ? 'Generating…'
                  : `Download Class Test (${selectedCurriculumIds.length} session${selectedCurriculumIds.length > 1 ? 's' : ''})`}
              </button>
              {downloadError && <p className="text-xs text-red-600">{downloadError}</p>}
            </div>
          )}
        </div>

        {/* Right: detail */}
        <div className="col-span-3">
          {!editForm ? (
            <div className="bg-white border border-gray-200 rounded-lg flex items-center justify-center py-24 text-sm text-gray-400">
              Select a question to view details
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <span className="font-mono text-sm font-semibold text-gray-700">{editForm.question_uid}</span>
                {isAdmin && (
                  <button onClick={handleDelete} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                )}
              </div>

              <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Session</p>
                  <p className="text-xs text-gray-600">{curriculumLabel}</p>
                </div>

                <div className="flex gap-4 items-center">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Level</label>
                    <select value={editForm.level ?? ''} onChange={(e) => setField('level', e.target.value || null)}
                      disabled={!isAdmin}
                      className="border border-gray-300 rounded px-2 py-1.5 text-sm disabled:bg-gray-50">
                      <option value="">—</option>
                      {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2 mt-4">
                      <input type="checkbox" id="is_remedy" checked={editForm.is_remedy}
                        onChange={(e) => setField('is_remedy', e.target.checked)} className="w-4 h-4" />
                      <label htmlFor="is_remedy" className="text-sm text-gray-700">Remedy question</label>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Correct Answer</label>
                  <select value={editForm.correct_answer} onChange={(e) => setField('correct_answer', e.target.value)}
                    disabled={!isAdmin}
                    className="border border-gray-300 rounded px-2 py-1.5 text-sm disabled:bg-gray-50">
                    {OPTION_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Question Text</label>
                  <textarea value={editForm.question_text} onChange={(e) => setField('question_text', e.target.value)}
                    rows={3} readOnly={!isAdmin}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-y read-only:bg-gray-50" />
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-2">Options <span className="text-gray-400">(text · misconception tag)</span></p>
                  <div className="space-y-2">
                    {optionKeys.map(([optKey, tagKey], i) => (
                      <div key={optKey} className="flex gap-2 items-center">
                        <span className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded text-xs font-bold ${
                          editForm.correct_answer === OPTION_LABELS[i] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>{OPTION_LABELS[i]}</span>
                        <input value={editForm[optKey] ?? ''} onChange={(e) => setField(optKey, e.target.value || null)}
                          readOnly={!isAdmin} placeholder={`Option ${OPTION_LABELS[i]}`}
                          className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm read-only:bg-gray-50" />
                        <input value={editForm[tagKey] ?? ''} onChange={(e) => setField(tagKey, e.target.value || null)}
                          readOnly={!isAdmin} placeholder="tag"
                          className="w-24 border border-gray-300 rounded px-2 py-1.5 text-xs font-mono read-only:bg-gray-50" />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Hint</label>
                  <textarea value={editForm.hint ?? ''} onChange={(e) => setField('hint', e.target.value || null)}
                    rows={2} readOnly={!isAdmin}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-y read-only:bg-gray-50" />
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-3 pt-1">
                    <button onClick={handleSave} disabled={saving}
                      className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                      {saving ? 'Saving…' : 'Save changes'}
                    </button>
                    {saveMsg && (
                      <span className={`text-sm ${saveMsg.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>{saveMsg}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
