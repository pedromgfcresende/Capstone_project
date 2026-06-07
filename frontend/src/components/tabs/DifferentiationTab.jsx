import { useState, useEffect } from 'react'
import { Pencil, Plus, X, Shield, AlertTriangle, Crosshair, ExternalLink, FileText, ChevronDown, Users, Search } from 'lucide-react'

// ── Mock differentiation data for each segment's focal company ────────────────
const DIFF = {
  'ws-1': {
    positioning: 'Payflows is the AP/AR automation platform built for mid-market CFOs, betting on product depth and an accountant-adjacent distribution motion to win the consolidation of the finance stack.',
    differentiators: [
      { axis: 'Distribution', edge: 'Building an accountant-referral motion modelled on Pennylane — each accountant onboards their whole client base.', field: 'Most spend-management peers rely on paid acquisition and direct outbound sales.' },
      { axis: 'Product scope', edge: 'Unifies AP and AR in a single reconciliation workflow.', field: 'Competitors specialise in either spend (cards) or invoicing — rarely both.' },
      { axis: 'Target customer', edge: 'Mid-market CFOs at 50–500 person companies.', field: 'Peers skew either SMB (Qonto, Finom) or enterprise — the mid-market is underserved.' },
      { axis: 'AI-native', edge: 'Reconciliation automation built on LLMs from day one.', field: 'Incumbents are retrofitting AI onto rule-based engines.' },
    ],
    moats: [
      'Accountant-channel distribution compounds — each accountant onboards their full client base.',
      'Unified AP/AR data creates switching costs once embedded in the monthly close.',
    ],
    risks: [
      'No brand recognition yet versus Spendesk and Qonto.',
      'Sales organisation still nascent — execution risk on the enterprise motion.',
      'Qonto can bundle the feature set for free as a loss leader.',
    ],
    sources: [
      { title: 'Payflows — founder meeting notes (Station F)', url: '' },
      { title: 'Pennylane €75M Series C — TechCrunch', url: 'https://techcrunch.com' },
      { title: 'Dealroom — Embedded Finance Europe 2024', url: 'https://dealroom.co' },
    ],
  },
  'ws-2': {
    positioning: 'Sweep is the enterprise-grade carbon accounting platform that wins on full Scope 1–3 coverage and audit-ready data verification, positioning above the commoditising SMB tier.',
    differentiators: [
      { axis: 'Data depth', edge: 'Full Scope 1–3 coverage with supplier-level granularity.', field: 'SMB tools (Greenly) stop at Scope 1–2 estimates.' },
      { axis: 'Verification', edge: 'Audit-ready data attestation — the emerging moat under CSRD.', field: 'Most peers measure but cannot attest to data quality.' },
      { axis: 'Target customer', edge: 'Large enterprise sustainability teams.', field: 'The contested tier below is SMB self-serve, lower ACV.' },
    ],
    moats: [
      'Data verification capability commands premium pricing as regulatory scrutiny rises.',
      'Enterprise contracts are multi-year and sticky once embedded in reporting cycles.',
    ],
    risks: [
      'Carbon measurement is commoditising — pressure cascades up from the SMB tier.',
      'SAP / Salesforce could build native carbon modules and bundle them.',
    ],
    sources: [
      { title: 'Sweep $73M Series B — TechCrunch', url: 'https://techcrunch.com' },
      { title: 'Bloomberg NEF — carbon data verification report', url: 'https://about.bnef.com' },
    ],
  },
  'ws-3': {
    positioning: 'Pleo leads on product-led growth and a polished self-serve experience across Northern Europe, differentiating on UX and onboarding velocity rather than card economics.',
    differentiators: [
      { axis: 'Motion', edge: 'Self-serve PLG funnel — fastest onboarding in the category.', field: 'Spendesk and Payhawk lean on sales-led mid-market motions.' },
      { axis: 'Geography', edge: 'Dominant in the Nordics and UK.', field: 'Payhawk is broader but thinner; Spendesk is France-first.' },
      { axis: 'Product', edge: 'AI-driven spend controls layered on the card.', field: 'Card issuance itself is fully commoditised across the field.' },
    ],
    moats: [
      'Self-serve onboarding lowers CAC and compounds the PLG flywheel.',
      'Strong brand and NPS in the Nordics create regional defensibility.',
    ],
    risks: [
      'Neobanks (Qonto) bundle spend management for free, squeezing the low end.',
      'International expansion beyond core markets has been slower than peers.',
    ],
    sources: [
      { title: 'Pleo — company profile, Dealroom', url: 'https://dealroom.co' },
      { title: 'Spend management benchmark — McKinsey 2024', url: '' },
    ],
  },
  'ws-4': {
    positioning: 'Defacto differentiates on real-time, data-driven underwriting delivered as embedded API infrastructure, rather than competing as a standalone balance-sheet lender.',
    differentiators: [
      { axis: 'Underwriting', edge: 'Live banking + accounting data underwriting, not static credit scores.', field: 'Traditional lenders underwrite on lagging financials.' },
      { axis: 'Delivery', edge: 'Embedded via API into platforms and marketplaces.', field: 'Most RBF peers (Silvr, Karmen) are direct-to-borrower.' },
      { axis: 'Capital model', edge: 'Asset-light distribution with partner balance sheets.', field: 'Balance-sheet-heavy lenders are exposed to rate risk.' },
    ],
    moats: [
      'Real-time transaction data improves underwriting accuracy with every loan.',
      'Embedded API distribution locks in platform partners and their borrower flow.',
    ],
    risks: [
      'Higher-rate environment compresses spreads and raises default risk.',
      'Capital cost is a structural constraint that pure-SaaS investors dislike.',
    ],
    sources: [
      { title: 'Defacto — founder call notes', url: '' },
      { title: 'Bain — embedded lending in Europe, 2024', url: '' },
    ],
  },
}

