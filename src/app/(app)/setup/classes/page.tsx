'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Papa from 'papaparse'
import { downloadSampleCsv } from '@/lib/downloadCsv'
import { useRole } from '@/context/RoleContext'

type Class = {
  class_uid: string
  grade: string
  section: string
  subject: string
  academic_year: string
}
type Student = {
  student_id: string
  class_uid: string
  roll_number: string
  section: string
  name: string
}

export default function ClassesPage() {
  const supabase = createClient()
  const role = useRole()
  const isAdmin = role === 'admin'
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ grade: '', section: '', subject: '', academic_year: '' })
  const [formError, setFormError] = useState('')

  // Upload students
  const [uploadClassUid, setUploadClassUid] = useState('')
  const [uploadStatus, setUploadStatus] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // Browse students
  const [browseClassUid, setBrowseClassUid] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [studentEdit, setStudentEdit] = useState<Student | null>(null)
  const [studentSaving, setStudentSaving] = useState(false)
  const [studentMsg, setStudentMsg] = useState('')

  async function fetchClasses() {
    const { data } = await supabase.from('classes').select('*').order('grade')
    setClasses(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchClasses() }, [])

  useEffect(() => {
    if (!browseClassUid) { setStudents([]); setSelectedStudent(null); return }
    fetchStudents(browseClassUid)
  }, [browseClassUid])

  async function fetchStudents(classUid: string) {
    const { data } = await supabase
      .from('students').select('*').eq('class_uid', classUid).order('roll_number')
    setStudents(data ?? [])
  }

  async function handleAddClass(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    const uid = `${form.grade}-${form.section}-${form.subject}-${form.academic_year}`
    const { error } = await supabase.from('classes').insert({
      class_uid: uid, grade: form.grade, section: form.section, subject: form.subject, academic_year: form.academic_year,
    })
    if (error) { setFormError(error.message); return }
    setForm({ grade: '', section: '', subject: '', academic_year: '' })
    fetchClasses()
  }

  async function handleStudentUpload(e: React.FormEvent) {
    e.preventDefault()
    setUploadStatus('')
    const file = fileRef.current?.files?.[0]
    if (!file || !uploadClassUid) { setUploadStatus('Select a class and CSV file.'); return }
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        const rows = result.data as Array<{ student_id: string; roll_number: string; section: string; name: string }>
        const records = rows.map((r) => ({
          student_id: r.student_id, class_uid: uploadClassUid, roll_number: r.roll_number, section: r.section, name: r.name,
        }))
        const { error } = await supabase.from('students').upsert(records, { onConflict: 'student_id' })
        if (error) { setUploadStatus('Error: ' + error.message); return }
        setUploadStatus(`Uploaded ${records.length} students.`)
        if (fileRef.current) fileRef.current.value = ''
        if (browseClassUid === uploadClassUid) fetchStudents(uploadClassUid)
      },
    })
  }

  function selectStudent(s: Student) {
    setSelectedStudent(s)
    setStudentEdit({ ...s })
    setStudentMsg('')
  }

  async function handleSaveStudent(e: React.FormEvent) {
    e.preventDefault()
    if (!studentEdit) return
    setStudentSaving(true)
    setStudentMsg('')
    const { error } = await supabase.from('students').update({
      name: studentEdit.name,
      roll_number: studentEdit.roll_number,
      section: studentEdit.section,
    }).eq('student_id', studentEdit.student_id)
    setStudentSaving(false)
    if (error) { setStudentMsg('Error: ' + error.message); return }
    setStudentMsg('Saved.')
    setSelectedStudent(studentEdit)
    fetchStudents(browseClassUid)
  }

  async function handleDeleteStudent() {
    if (!selectedStudent || !confirm(`Delete student ${selectedStudent.name} (${selectedStudent.student_id})?`)) return
    await supabase.from('students').delete().eq('student_id', selectedStudent.student_id)
    setSelectedStudent(null)
    setStudentEdit(null)
    fetchStudents(browseClassUid)
  }

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-xl font-semibold">Classes &amp; Students</h1>

      {/* Add class — admin only */}
      {isAdmin && <section className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="font-medium mb-4">Add Class</h2>
        <form onSubmit={handleAddClass} className="grid grid-cols-2 gap-3">
          {(['grade', 'section', 'subject', 'academic_year'] as const).map((field) => (
            <div key={field}>
              <label className="block text-xs text-gray-500 mb-1 capitalize">
                {field.replace('_', ' ')}
              </label>
              <input
                value={form[field]}
                onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                required
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
          {formError && <p className="col-span-2 text-sm text-red-600">{formError}</p>}
          <button type="submit"
            className="col-span-2 bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 w-fit">
            Add Class
          </button>
        </form>
      </section>}

      {/* Classes table */}
      <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <h2 className="font-medium px-5 py-4 border-b border-gray-200">All Classes</h2>
        {loading ? (
          <p className="px-5 py-4 text-sm text-gray-500">Loading…</p>
        ) : classes.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-500">No classes yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                {['Class UID', 'Grade', 'Section', 'Subject', 'Year'].map((h) => (
                  <th key={h} className="px-4 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {classes.map((c) => (
                <tr key={c.class_uid}>
                  <td className="px-4 py-2 font-mono text-xs">{c.class_uid}</td>
                  <td className="px-4 py-2">{c.grade}</td>
                  <td className="px-4 py-2">{c.section}</td>
                  <td className="px-4 py-2">{c.subject}</td>
                  <td className="px-4 py-2">{c.academic_year}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Upload students — admin only */}
      {isAdmin && <section className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-medium">Upload Students (CSV)</h2>
          <button
            type="button"
            onClick={() => downloadSampleCsv(
              'sample-students.csv',
              ['student_id','roll_number','section','name'],
              ['STU001','1','A','Priya Sharma']
            )}
            className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2"
          >
            Download sample
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-4">Columns: student_id, roll_number, section, name</p>
        <form onSubmit={handleStudentUpload} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Class</label>
            <select value={uploadClassUid} onChange={(e) => setUploadClassUid(e.target.value)} required
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select class…</option>
              {classes.map((c) => <option key={c.class_uid} value={c.class_uid}>{c.class_uid}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">CSV File</label>
            <input ref={fileRef} type="file" accept=".csv" required />
          </div>
          {uploadStatus && (
            <p className={`text-sm ${uploadStatus.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>
              {uploadStatus}
            </p>
          )}
          <button type="submit"
            className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700">
            Upload Students
          </button>
        </form>
      </section>}

      {/* Browse & edit students */}
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="font-medium">Browse &amp; Edit Students</h2>
          <select value={browseClassUid} onChange={(e) => { setBrowseClassUid(e.target.value); setSelectedStudent(null) }}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm">
            <option value="">Select class…</option>
            {classes.map((c) => <option key={c.class_uid} value={c.class_uid}>{c.class_uid}</option>)}
          </select>
        </div>

        {browseClassUid && (
          <div className="grid grid-cols-5 gap-4 items-start">
            {/* Student list */}
            <div className="col-span-2 bg-white border border-gray-200 rounded-lg overflow-hidden">
              <p className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
                {students.length} student{students.length !== 1 ? 's' : ''}
              </p>
              {students.length === 0 ? (
                <p className="px-3 py-4 text-sm text-gray-400">No students found.</p>
              ) : (
                <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                  {students.map((s) => (
                    <li key={s.student_id}
                      onClick={() => selectStudent(s)}
                      className={`px-3 py-2.5 cursor-pointer hover:bg-gray-50 ${
                        selectedStudent?.student_id === s.student_id ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                      }`}>
                      <p className="text-sm font-medium text-gray-800">{s.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{s.student_id} · Roll {s.roll_number} · {s.section}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Student edit panel */}
            <div className="col-span-3">
              {!studentEdit ? (
                <div className="bg-white border border-gray-200 rounded-lg flex items-center justify-center py-16 text-sm text-gray-400">
                  Select a student to edit
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-gray-700">{studentEdit.student_id}</span>
                    {isAdmin && <button onClick={handleDeleteStudent} className="text-xs text-red-400 hover:text-red-600">Delete</button>}
                  </div>
                  <form onSubmit={handleSaveStudent} className="p-4 space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Name</label>
                      <input value={studentEdit.name}
                        onChange={(e) => setStudentEdit((s) => s ? { ...s, name: e.target.value } : s)}
                        required
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Roll Number</label>
                        <input value={studentEdit.roll_number}
                          onChange={(e) => setStudentEdit((s) => s ? { ...s, roll_number: e.target.value } : s)}
                          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Section</label>
                        <input value={studentEdit.section}
                          onChange={(e) => setStudentEdit((s) => s ? { ...s, section: e.target.value } : s)}
                          className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Class UID</label>
                      <input value={studentEdit.class_uid} readOnly
                        className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm bg-gray-50 text-gray-500 font-mono" />
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-3 pt-1">
                        <button type="submit" disabled={studentSaving}
                          className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                          {studentSaving ? 'Saving…' : 'Save changes'}
                        </button>
                        {studentMsg && (
                          <span className={`text-sm ${studentMsg.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>
                            {studentMsg}
                          </span>
                        )}
                      </div>
                    )}
                  </form>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
