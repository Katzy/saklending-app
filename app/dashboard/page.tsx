import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function getStats() {
  const supabase = createServiceClient()

  const [
    { data: contactRows },
    { count: activeLoans },
    { count: newLeads },
    { data: recentLoans },
  ] = await Promise.all([
    supabase.from('contacts').select('id'),
    supabase.from('loans').select('*', { count: 'exact', head: true }).or('is_dead.is.null,is_dead.eq.false'),
    supabase.from('loans').select('*', { count: 'exact', head: true }).eq('stage', 'lead').or('is_dead.is.null,is_dead.eq.false'),
    supabase.from('loans')
      .select('id, stage, property_type, loan_amount, stage_updated_at, contact_id')
      .or('is_dead.is.null,is_dead.eq.false')
      .order('stage_updated_at', { ascending: false })
      .limit(5),
  ])

  const totalContacts = contactRows?.length ?? 0

  // Fetch borrower names for recent loans
  const contactIds = (recentLoans ?? []).map(l => l.contact_id).filter(Boolean)
  const { data: contactNames } = contactIds.length
    ? await supabase.from('contacts').select('id, first_name, last_name').in('id', contactIds)
    : { data: [] }

  const contactMap = Object.fromEntries((contactNames ?? []).map(c => [c.id, `${c.first_name} ${c.last_name}`]))

  return { totalContacts, activeLoans, newLeads: newLeads ?? 0, recentLoans, contactMap }
}

const STAGE_COLORS: Record<string, string> = {
  lead:          'bg-gray-100 text-gray-700',
  qualified:     'bg-blue-100 text-blue-700',
  application:   'bg-yellow-100 text-yellow-700',
  underwriting:  'bg-orange-100 text-orange-700',
  approved:      'bg-green-100 text-green-700',
  funded:        'bg-emerald-100 text-emerald-700',
}

const fmt$ = (n: number | null) =>
  n ? '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '—'

export default async function DashboardPage() {
  const { totalContacts, activeLoans, newLeads, recentLoans, contactMap } = await getStats()

  const stats = [
    { label: 'Total Contacts', value: totalContacts ?? 0, icon: '👥' },
    { label: 'Active Loans', value: activeLoans ?? 0, icon: '🏗️' },
    { label: 'New Leads', value: newLeads ?? 0, icon: '📥' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Overview</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, icon }) => (
          <div key={label} className="bg-white rounded-lg shadow-sm p-5 flex items-center gap-4">
            <div className="text-3xl">{icon}</div>
            <div>
              <p className="text-2xl font-bold text-[#003087]">{value}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-lg shadow-sm p-5">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Recent Loan Activity</h2>
        {!recentLoans || recentLoans.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No loans yet. Add one from the Pipeline.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="pb-2 font-medium">Borrower</th>
                <th className="pb-2 font-medium">Property Type</th>
                <th className="pb-2 font-medium">Loan Amount</th>
                <th className="pb-2 font-medium">Stage</th>
              </tr>
            </thead>
            <tbody>
              {recentLoans.map((loan) => (
                <tr key={loan.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2.5">
                    {loan.contact_id ? (contactMap[loan.contact_id] ?? '—') : '—'}
                  </td>
                  <td className="py-2.5 text-gray-600">{(loan.property_type as string) || '—'}</td>
                  <td className="py-2.5 text-gray-600">{fmt$(loan.loan_amount as number)}</td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STAGE_COLORS[loan.stage as string] ?? 'bg-gray-100 text-gray-700'}`}>
                      {loan.stage as string}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