// Segment-level competitive matrix (shared landscape; selected company is highlighted)
const MATRIX = {
  'ws-1': {
    dimensions: ['Distribution', 'Product depth', 'Pricing power', 'Intl reach'],
    players: [
      { name: 'Payflows', scores: [2, 3, 1, 1] },
      { name: 'Pennylane', scores: [3, 2, 2, 1] },
      { name: 'Spendesk', scores: [2, 2, 3, 3] },
      { name: 'Qonto', scores: [2, 3, 3, 3] },
    ],
  },
  'ws-2': {
    dimensions: ['Data depth', 'Verification', 'Pricing power', 'Enterprise fit'],
    players: [
      { name: 'Sweep', scores: [3, 3, 3, 3] },
      { name: 'Greenly', scores: [2, 1, 1, 1] },
      { name: 'Persefoni', scores: [3, 2, 2, 3] },
    ],
  },
  'ws-3': {
    dimensions: ['PLG motion', 'Geography', 'AI controls', 'Pricing power'],
    players: [
      { name: 'Pleo', scores: [3, 2, 2, 2] },
      { name: 'Spendesk', scores: [2, 2, 2, 3] },
      { name: 'Payhawk', scores: [2, 3, 2, 2] },
      { name: 'Soldo', scores: [1, 2, 1, 1] },
    ],
  },
  'ws-4': {
    dimensions: ['Underwriting', 'Distribution', 'Capital efficiency', 'Scale'],
    players: [
      { name: 'Defacto', scores: [3, 3, 2, 1] },
      { name: 'Karmen', scores: [2, 2, 2, 1] },
      { name: 'Silvr', scores: [2, 1, 1, 2] },
      { name: 'Hokodo', scores: [2, 3, 2, 2] },
    ],
  },
}

const SCORE = { 3: { label: 'Strong' }, 2: { label: 'Moderate' }, 1: { label: 'Weak' } }

// ── Inline editable text ──────────────────────────────────────────────────────
function InlineText({ value, onChange, multiline = false, placeholder = 'Click to edit…', className = '' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const save = () => { onChange(draft); setEditing(false) }
  const cancel = () => { setDraft(value); setEditing(false) }

  if (editing) return multiline ? (
    <div className="flex flex-col gap-2 w-full">
      <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)} rows={3}
        onKeyDown={e => { if (e.key === 'Escape') cancel() }}
        className={`bg-white border border-rule rounded-md px-3 py-2 outline-none resize-none w-full leading-relaxed ${className}`} />
      <div className="flex gap-2">
        <button onClick={save} className="font-mono text-[9px] uppercase tracking-[0.08em] px-2.5 py-1 rounded bg-ink text-white border-0 cursor-pointer"
          onMouseEnter={e => e.currentTarget.style.background = '#e85d3b'} onMouseLeave={e => e.currentTarget.style.background = '#1a1a1a'}>Save</button>
        <button onClick={cancel} className="font-mono text-[9px] uppercase tracking-[0.08em] px-2.5 py-1 rounded bg-transparent border border-rule text-ink-mute cursor-pointer hover:text-ink">Cancel</button>
      </div>
    </div>
  ) : (
    <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
      onBlur={save} onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }}
      className={`bg-white border border-rule rounded px-2 py-1 outline-none w-full ${className}`} />
  )

  return (
    <div className="group flex items-start gap-2 cursor-text w-full" onClick={() => { setEditing(true); setDraft(value) }}>
      <span className={`flex-1 ${className} ${!value ? 'text-ink-mute italic' : ''}`}>{value || placeholder}</span>
      <Pencil size={10} className="text-ink-mute opacity-0 group-hover:opacity-40 transition-opacity mt-1 shrink-0" />
    </div>
  )
}

