'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Papa from 'papaparse'

type Class = {
  class_uid: string
  grade: string
  section: string
  subject: string
  academic_year: string
}

export default function ClassesPage() {
  const supabase = createClient()
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    grade: '',
    section: '',
    subject: '',
    academic_year: '',
  })
  const [formError, setFormError] = useState('')
  const [uploadClassUid, setUploadClassUid] = useState('')
  const [uploadStatus, setUploadStatus] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function fetchClasses() {
    const { data } = await supabase.from('classes').select('*').order('grade')
    setClasses(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchClasses()
  }, [])

  async function handleAddClass(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    const uid = `${form.grade}-${form.section}-${form.subject}-${form.academic_year}`
    const { error } = await supabase.from('classes').insert({
      class_uid: uid,
      grade: form.grade,
      section: form.section,
      subject: form.subject,
      academic_year: form.academic_year,
    })
    if (error) {
      setFormError(error.message)
      return
    }
    setForm({ grade: '', section: '', subject: '', academic_year: '' })
    fetchClasses()
  }

  async function handleStudentUpload(e: React.FormEvent) {
    e.preventDefault()
    setUploadStatus('')
    const file = fileRef.current?.files?.[0]
    if (!file || !uploadClassUid) {
      setUploadStatus('Select a class and CSV file.')
      return
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        const rows = result.data as Array<{
          student_id: string
          roll_number: string
          section: string
          name: string
        }>
        const records = rows.map((r) => ({
          student_id: r.student_id,
          class_uid: uploadClassUid,
          roll_number: r.roll_number,
          section: r.section,
          name: r.name,
        }))
        const { error } = await supabase
          .from('students')
          .upsert(records, { onConflict: 'student_id' })
        if (error) {
          setUploadStatus('Error: ' + error.message)
        } else {
          setUploadStatus(`Uploaded ${records.length} students.`)
          if (fileRef.current) fileRef.current.value = ''
        }
      },
    })
  }

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-xl font-semibold">Classes &amp; Students</h1>

      {/* Add class */}
      <section className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="font-medium mb-4">Add Class</h2>
        <form onSubmit={handleAddClass} className="grid grid-cols-2 gap-3">
          {(['grade', 'section', 'subject', 'academic_year'] as const).map(
            (field) => (
              <div key={field}>
                <label className="block text-xs text-gray-500 mb-1 capitalize">
                  {field.replace('_', ' ')}
                </label>
                <input
                  value={form[field]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [field]: e.target.value }))
                  }
                  required
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )
          )}
          {formError && (
            <p className="col-span-2 text-sm text-red-600">{formError}</p>
          )}
          <button
            type="submit"
            className="col-span-2 bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 w-fit"
          >
            Add Class
          </button>
        </form>
      </section>

      {/* Classes table */}
      <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <h2 className="font-medium px-5 py-4 border-b border-gray-200">
          All Classes
        </h2>
        {loading ? (
          <p className="px-5 py-4 text-sm text-gray-500">Loading…</p>
        ) : classes.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-500">No classes yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                {['Class UID', 'Grade', 'Section', 'Subject', 'Year'].map(
                  (h) => (
                    <th key={h} className="px-4 py-2 font-medium">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {classes.map((c) => (
                <tr key={c.class_uid}>
                  <td className="px-4 py-2 font-mono text-xs">
                    {c.class_uid}
                  </td>
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

      {/* Upload students */}
      <section className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="font-medium mb-1">Upload Students (CSV)</h2>
        <p className="text-xs text-gray-500 mb-4">
          Columns: student_id, roll_number, section, name
        </p>
        <form onSubmit={handleStudentUpload} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Class</label>
            <select
              value={uploadClassUid}
              onChange={(e) => setUploadClassUid(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select class…</option>
              {classes.map((c) => (
                <option key={c.class_uid} value={c.class_uid}>
                  {c.class_uid}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">CSV File</label>
            <input ref={fileRef} type="file" accept=".csv" required />
          </div>
          {uploadStatus && (
            <p
              className={`text-sm ${uploadStatus.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}
            >
              {uploadStatus}
            </p>
          )}
          <button
            type="submit"
            className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700"
          >
            Upload Students
          </button>
        </form>
      </section>
    </div>
  )
}
