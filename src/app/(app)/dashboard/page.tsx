import { createClient } from '@/lib/supabase/server'

async function getStat(
  supabase: ReturnType<typeof createClient>,
  table: string
): Promise<number> {
  const { count } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
  return count ?? 0
}

export default async function DashboardPage() {
  const supabase = createClient()

  const [classes, students, questions, responses] = await Promise.all([
    getStat(supabase, 'classes'),
    getStat(supabase, 'students'),
    getStat(supabase, 'questions'),
    getStat(supabase, 'responses'),
  ])

  const cards = [
    { label: 'Classes', value: classes },
    { label: 'Students', value: students },
    { label: 'Questions', value: questions },
    { label: 'Responses', value: responses },
  ]

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-white border border-gray-200 rounded-lg p-5"
          >
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-3xl font-semibold mt-1">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