function SectionLabel({ children }) {
  return <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute">{children}</span>
}

function ScoreDots({ score, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map(n => (
        <button key={n} onClick={onChange ? () => onChange(n) : undefined}
          className={`w-2.5 h-2.5 rounded-full border-0 p-0 ${onChange ? 'cursor-pointer hover:scale-125 transition-transform' : ''}`}
          style={{ background: n <= score ? '#e8896e' : '#ece8e1' }}
          title={onChange ? SCORE[n].label : undefined} />
      ))}
    </div>
  )
}

function EditableList({ items, onChange, accentColor, placeholder }) {
  const update = (i, v) => onChange(items.map((x, j) => j === i ? v : x))
  const remove = (i) => onChange(items.filter((_, j) => j !== i))
  const add = () => onChange([...items, ''])
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2.5 group">
          <span className="mt-[6px] w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accentColor }} />
          <div className="flex-1 min-w-0">
            <InlineText value={item} onChange={v => update(i, v)} placeholder={placeholder}
              className="font-sans text-[12.5px] text-ink leading-relaxed" />
          </div>
          <button onClick={() => remove(i)}
            className="shrink-0 text-ink-mute hover:text-red-500 bg-transparent border-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-all p-0.5 mt-0.5">
            <X size={11} />
          </button>
        </div>
      ))}
      <button onClick={add}
        className="flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.08em] text-ink-mute hover:text-ink bg-transparent border-0 cursor-pointer transition-colors mt-1 w-fit">
        <Plus size={10} /> Add
      </button>
    </div>
  )
}

