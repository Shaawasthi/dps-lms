'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type LogEntry = {
  id: string
  student_id: string
  student_name: string
  unit: string
  session_name: string
  misconception_count: number
  theory_count: number
  understanding_count: number
  application_count: number
  total_questions: number
  generated_at: string
}

export default function RemedyLogPage() {
  const supabase = createClient()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('remedy_logs')
      .select('*')
      .order('generated_at', { ascending: false })
      .then(({ data }) => {
        setLogs((data as LogEntry[]) ?? [])
        setLoading(false)
      })
  }, [])

  async function handleDelete(id: string) {
    if (!confirm('Delete this log entry?')) return
    await supabase.from('remedy_logs').delete().eq('id', id)
    setLogs((prev) => prev.filter((l) => l.id !== id))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Remedy Log</h1>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}

      {!loading && logs.length === 0 && (
        <p className="text-sm text-gray-500">No remedy worksheets generated yet.</p>
      )}

      {logs.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Student</th>
                <th className="px-4 py-2 font-medium">Session</th>
                <th className="px-4 py-2 font-medium text-center">Misconceptions</th>
                <th className="px-4 py-2 font-medium text-center">T / U / A</th>
                <th className="px-4 py-2 font-medium text-center">Total Qs</th>
                <th className="px-4 py-2 font-medium">Generated</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <div className="font-medium">{log.student_name}</div>
                    <div className="text-xs text-gray-400">{log.student_id}</div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="text-xs text-gray-500 truncate max-w-[140px]">{log.unit}</div>
                    <div className="truncate max-w-[140px]">{log.session_name}</div>
                  </td>
                  <td className="px-4 py-2 text-center">{log.misconception_count}</td>
                  <td className="px-4 py-2 text-center font-mono text-xs">
                    {log.theory_count} / {log.understanding_count} / {log.application_count}
                  </td>
                  <td className="px-4 py-2 text-center">{log.total_questions}</td>
                  <td className="px-4 py-2 text-xs text-gray-600 whitespace-nowrap">
                    {new Date(log.generated_at).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleDelete(log.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
