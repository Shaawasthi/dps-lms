'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Papa from 'papaparse'

type Class = { class_uid: string }
type Batch = {
  id: string
  class_uid: string
  filename: string
  uploaded_at: string
  row_count: number
  status: string
}

export default function ResponsesPage() {
  const supabase = createClient()
  const [classes, setClasses] = useState<Class[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [uploadClassUid, setUploadClassUid] = useState('')
  const [uploadStatus, setUploadStatus] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.from('classes').select('class_uid').then(({ data }) => setClasses(data ?? []))
    fetchBatches()
  }, [])

  async function fetchBatches() {
    const { data } = await supabase
      .from('upload_batches')
      .select('*')
      .order('uploaded_at', { ascending: false })
    setBatches(data ?? [])
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    setUploadStatus('')
    const file = fileRef.current?.files?.[0]
    if (!file || !uploadClassUid) {
      setUploadStatus('Select a class and CSV file.')
      return
    }
    setUploading(true)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (result) => {
        const allRows = result.data as Array<Record<string, string>>
        if (!allRows.length) {
          setUploadStatus('CSV is empty.')
          setUploading(false)
          return
        }

        // Detect clicker-app format by presence of 'roll_number' column
        const isClickerFormat = 'roll_number' in allRows[0]

        // ── Clicker-app format ────────────────────────────────────────────────
        if (isClickerFormat) {
          // Only keep rows where student actually attempted (has_attemped = 1)
          const attempted = allRows.filter((r) => r.has_attemped === '1')

          if (!attempted.length) {
            setUploadStatus('No attempted responses found in file.')
            setUploading(false)
            return
          }

          // Build roll_number → student_id map
          const rollNumbers = Array.from(new Set(attempted.map((r) => r.roll_number)))
          const { data: students } = await supabase
            .from('students')
            .select('student_id, roll_number')
            .in('roll_number', rollNumbers)

          const rollMap = new Map<string, string>()
          for (const s of students ?? []) rollMap.set(s.roll_number, s.student_id)

          const missing = rollNumbers.filter((rn) => !rollMap.has(rn))
          if (missing.length) {
            setUploadStatus(
              `Error: ${missing.length} roll number(s) not found in students table (e.g. ${missing[0]}). Upload students first.`
            )
            setUploading(false)
            return
          }

          // Create batch
          const { data: batch, error: batchError } = await supabase
            .from('upload_batches')
            .insert({ class_uid: uploadClassUid, filename: file.name, row_count: attempted.length })
            .select()
            .single()

          if (batchError || !batch) {
            setUploadStatus('Error creating batch: ' + batchError?.message)
            setUploading(false)
            return
          }

          const records = attempted.map((r) => ({
            question_uid: r.question_uid,
            student_id: rollMap.get(r.roll_number)!,
            upload_batch_id: batch.id,
            is_correct: r.is_correct === '1' || r.is_correct === 'true',
            time_taken_secs: r.time_taken_secs ? Number(r.time_taken_secs) : null,
            response_option: r.option_chosen || null,
          }))

          const { error } = await supabase.from('responses').insert(records)
          if (error) {
            setUploadStatus('Error uploading responses: ' + error.message)
            await supabase.from('upload_batches').delete().eq('id', batch.id)
          } else {
            setUploadStatus(`Uploaded ${records.length} responses (${allRows.length - attempted.length} skipped — not attempted).`)
            if (fileRef.current) fileRef.current.value = ''
            setUploadClassUid('')
            fetchBatches()
          }

        // ── Standard format ───────────────────────────────────────────────────
        } else {
          const { data: batch, error: batchError } = await supabase
            .from('upload_batches')
            .insert({ class_uid: uploadClassUid, filename: file.name, row_count: allRows.length })
            .select()
            .single()

          if (batchError || !batch) {
            setUploadStatus('Error creating batch: ' + batchError?.message)
            setUploading(false)
            return
          }

          const records = allRows.map((r) => ({
            question_uid: r.question_uid,
            student_id: r.student_id,
            upload_batch_id: batch.id,
            is_correct: r.is_correct === 'true' || r.is_correct === '1',
            time_taken_secs: r.time_taken_secs ? Number(r.time_taken_secs) : null,
            response_option: r.response_option || null,
          }))

          const { error } = await supabase.from('responses').insert(records)
          if (error) {
            setUploadStatus('Error uploading responses: ' + error.message)
            await supabase.from('upload_batches').delete().eq('id', batch.id)
          } else {
            setUploadStatus(`Uploaded ${records.length} responses (batch: ${batch.id.slice(0, 8)}…)`)
            if (fileRef.current) fileRef.current.value = ''
            setUploadClassUid('')
            fetchBatches()
          }
        }

        setUploading(false)
      },
    })
  }

  async function handleDeleteBatch(batchId: string) {
    if (!confirm('Delete this batch and all its responses?')) return
    await supabase.from('responses').delete().eq('upload_batch_id', batchId)
    await supabase.from('upload_batches').delete().eq('id', batchId)
    setBatches((prev) => prev.filter((b) => b.id !== batchId))
  }

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-xl font-semibold">Responses</h1>

      {/* Upload */}
      <section className="bg-white border border-gray-200 rounded-lg p-5">
        <h2 className="font-medium mb-1">Upload Clicker CSV</h2>
        <div className="text-xs text-gray-500 mb-4 space-y-0.5">
          <p>
            <span className="font-medium text-gray-700">Clicker app format (auto-detected):</span>{' '}
            <span className="font-mono">question_uid, class_uid, roll_number, has_attemped, option_chosen, is_correct, time_taken_secs</span>
          </p>
          <p>
            <span className="font-medium text-gray-700">Standard format:</span>{' '}
            <span className="font-mono">question_uid, student_id, is_correct, time_taken_secs, response_option</span>
          </p>
        </div>
        <form onSubmit={handleUpload} className="space-y-3">
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
            <p className={`text-sm ${uploadStatus.startsWith('Error') ? 'text-red-600' : 'text-green-700'}`}>
              {uploadStatus}
            </p>
          )}
          <button
            type="submit"
            disabled={uploading}
            className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Upload Responses'}
          </button>
        </form>
      </section>

      {/* Batch history */}
      <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <h2 className="font-medium px-5 py-4 border-b border-gray-200">Upload History</h2>
        {batches.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-500">No uploads yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                {['Class', 'File', 'Rows', 'Uploaded At', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {batches.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-2 font-mono text-xs">{b.class_uid}</td>
                  <td className="px-4 py-2 max-w-xs truncate">{b.filename}</td>
                  <td className="px-4 py-2">{b.row_count}</td>
                  <td className="px-4 py-2 whitespace-nowrap text-xs">
                    {new Date(b.uploaded_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      b.status === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleDeleteBatch(b.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
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