function CompanySelect({ companies, selectedId, onSelect }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const sel = companies.find(c => c.id === selectedId)
  const s = q.trim().toLowerCase()
  const filtered = companies.filter(c => !s
    || c.name.toLowerCase().includes(s)
    || c.segment?.toLowerCase().includes(s)
    || c.geography?.toLowerCase().includes(s)
    || c.fundRound?.toLowerCase().includes(s)
  )
  const close = () => { setOpen(false); setQ('') }
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 bg-white border border-rule rounded-md px-3 py-1.5 cursor-pointer hover:border-ink-mute transition-colors">
        <Users size={12} className="text-ink-mute" />
        <span className="font-sans text-[12.5px] font-medium text-ink">{sel?.name || 'Select company'}</span>
        <ChevronDown size={12} className="text-ink-mute" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={close} />
          <div className="absolute top-full right-0 mt-1 bg-white border border-rule rounded-lg shadow-lg overflow-hidden z-20 w-[300px]">
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-rule">
              <Search size={12} className="text-ink-mute shrink-0" />
              <input
                autoFocus value={q} onChange={e => setQ(e.target.value)}
                placeholder="Search companies…"
                className="flex-1 bg-transparent border-0 outline-none font-sans text-[12px] text-ink placeholder:text-ink-mute"
              />
              {q && <button onClick={() => setQ('')} className="text-ink-mute hover:text-ink bg-transparent border-0 cursor-pointer p-0"><X size={11} /></button>}
            </div>
            <div className="px-3 py-1.5 border-b border-rule">
              <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-ink-mute">From the Players tab · {filtered.length}</span>
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              {filtered.length === 0 && (
                <div className="px-3 py-4 font-sans text-[12px] text-ink-mute italic text-center">No matches</div>
              )}
              {filtered.map(c => (
                <button key={c.id} onClick={() => { onSelect(c.id); close() }}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-bg border-0 bg-transparent cursor-pointer transition-colors border-b border-rule last:border-b-0"
                  style={{ background: c.id === selectedId ? '#fdf6f2' : undefined }}>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-sans text-[12.5px] font-medium text-ink truncate">{c.name}</span>
                      {c.focal && <span className="font-mono text-[7px] uppercase tracking-[0.05em] text-accent-deep bg-accent-soft px-1 py-0.5 rounded border border-accent-soft shrink-0">focal</span>}
                    </div>
                    <span className="font-sans text-[10.5px] text-ink-mute truncate">{[c.geography, c.segment].filter(Boolean).join(' · ')}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="font-mono text-[9px] text-ink-mute">{c.fundRound}</span>
                    {c.priority != null && (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(n => (
                          <span key={n} className="w-1.5 h-1.5 rounded-full" style={{ background: n <= c.priority ? '#e8896e' : '#ece8e1' }} />
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DifferentiationTab({ workspace }) {
  const companies = workspace.companies || []
  const focalCo = companies.find(c => c.focal)

  const [selectedId, setSelectedId] = useState(focalCo?.id || companies[0]?.id)
  const [byCompany, setByCompany] = useState({})
  // Segment-level competitive matrix (shared)
  const [dimensions, setDimensions] = useState(MATRIX[workspace.id]?.dimensions || [])
  const [players, setPlayers] = useState(MATRIX[workspace.id]?.players || [])

  const seedCompany = (coId) => {
    const co = companies.find(c => c.id === coId)
    const base = co?.focal ? DIFF[workspace.id] : null
    return {
      positioning: base?.positioning || '',
      differentiators: base?.differentiators ? base.differentiators.map(d => ({ ...d })) : [],
      moats: base?.moats ? [...base.moats] : [],
      risks: base?.risks ? [...base.risks] : [],
      sources: base?.sources ? base.sources.map(s => ({ ...s })) : [],
    }
  }

  useEffect(() => {
    setByCompany(prev => prev[selectedId] ? prev : { ...prev, [selectedId]: seedCompany(selectedId) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  const selectedCo = companies.find(c => c.id === selectedId)
  const c = byCompany[selectedId] || seedCompany(selectedId)
  const setC = (patch) => setByCompany(prev => ({ ...prev, [selectedId]: { ...(prev[selectedId] || seedCompany(selectedId)), ...patch } }))

  // Differentiators
  const updateDiff = (i, key, v) => setC({ differentiators: c.differentiators.map((x, j) => j === i ? { ...x, [key]: v } : x) })
  const removeDiff = (i) => setC({ differentiators: c.differentiators.filter((_, j) => j !== i) })
  const addDiff = () => setC({ differentiators: [...c.differentiators, { axis: 'New axis', edge: '', field: '' }] })

  // Sources
  const updateSource = (i, key, v) => setC({ sources: c.sources.map((x, j) => j === i ? { ...x, [key]: v } : x) })
  const removeSource = (i) => setC({ sources: c.sources.filter((_, j) => j !== i) })
  const addSource = () => setC({ sources: [...c.sources, { title: '', url: '' }] })

  // Matrix (segment-level)
  const updateDimension = (i, v) => setDimensions(p => p.map((x, j) => j === i ? v : x))
  const addDimension = () => { setDimensions(p => [...p, 'New']); setPlayers(p => p.map(pl => ({ ...pl, scores: [...pl.scores, 2] }))) }
  const removeDimension = (i) => { setDimensions(p => p.filter((_, j) => j !== i)); setPlayers(p => p.map(pl => ({ ...pl, scores: pl.scores.filter((_, j) => j !== i) }))) }
  const updatePlayerName = (i, v) => setPlayers(p => p.map((x, j) => j === i ? { ...x, name: v } : x))
  const updateScore = (pi, di, v) => setPlayers(p => p.map((x, j) => j === pi ? { ...x, scores: x.scores.map((s, k) => k === di ? v : s) } : x))
  const removePlayer = (i) => setPlayers(p => p.filter((_, j) => j !== i))
  const addPlayer = () => setPlayers(p => [...p, { name: selectedCo?.name || 'New company', scores: dimensions.map(() => 2) }])

  if (!selectedCo) {
    return (
      <div className="flex-1 flex items-center justify-center text-ink-mute font-sans text-[13px] italic">
        Add a company in the Players tab to analyse differentiation.
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-bg">
      <div className="px-8 py-8 max-w-[900px] mx-auto flex flex-col gap-8">

        {/* ── Subject banner + selector ── */}
        <div className="bg-white border border-rule rounded-lg overflow-hidden">
          <div className="px-6 pt-5 pb-5" style={{ background: 'linear-gradient(180deg, #fdf6f2 0%, #ffffff 100%)' }}>
            <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Crosshair size={12} className="text-accent" />
                  <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-accent-deep">Differentiation · {workspace.title}</span>
                </div>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <h2 className="font-serif text-[24px] font-semibold text-ink tracking-tight">{selectedCo.name}</h2>
                  <span className="font-mono text-[10px] text-ink-mute">
                    {[selectedCo.founded, selectedCo.geography, selectedCo.fundRound].filter(Boolean).join(' · ')}
                  </span>
                </div>
              </div>
              <CompanySelect companies={companies} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
            <InlineText value={c.positioning} onChange={v => setC({ positioning: v })} multiline
              placeholder={`How does ${selectedCo.name} position itself against the field?`}
              className="font-sans text-[13.5px] text-ink leading-relaxed" />
          </div>
          {/* raw material from Players */}
          {selectedCo.notes && (
            <div className="px-6 py-3.5 border-t border-rule flex items-start gap-2 bg-bg">
              <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-ink-mute shrink-0 mt-[3px]">Players note</span>
              <p className="font-sans text-[12px] text-ink-soft leading-relaxed italic">{selectedCo.notes}</p>
            </div>
          )}
        </div>

        {/* ── Differentiators ── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <SectionLabel>Edge vs the field</SectionLabel>
            <button onClick={addDiff}
              className="flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.08em] text-ink-mute hover:text-ink bg-transparent border-0 cursor-pointer transition-colors">
              <Plus size={10} /> Add
            </button>
          </div>
          {c.differentiators.length === 0 ? (
            <div className="bg-white border border-rule rounded-lg px-5 py-6 font-sans text-[12.5px] text-ink-mute italic text-center">
              No differentiators captured for {selectedCo.name} yet — click Add.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {c.differentiators.map((d, i) => (
                <div key={i} className="bg-white border border-rule rounded-lg p-4 flex flex-col gap-2.5 group relative">
                  <button onClick={() => removeDiff(i)}
                    className="absolute top-2.5 right-2.5 text-ink-mute hover:text-red-500 bg-transparent border-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-all p-0.5">
                    <X size={11} />
                  </button>
                  <div className="w-fit max-w-[70%]">
                    <InlineText value={d.axis} onChange={v => updateDiff(i, 'axis', v)} placeholder="Axis"
                      className="font-mono text-[9px] uppercase tracking-[0.1em] text-accent-deep" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-ink-soft shrink-0 mt-[3px] w-10">Edge</span>
                      <div className="flex-1 min-w-0">
                        <InlineText value={d.edge} onChange={v => updateDiff(i, 'edge', v)} multiline placeholder="The company's edge…"
                          className="font-sans text-[12.5px] text-ink leading-relaxed" />
                      </div>
                    </div>
                    <div className="flex items-start gap-2 pt-2 border-t border-rule">
                      <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-ink-mute shrink-0 mt-[3px] w-10">Field</span>
                      <div className="flex-1 min-w-0">
                        <InlineText value={d.field} onChange={v => updateDiff(i, 'field', v)} multiline placeholder="What the field does…"
                          className="font-sans text-[12px] text-ink-mute leading-relaxed" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Competitive scorecard ── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <SectionLabel>Competitive scorecard</SectionLabel>
            <div className="flex items-center gap-3">
              <button onClick={addPlayer}
                className="flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.08em] text-ink-mute hover:text-ink bg-transparent border-0 cursor-pointer transition-colors">
                <Plus size={10} /> Player
              </button>
              <button onClick={addDimension}
                className="flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.08em] text-ink-mute hover:text-ink bg-transparent border-0 cursor-pointer transition-colors">
                <Plus size={10} /> Dimension
              </button>
            </div>
          </div>
          <div className="bg-white border border-rule rounded-lg overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr className="border-b border-rule">
                  <th className="text-left px-4 py-2.5 font-mono text-[8.5px] uppercase tracking-[0.1em] text-ink-mute">Player</th>
                  {dimensions.map((dim, di) => (
                    <th key={di} className="text-left px-4 py-2.5">
                      <div className="group flex items-center gap-1">
                        <div className="min-w-[60px]">
                          <InlineText value={dim} onChange={v => updateDimension(di, v)} placeholder="Dimension"
                            className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-ink-mute" />
                        </div>
                        <button onClick={() => removeDimension(di)}
                          className="shrink-0 text-ink-mute hover:text-red-500 bg-transparent border-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-all p-0">
                          <X size={9} />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {players.map((p, pi) => {
                  const isSubject = p.name === selectedCo.name
                  return (
                    <tr key={pi} className="border-b border-rule last:border-b-0 group" style={{ background: isSubject ? '#fdf6f2' : 'transparent' }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="min-w-[90px]">
                            <InlineText value={p.name} onChange={v => updatePlayerName(pi, v)} placeholder="Company"
                              className="font-sans text-[12.5px] font-medium text-ink" />
                          </div>
                          {isSubject && <span className="font-mono text-[7.5px] uppercase tracking-[0.05em] text-accent-deep bg-accent-soft px-1.5 py-0.5 rounded border border-accent-soft shrink-0">subject</span>}
                          {!isSubject && (
                            <button onClick={() => removePlayer(pi)}
                              className="shrink-0 text-ink-mute hover:text-red-500 bg-transparent border-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-all p-0">
                              <X size={10} />
                            </button>
                          )}
                        </div>
                      </td>
                      {p.scores.map((s, di) => (
                        <td key={di} className="px-4 py-3"><ScoreDots score={s} onChange={v => updateScore(pi, di, v)} /></td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-4 px-1">
            <span className="font-mono text-[8.5px] uppercase tracking-[0.08em] text-ink-mute">Click a dot to rate ·</span>
            {[3, 2, 1].map(n => (
              <div key={n} className="flex items-center gap-1.5">
                <ScoreDots score={n} />
                <span className="font-mono text-[9px] text-ink-mute">{SCORE[n].label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Moats vs Risks ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-rule rounded-lg p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Shield size={12} style={{ color: '#2d6a3f' }} />
              <span className="font-mono text-[9px] uppercase tracking-[0.13em] text-ink-mute">Moats</span>
            </div>
            <EditableList items={c.moats} onChange={list => setC({ moats: list })} accentColor="#2d6a3f" placeholder="What defends this company?" />
          </div>
          <div className="bg-white border border-rule rounded-lg p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={12} style={{ color: '#c04a22' }} />
              <span className="font-mono text-[9px] uppercase tracking-[0.13em] text-ink-mute">Risks &amp; gaps</span>
            </div>
            <EditableList items={c.risks} onChange={list => setC({ risks: list })} accentColor="#c04a22" placeholder="Where is this company exposed?" />
          </div>
        </div>

        {/* ── Sources ── */}
        <div className="flex flex-col gap-3 pb-4">
          <div className="flex items-center justify-between">
            <SectionLabel>Sources</SectionLabel>
            <button onClick={addSource}
              className="flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.08em] text-ink-mute hover:text-ink bg-transparent border-0 cursor-pointer transition-colors">
              <Plus size={10} /> Add
            </button>
          </div>
          <div className="bg-white border border-rule rounded-lg overflow-hidden divide-y divide-rule">
            {c.sources.length === 0 && (
              <div className="px-4 py-5 font-sans text-[12.5px] text-ink-mute italic text-center">No sources cited yet — click Add.</div>
            )}
            {c.sources.map((s, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3 group">
                <FileText size={12} className="text-ink-mute shrink-0 mt-1" />
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <InlineText value={s.title} onChange={v => updateSource(i, 'title', v)} placeholder="Source title"
                    className="font-sans text-[12.5px] text-ink leading-snug" />
                  <InlineText value={s.url} onChange={v => updateSource(i, 'url', v)} placeholder="https://… (optional)"
                    className="font-mono text-[10px] text-ink-mute leading-snug" />
                </div>
                {s.url && (
                  <a href={s.url} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 text-ink-mute hover:text-ink transition-colors mt-1" title="Open source">
                    <ExternalLink size={12} />
                  </a>
                )}
                <button onClick={() => removeSource(i)}
                  className="shrink-0 text-ink-mute hover:text-red-500 bg-transparent border-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-all p-0.5 mt-0.5">
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
