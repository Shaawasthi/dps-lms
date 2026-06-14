'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Papa from 'papaparse'

type GradeSubject = { grade: string; subject: string }
type CurriculumEntry = {
  id: string
  grade: string
  subject: string
  unit: string
  learning_goal: string
}
type Misconception = {
  code: string
  curriculum_id: string
  description: string
}

export default function CurriculumPage() {
  const supabase = createClient()
  const [gradeSubjects, setGradeSubjects] = useState<GradeSubject[]>([])
  const [entries, setEntries] = useState<CurriculumEntry[]>([])
  const [filterGS, setFilterGS] = useState('') // "grade||subject"
  const [selectedEntry, setSelectedEntry] = useState<CurriculumEntry | null>(null)
  const [misconceptions, setMisconceptions] = useState<Misconception[]>([])

  // Add curriculum form
  const [form, setForm] = useState({ gs: '', unit: '', learning_goal: '' })
  const [formError, setFormError] = useState('')

  // Edit selected entry
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ unit: '', learning_goal: '' })
  const [editError, setEditError] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // Add misconception form
  const [mcForm, setMcForm] = useState({ code: '', description: '' })
  const [mcError, setMcError] = useState('')

  // CSV upload
  const [uploadStatus, setUploadStatus] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase
      .from('classes')
      .select('grade, subject')
      .then(({ data }) => {
        const seen = new Set<string>()
        const unique: GradeSubject[] = []
        for (const c of data ?? []) {
          const key = `${c.grade}||${c.subject}`
          if (!seen.has(key)) { seen.add(key); unique.push(c) }
        }
        unique.sort((a, b) => a.grade.localeCompare(b.grade) || a.subject.localeCompare(b.subject))
        setGradeSubjects(unique)
      })
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [filterGS])

  useEffect(() => {
    if (selectedEntry) fetchMisconceptions(selectedEntry.id)
    else setMisconceptions([])
  }, [selectedEntry])

  function parseGS(gs: string) {
    const [grade, ...rest] = gs.split('||')
    return { grade, subject: rest.join('||') }
  }

  async function fetchEntries() {
    let q = supabase.from('curriculum').select('*').order('unit')
    if (filterGS) {
      const { grade, subject } = parseGS(filterGS)
      q = q.eq('grade', grade).eq('subject', subject)
    }
    const { data } = await q
    setEntries(data ?? [])
    if (selectedEntry) {
      const updated = (data ?? []).find((e) => e.id === selectedEntry.id)
      setSelectedEntry(updated ?? null)
    }
  }

  async function fetchMisconceptions(curriculumId: string) {
    const { data } = await supabase
      .from('misconceptions')
      .select('*')
      .eq('curriculum_id', curriculumId)
      .order('code')
    setMisconceptions(data ?? [])
  }

  async function handleAddEntry(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!form.gs) { setFormError('Select a grade & subject.'); return }
    const { grade, subject } = parseGS(form.gs)
    const { error } = await supabase.from('curriculum').insert({
      grade, subject, unit: form.unit, learning_goal: form.learning_goal,
    })
    if (error) { setFormError(error.message); return }
    setForm({ gs: '', unit: '', learning_goal: '' })
    fetchEntries()
  }

  async function handleDeleteEntry(id: string) {
    await supabase.from('curriculum').delete().eq('id', id)
    if (selectedEntry?.id === id) setSelectedEntry(null)
    fetchEntries()
  }

  function startEditing(entry: CurriculumEntry) {
    setEditForm({ unit: entry.unit, learning_goal: entry.learning_goal })
    setEditError('')
    setEditing(true)
  }

  async function handleSaveEntry(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedEntry) return
    setEditSaving(true)
    setEditError('')
    const { error } = await supabase.from('curriculum').update({
      unit: editForm.unit,
      learning_goal: editForm.learning_goal,
    }).eq('id', selectedEntry.id)
    setEditSaving(false)
    if (error) { setEditError(error.message); return }
    setEditing(false)
    fetchEntries()
  }

  async function handleAddMisconception(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedEntry) return
    setMcError('')
    const { error } = await supabase.from('misconceptions').upsert({
      code: mcForm.code,
      curriculum_id: selectedEntry.id,
      description: mcForm.description,
    }, { onConflict: 'code' })
    if (error) { setMcError(error.message); return }
    setMcForm({ code: '', description: '' })
    fetchMisconceptions(selectedEntry.id)
  }

  async function handleDeleteMisconception(code: string) {
    await supabase.from('misconceptions').delete().eq('code', code)
    setMisconceptions((prev) => prev.filter((m) => m.code !== code))
  }

  // CSV: grade, subject, unit, learning_goal, misconception_code, misconception_description
  async function handleCombinedUpload(e: React.FormEvent) {
    e.preventDefault()
    setUploadStatus('')
    const file = fileRef.current?.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        const rows = result.data as Array<Record<string, string>>

        // Deduplicate curriculum entries
        const curriculumMap = new Map<string, { grade: string; subject: string; unit: string; learning_goal: string }>()
        for (const r of rows) {
          const key = `${r.grade}||${r.subject}||${r.unit}||${r.learning_goal}`
          if (!curriculumMap.has(key)) {
            curriculumMap.set(key, {
              grade: r.grade,
              subject: r.subject,
              unit: r.unit,
              learning_goal: r.learning_goal,
            })
          }
        }

        const curricEntries = Array.from(curriculumMap.values())
        const { error: ce } = await supabase.from('curriculum').upsert(
          curricEntries,
          { onConflict: 'grade,subject,unit,learning_goal', ignoreDuplicates: true }
        )
        if (ce) { setUploadStatus('Error upserting curriculum: ' + ce.message); return }

        // Fetch back to get IDs
        const grades = Array.from(new Set(curricEntries.map((c) => c.grade)))
        const { data: fetchedEntries } = await supabase
          .from('curriculum')
          .select('id, grade, subject, unit, learning_goal')
          .in('grade', grades)

        const idMap = new Map<string, string>()
        for (const fe of fetchedEntries ?? []) {
          idMap.set(`${fe.grade}||${fe.subject}||${fe.unit}||${fe.learning_goal}`, fe.id)
        }

        // Upsert misconceptions
        const mcRows = rows.filter((r) => r.misconception_code?.trim())
        if (mcRows.length > 0) {
          const mcRecords = mcRows.map((r) => ({
            code: r.misconception_code.trim(),
            curriculum_id: idMap.get(`${r.grade}||${r.subject}||${r.unit}||${r.learning_goal}`),
            description: r.misconception_description,
          })).filter((m) => m.curriculum_id)

          const { error: me } = await supabase
            .from('misconceptions')
            .upsert(mcRecords, { onConflict: 'code' })
          if (me) { setUploadStatus('Error upserting misconceptions: ' + me.message); return }

          setUploadStatus(
            `Uploaded ${curricEntries.length} learning goal(s) and ${mcRecords.length} misconception(s).`
          )
        } else {
          setUploadStatus(`Uploaded ${curricEntries.length} learning goal(s).`)
        }

        if (fileRef.current) fileRef.current.value = ''
        fetchEntries()
      },
    })
  }

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-xl font-semibold">Curriculum</h1>

      {/* CSV upload */}
      <section className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="font-medium mb-1">Bulk Upload (CSV)</h2>
        <p className="text-xs text-gray-500 mb-1">
          Columns: <span className="font-mono">grade, subject, unit, learning_goal, misconception_code, misconception_description</span>
        </p>
        <p className="text-xs text-gray-400 mb-4">
          One curriculum upload covers all sections with the same grade &amp; subject. Leave misconception columns blank for rows that are just learning goals.
        </p>
        <form onSubmit={handleCombinedUpload} className="flex items-center gap-3">
          <input ref={fileRef} type="file" accept=".csv" required />
          <button
            type="submit"
            className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700"
          >
            Upload
          </button>
        </form>
        {uploadStatus && (
          <p className={`mt-2 text-sm ${uploadStatus.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>
            {uploadStatus}
          </p>
        )}
      </section>

      {/* Add entry manually */}
      <section className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="font-medium mb-4">Add Learning Goal</h2>
        <form onSubmit={handleAddEntry} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Grade &amp; Subject</label>
            <select
              value={form.gs}
              onChange={(e) => setForm((f) => ({ ...f, gs: e.target.value }))}
              required
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            >
              <option value="">Select…</option>
              {gradeSubjects.map((gs) => (
                <option key={`${gs.grade}||${gs.subject}`} value={`${gs.grade}||${gs.subject}`}>
                  Grade {gs.grade} — {gs.subject}
                </option>
              ))}
            </select>
          </div>
          {(['unit', 'learning_goal'] as const).map((field) => (
            <div key={field} className="col-span-2 md:col-span-1">
              <label className="block text-xs text-gray-500 mb-1 capitalize">
                {field.replace('_', ' ')}
              </label>
              <input
                value={form[field]}
                onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
              />
            </div>
          ))}
          {formError && <p className="col-span-2 text-sm text-red-600">{formError}</p>}
          <button
            type="submit"
            className="col-span-2 w-fit bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700"
          >
            Add Learning Goal
          </button>
        </form>
      </section>

      {/* List + misconceptions */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left: curriculum entries */}
        <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
            <h2 className="font-medium text-sm">Learning Goals</h2>
            <select
              value={filterGS}
              onChange={(e) => { setFilterGS(e.target.value); setSelectedEntry(null) }}
              className="ml-auto border border-gray-300 rounded px-2 py-1 text-xs"
            >
              <option value="">All</option>
              {gradeSubjects.map((gs) => (
                <option key={`${gs.grade}||${gs.subject}`} value={`${gs.grade}||${gs.subject}`}>
                  Grade {gs.grade} — {gs.subject}
                </option>
              ))}
            </select>
          </div>
          {entries.length === 0 ? (
            <p className="px-4 py-4 text-sm text-gray-500">No entries.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {entries.map((e) => (
                <li
                  key={e.id}
                  className={`px-4 py-3 cursor-pointer flex items-start justify-between gap-2 hover:bg-gray-50 ${
                    selectedEntry?.id === e.id ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                  }`}
                  onClick={() => setSelectedEntry(selectedEntry?.id === e.id ? null : e)}
                >
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 truncate">Grade {e.grade} · {e.subject}</p>
                    <p className="text-xs text-gray-500">{e.unit}</p>
                    <p className="text-sm font-medium text-gray-800 leading-snug">{e.learning_goal}</p>
                  </div>
                  <button
                    onClick={(ev) => { ev.stopPropagation(); handleDeleteEntry(e.id) }}
                    className="text-xs text-red-400 hover:text-red-600 flex-shrink-0 mt-0.5"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Right: misconceptions */}
        <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {!selectedEntry ? (
            <div className="flex items-center justify-center h-full text-sm text-gray-400 py-16">
              Select a learning goal to view misconceptions
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-gray-200">
                {editing ? (
                  <form onSubmit={handleSaveEntry} className="space-y-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Unit</label>
                      <input
                        value={editForm.unit}
                        onChange={(e) => setEditForm((f) => ({ ...f, unit: e.target.value }))}
                        required
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Learning Goal</label>
                      <textarea
                        value={editForm.learning_goal}
                        onChange={(e) => setEditForm((f) => ({ ...f, learning_goal: e.target.value }))}
                        required
                        rows={2}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm resize-y"
                      />
                    </div>
                    {editError && <p className="text-xs text-red-600">{editError}</p>}
                    <div className="flex gap-2">
                      <button type="submit" disabled={editSaving}
                        className="text-xs bg-blue-600 text-white rounded px-3 py-1.5 font-medium hover:bg-blue-700 disabled:opacity-50">
                        {editSaving ? 'Saving…' : 'Save'}
                      </button>
                      <button type="button" onClick={() => setEditing(false)}
                        className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5">
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-gray-400">{selectedEntry.unit}</p>
                      <p className="text-sm font-medium text-gray-800">{selectedEntry.learning_goal}</p>
                    </div>
                    <button onClick={() => startEditing(selectedEntry)}
                      className="text-xs text-blue-500 hover:text-blue-700 flex-shrink-0 mt-0.5">
                      Edit
                    </button>
                  </div>
                )}
              </div>

              <form onSubmit={handleAddMisconception} className="px-4 py-3 border-b border-gray-100 space-y-2">
                <div className="flex gap-2">
                  <div className="w-28 flex-shrink-0">
                    <label className="block text-xs text-gray-500 mb-1">Code</label>
                    <input
                      value={mcForm.code}
                      onChange={(e) => setMcForm((f) => ({ ...f, code: e.target.value }))}
                      placeholder="G7C1.4"
                      required
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Description</label>
                    <input
                      value={mcForm.description}
                      onChange={(e) => setMcForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="What the student misunderstands"
                      required
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs"
                    />
                  </div>
                </div>
                {mcError && <p className="text-xs text-red-600">{mcError}</p>}
                <button
                  type="submit"
                  className="text-xs bg-blue-600 text-white rounded px-3 py-1.5 font-medium hover:bg-blue-700"
                >
                  Add Misconception
                </button>
              </form>

              {misconceptions.length === 0 ? (
                <p className="px-4 py-4 text-sm text-gray-400">No misconceptions yet.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {misconceptions.map((m) => (
                    <li key={m.code} className="px-4 py-2.5 flex items-start gap-2">
                      <span className="font-mono text-xs font-semibold text-blue-700 flex-shrink-0 mt-0.5">
                        {m.code}
                      </span>
                      <span className="text-sm text-gray-700 flex-1">{m.description}</span>
                      <button
                        onClick={() => handleDeleteMisconception(m.code)}
                        className="text-xs text-red-400 hover:text-red-600 flex-shrink-0"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
