// Run once: node --env-file=.env.local scripts/clear-ghost-batches.mjs
// Finds upload_batches rows whose logged row_count doesn't match the actual
// number of responses rows referencing them (a "ghost" batch: the log entry
// was created but the responses insert never completed), and deletes the
// ones with zero actual rows. Pass --dry-run to only print, not delete.
import { createClient } from '@supabase/supabase-js'

const dryRun = process.argv.includes('--dry-run')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { realtime: { transport: function NoopTransport() {} } }
)

const { data: batches, error: batchesError } = await supabase
  .from('upload_batches')
  .select('id, class_uid, filename, uploaded_at, row_count, status')

if (batchesError) {
  console.error('Failed to fetch upload_batches:', batchesError.message)
  process.exit(1)
}

const { data: counts, error: countsError } = await supabase
  .from('responses')
  .select('upload_batch_id')

if (countsError) {
  console.error('Failed to fetch responses:', countsError.message)
  process.exit(1)
}

const actualCounts = new Map()
for (const r of counts) {
  actualCounts.set(r.upload_batch_id, (actualCounts.get(r.upload_batch_id) ?? 0) + 1)
}

const ghosts = []
const mismatched = []
for (const b of batches) {
  const actual = actualCounts.get(b.id) ?? 0
  if (actual === 0) {
    ghosts.push({ ...b, actual })
  } else if (actual !== b.row_count) {
    mismatched.push({ ...b, actual })
  }
}

console.log(`Checked ${batches.length} batch(es).`)
console.log(`\nGhost batches (0 actual rows) — ${ghosts.length}:`)
for (const g of ghosts) {
  console.log(`  ${g.id}  ${g.class_uid}  "${g.filename}"  logged=${g.row_count}  actual=0  uploaded_at=${g.uploaded_at}`)
}

console.log(`\nMismatched batches (partial data, not deleted automatically) — ${mismatched.length}:`)
for (const m of mismatched) {
  console.log(`  ${m.id}  ${m.class_uid}  "${m.filename}"  logged=${m.row_count}  actual=${m.actual}  uploaded_at=${m.uploaded_at}`)
}

if (!ghosts.length) {
  console.log('\nNothing to delete.')
  process.exit(0)
}

if (dryRun) {
  console.log(`\nDry run — would delete ${ghosts.length} ghost batch(es). Re-run without --dry-run to delete.`)
  process.exit(0)
}

const { error: deleteError } = await supabase
  .from('upload_batches')
  .delete()
  .in('id', ghosts.map((g) => g.id))

if (deleteError) {
  console.error('Failed to delete ghost batches:', deleteError.message)
  process.exit(1)
}

console.log(`\nDeleted ${ghosts.length} ghost batch(es).`)
