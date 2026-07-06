// One-off maintenance script — not part of the deployed app.
//
// Diagnoses (and, with --apply, fixes) "permission denied for table X" (42501)
// errors coming from the anon key by inspecting/adding Row Level Security
// policies on the public.sites / public.readings / public.alerts tables.
//
// This intentionally does NOT disable RLS. It grants the anon role read-only
// (SELECT) access via narrow policies, so RLS keeps blocking writes.
//
// Requires SUPABASE_DB_URL — the direct Postgres connection string from
// Supabase Dashboard > Project Settings > Database > Connection string (URI).
// This is NOT the same as the anon key or the service role key. Put it in
// .env.local as a server-only var (no NEXT_PUBLIC_ prefix) and never commit it.
//
// Usage:
//   node --env-file=.env.local scripts/fix-rls.mjs           # read-only report
//   node --env-file=.env.local scripts/fix-rls.mjs --apply   # create missing policies

import { Client } from 'pg'

const TABLES = ['sites', 'readings', 'alerts']
const apply = process.argv.includes('--apply')

const dbUrl = process.env.SUPABASE_DB_URL
if (!dbUrl) {
  console.error(
    'Missing SUPABASE_DB_URL.\n' +
    'Get the direct connection string from Supabase Dashboard > Project Settings > Database > Connection string (URI),\n' +
    'add it to .env.local as SUPABASE_DB_URL=... (no NEXT_PUBLIC_ prefix), then re-run:\n' +
    '  node --env-file=.env.local scripts/fix-rls.mjs'
  )
  process.exit(1)
}

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })

function policyAllowsAnonSelect(policy) {
  const roles = policy.roles ?? []
  const allowsRole = roles.includes('anon') || roles.includes('public')
  const allowsSelect = policy.cmd === 'SELECT' || policy.cmd === 'ALL'
  return allowsRole && allowsSelect
}

async function main() {
  await client.connect()
  console.log(`Connected. Mode: ${apply ? 'APPLY (will create missing policies)' : 'CHECK (read-only)'}\n`)

  for (const table of TABLES) {
    const { rows: tableRows } = await client.query(
      `SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = $1`,
      [table]
    )

    if (tableRows.length === 0) {
      console.log(`[${table}] table not found in public schema — skipping`)
      continue
    }

    const rlsEnabled = tableRows[0].rowsecurity
    const { rows: policies } = await client.query(
      `SELECT policyname, roles, cmd, qual
       FROM pg_policies
       WHERE schemaname = 'public' AND tablename = $1`,
      [table]
    )

    console.log(`[${table}] RLS enabled: ${rlsEnabled}`)
    if (policies.length === 0) {
      console.log(`[${table}] no policies defined`)
    } else {
      for (const p of policies) {
        console.log(`[${table}] policy "${p.policyname}" — cmd=${p.cmd} roles=${p.roles} using=(${p.qual})`)
      }
    }

    const hasAnonSelect = policies.some(policyAllowsAnonSelect)

    if (hasAnonSelect) {
      console.log(`[${table}] OK — anon already has a SELECT policy\n`)
      continue
    }

    console.log(`[${table}] MISSING — anon has no SELECT policy (this is why queries get 42501)`)

    if (!apply) {
      console.log(
        `[${table}] would run:\n` +
        `  GRANT SELECT ON public.${table} TO anon;\n` +
        `  CREATE POLICY "allow_anon_read_${table}" ON public.${table} FOR SELECT TO anon USING (true);\n`
      )
      continue
    }

    await client.query(`GRANT SELECT ON public.${table} TO anon`)
    await client.query(
      `CREATE POLICY "allow_anon_read_${table}" ON public.${table} FOR SELECT TO anon USING (true)`
    )
    console.log(`[${table}] created policy "allow_anon_read_${table}"\n`)
  }

  await client.end()

  if (!apply) {
    console.log('Re-run with --apply to create the missing policies shown above.')
  } else {
    console.log('Done. Reload the dashboard — anon SELECT should now work.')
  }
}

main().catch((err) => {
  console.error('Script failed:', err.message)
  process.exit(1)
})
