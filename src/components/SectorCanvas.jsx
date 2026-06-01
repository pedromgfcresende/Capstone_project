import { useState, useMemo } from 'react'
import { ArrowRight, Search, X, Pencil, Check, Sparkles, ChevronDown, ChevronUp, Send, TrendingUp, Target, Radio, ExternalLink, Plus } from 'lucide-react'

const STATUS_LABEL = {
  seed:       { label: 'Not started', color: '#f0ede8', text: '#8a8580' },
  generating: { label: 'Generating…', color: '#fce6dc', text: '#e85d3b' },
  ready:      { label: 'Ready',       color: '#d4edda', text: '#2d6a3f' },
}

const SIGNAL_COLORS = {
  'Funding':    { bg: '#d4edda', text: '#2d6a3f' },
  'M&A':        { bg: '#e8e0f8', text: '#5a3d9a' },
  'Regulatory': { bg: '#fce6dc', text: '#c04a22' },
  'Trend':      { bg: '#e8f0fe', text: '#2a5fd4' },
  'Exit':       { bg: '#fff3cd', text: '#856404' },
}

const ROUND_TONE = {}

const ROUND_ORDER = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D', 'Series E', 'Growth']

function InlineText({ value, onChange, multiline = false, placeholder = 'Click to edit…', className = '' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const save = () => { onChange(draft); setEditing(false) }
  const cancel = () => { setDraft(value); setEditing(false) }

  if (editing) return multiline ? (
    <div className="flex flex-col gap-2 w-full">
      <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)} rows={3}
        onKeyDown={e => { if (e.key === 'Escape') cancel() }}
        className={`bg-white border border-rule rounded px-2 py-1.5 outline-none resize-none w-full font-sans text-[12.5px] text-ink leading-relaxed ${className}`} />
      <div className="flex gap-2">
        <button onClick={save} className="font-mono text-[9px] uppercase tracking-[0.08em] px-2.5 py-1 rounded bg-ink text-white border-0 cursor-pointer"
          onMouseEnter={e => e.currentTarget.style.background = '#e85d3b'} onMouseLeave={e => e.currentTarget.style.background = '#1a1a1a'}>Save</button>
        <button onClick={cancel} className="font-mono text-[9px] uppercase tracking-[0.08em] px-2.5 py-1 rounded bg-transparent border border-rule text-ink-mute cursor-pointer hover:text-ink">Cancel</button>
      </div>
    </div>
  ) : (
    <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
      onBlur={save} onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }}
      className={`bg-white border border-rule rounded px-2 py-1 outline-none w-full font-sans text-[12.5px] text-ink ${className}`} />
  )

  return (
    <div className="group flex items-start gap-1.5 cursor-text w-full" onClick={() => { setEditing(true); setDraft(value) }}>
      <span className={`flex-1 ${className} ${!value ? 'text-ink-mute italic' : ''}`}>{value || placeholder}</span>
      <Pencil size={10} className="text-ink-mute opacity-0 group-hover:opacity-40 transition-opacity mt-0.5 shrink-0" />
    </div>
  )
}

function SegmentCard({ ws, state, activeRound, onEnter }) {
  const [open, setOpen] = useState(false)
  const [summary, setSummary] = useState(ws.summary || '')
  const [keyInsight, setKeyInsight] = useState(ws.keyInsight || '')
  const [priorities, setPriorities] = useState(ws.priorityCompanies || [])
  const [questions, setQuestions] = useState(ws.openQuestions || [])
  const status = state?.status || 'seed'
  const badge = STATUS_LABEL[status] || STATUS_LABEL.seed
  const companies = ws.companies || []
  const shown = companies.slice(0, 6)
  const overflow = companies.length - shown.length

  const updatePriorityName = (i, val) => setPriorities(p => p.map((x, j) => j === i ? { ...x, name: val } : x))
  const updatePriorityReason = (i, val) => setPriorities(p => p.map((x, j) => j === i ? { ...x, reason: val } : x))
  const removePriority = (i) => setPriorities(p => p.filter((_, j) => j !== i))
  const addPriority = () => setPriorities(p => [...p, { name: '', reason: '' }])

  const updateQuestion = (i, val) => setQuestions(p => p.map((x, j) => j === i ? val : x))
  const removeQuestion = (i) => setQuestions(p => p.filter((_, j) => j !== i))
  const addQuestion = () => setQuestions(p => [...p, ''])

  return (
    <div className="bg-white border border-rule rounded-lg overflow-hidden transition-colors" style={{ borderColor: open ? '#c0bdb8' : undefined }}>

      {/* Header row */}
      <div className="flex items-start justify-between px-5 pt-4 pb-3">
        <div className="flex flex-col gap-1.5 flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-3">
            <span className="font-sans text-[13.5px] font-semibold text-ink">{ws.title}</span>
            {ws.focalCompany && (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-mono text-[7.5px] bg-accent-soft text-accent-deep px-1.5 py-0.5 rounded uppercase tracking-[0.05em] border border-accent-soft">focal</span>
                <span className="font-sans text-[11.5px] text-ink-soft">{ws.focalCompany}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-[0.08em]"
            style={{ background: badge.color, color: badge.text }}>{badge.label}</span>
          <span className="font-sans text-[11px] text-ink-mute">{companies.length} companies</span>
        </div>
      </div>

      {/* Footer: chips + actions */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-rule gap-4 bg-bg">
        <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
          {shown.map(co => {
            const matched = !activeRound || co.fundRound === activeRound
            return (
              <span key={co.id}
                className="font-sans text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap transition-all"
                style={!matched
                  ? { background: '#f5f2ef', color: '#c0bdb8', borderColor: '#e8e0d4', opacity: 0.35 }
                  : co.focal
                    ? { background: '#fce6dc', color: '#c04a22', borderColor: '#f5c9b5' }
                    : { background: '#f5f2ef', color: '#6a6560', borderColor: '#e8e0d4' }
                }>{co.name}</span>
            )
          })}
          {overflow > 0 && (
            <span className="font-sans text-[11px] px-2 py-0.5 rounded-full bg-white text-ink-mute border border-rule whitespace-nowrap">+{overflow} more</span>
          )}
          {companies.length === 0 && (
            <span className="font-sans text-[11.5px] text-ink-mute italic">No companies tracked yet</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Briefing toggle */}
          <button
            onClick={() => setOpen(p => !p)}
            className="flex items-center gap-1 font-sans text-[11.5px] text-ink-mute hover:text-ink px-2.5 py-1.5 rounded border border-rule bg-white cursor-pointer transition-all border-0"
            title={open ? 'Hide briefing' : 'Show briefing'}
          >
            {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            <span className="font-mono text-[9px] uppercase tracking-[0.08em]">Briefing</span>
          </button>
          <button
            onClick={onEnter}
            className="flex items-center gap-1.5 font-sans text-[12px] font-medium px-3 py-1.5 rounded-md bg-ink text-white border-0 cursor-pointer transition-all shrink-0"
            onMouseEnter={e => e.currentTarget.style.background = '#e85d3b'}
            onMouseLeave={e => e.currentTarget.style.background = '#1a1a1a'}
          >
            Enter segment <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* Expanded briefing */}
      {open && (
        <div className="border-t border-rule px-6 py-5 flex flex-col gap-6 bg-bg">

          {/* What's happening */}
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-ink-mute">What's happening</span>
            <InlineText
              value={summary}
              onChange={setSummary}
              multiline
              placeholder="Describe what's happening in this segment…"
              className="font-sans text-[12.5px] text-ink leading-relaxed"
            />
          </div>

          {/* Key insight */}
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-ink-mute">Key insight</span>
            <div className="flex items-start gap-2.5 bg-white border border-rule rounded-md px-3 py-2.5">
              <span className="mt-[5px] w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
              <InlineText
                value={keyInsight}
                onChange={setKeyInsight}
                placeholder="What is the single most important observation?"
                className="font-sans text-[12.5px] text-ink leading-relaxed"
              />
            </div>
          </div>

          {/* Priority companies */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-ink-mute">Priority companies</span>
              <button onClick={addPriority}
                className="font-mono text-[8.5px] uppercase tracking-[0.08em] text-ink-mute hover:text-ink bg-transparent border-0 cursor-pointer flex items-center gap-1 transition-colors">
                <Plus size={10} /> Add
              </button>
            </div>
            {priorities.length === 0 && (
              <p className="font-sans text-[12px] text-ink-mute italic">No priority companies yet — click Add to track one.</p>
            )}
            <div className="flex flex-col gap-2">
              {priorities.map((pc, i) => (
                <div key={i} className="flex items-start gap-3 bg-white border border-rule rounded-md px-3 py-2.5 group">
                  <div className="shrink-0 min-w-[100px]">
                    <InlineText value={pc.name} onChange={v => updatePriorityName(i, v)} placeholder="Company name"
                      className="font-sans text-[12px] font-semibold text-ink" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <InlineText value={pc.reason} onChange={v => updatePriorityReason(i, v)} placeholder="Why is this company a priority?"
                      className="font-sans text-[12px] text-ink-soft leading-relaxed" />
                  </div>
                  <button onClick={() => removePriority(i)}
                    className="shrink-0 text-ink-mute hover:text-red-500 bg-transparent border-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-all p-0.5">
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Open questions */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[8.5px] uppercase tracking-[0.14em] text-ink-mute">Open questions</span>
              <button onClick={addQuestion}
                className="font-mono text-[8.5px] uppercase tracking-[0.08em] text-ink-mute hover:text-ink bg-transparent border-0 cursor-pointer flex items-center gap-1 transition-colors">
                <Plus size={10} /> Add
              </button>
            </div>
            {questions.length === 0 && (
              <p className="font-sans text-[12px] text-ink-mute italic">No open questions yet — click Add to capture one.</p>
            )}
            <ul className="flex flex-col gap-2">
              {questions.map((q, i) => (
                <li key={i} className="flex items-start gap-2.5 group">
                  <span className="font-mono text-[10px] text-ink-mute shrink-0 mt-[4px]">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <InlineText value={q} onChange={v => updateQuestion(i, v)} placeholder="What does the team still need to figure out?"
                      className="font-sans text-[12px] text-ink-soft leading-relaxed" />
                  </div>
                  <button onClick={() => removeQuestion(i)}
                    className="shrink-0 text-ink-mute hover:text-red-500 bg-transparent border-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-all p-0.5">
                    <X size={11} />
                  </button>
                </li>
              ))}
            </ul>
          </div>

        </div>
      )}

    </div>
  )
}

const MOCK_DATA = {
  'sector-1': {
    thesis: 'Embedded Finance is undergoing rapid structural change as B2B payment layers consolidate and compliance requirements raise the floor for new entrants. The market is bifurcating between infrastructure players and application-layer tools targeting finance teams.',
    dynamics: [
      'Regulation (PSD2, open banking) is lowering the infrastructure cost for new entrants while raising compliance burden',
      'CFO software consolidation is pulling spend management, AP/AR, and treasury into unified platforms',
      'AI-native automation is displacing rule-based reconciliation tools across the mid-market',
    ],
    signals: [
      { type: 'Funding',    date: 'Apr 2025', label: 'Pennylane raises €75M Series C',            url: 'https://techcrunch.com', note: 'Accountant-channel confirmed as Europe\'s most efficient GTM for CFO SaaS. Round led by DST Global.' },
      { type: 'Trend',      date: 'Feb 2025', label: 'AI-native CFO tools displace legacy ERP',   url: 'https://www.ft.com',    note: 'FT analysis: 60% of European CFOs surveyed plan to replace at least one ERP module with a point solution by 2026.' },
      { type: 'Funding',    date: 'Nov 2024', label: 'Agicap raises €45M Series C',               url: 'https://techcrunch.com', note: 'Expansion into DACH and Southern Europe. Validates growing demand for CFO cash-flow tooling outside France.' },
      { type: 'Regulatory', date: 'Sep 2024', label: 'PSD3 enters trilogue negotiations',          url: 'https://www.reuters.com', note: 'Broadens open banking obligations and tightens liability rules for payment institutions. Enforcement expected 2026.' },
      { type: 'M&A',        date: 'Jun 2024', label: 'Société Générale acquires Treezor',          url: 'https://www.reuters.com', note: 'Incumbent absorption of BaaS infrastructure. Narrows the independent BaaS market in Europe.' },
      { type: 'Funding',    date: 'Mar 2024', label: 'Payhawk raises $100M at $1B valuation',      url: 'https://techcrunch.com', note: 'First unicorn from Bulgaria. Signals European spend management has global appetite at growth stage.' },
      { type: 'Trend',      date: 'Jan 2024', label: 'AP automation becomes default CFO priority', url: 'https://www.gartner.com', note: 'Gartner, Forrester and IDC all flag AP/AR automation as a top-5 CFO software priority for 2024–25.' },
      { type: 'M&A',        date: 'Oct 2023', label: 'Pleo acquires Tiller Systems',               url: 'https://www.bloomberg.com', note: 'Horizontal expansion into restaurant and retail verticals. Signals SMB spend management broadening beyond finance.' },
    ],
  },
  'sector-2': {
    thesis: 'Climate Tech is being reshaped by mandatory ESG reporting requirements, particularly the EU\'s CSRD directive. Carbon accounting has become a compliance necessity rather than a differentiating feature, creating both urgency and commoditisation pressure.',
    dynamics: [
      'CSRD and SFDR are creating immediate demand across large-cap and soon mid-cap European companies',
      'Carbon data quality is the emerging battleground — measurement methodologies are not yet standardised',
      'Market is bifurcating: enterprise-grade platforms (Scope 1–3 full coverage) vs SMB self-serve tools',
    ],
    signals: [
      { type: 'Regulatory', date: 'Mar 2025', label: 'EC confirms CSRD mid-cap enforcement delay', url: 'https://www.reuters.com',   note: 'Mid-cap CSRD deadline pushed to FY2026. Short-term pipeline softens for SMB tools; enterprise demand unaffected.' },
      { type: 'Trend',      date: 'Nov 2024', label: 'Carbon data quality becomes key battleground', url: 'https://www.ft.com',      note: 'Bloomberg NEF report: data verification is now the primary switching cost in enterprise carbon platforms.' },
      { type: 'Funding',    date: 'Jul 2024', label: 'Sweep raises $73M Series B',                  url: 'https://techcrunch.com',  note: 'One of the largest rounds in European carbon accounting. Validates enterprise appetite for full Scope 1–3 coverage.' },
      { type: 'Funding',    date: 'Feb 2024', label: 'Greenly raises €31M Series B',                url: 'https://techcrunch.com',  note: 'SMB-focused play gaining traction with CSRD-readiness messaging. Contrasts with Sweep\'s enterprise motion.' },
    ],
  },
}

function EditableField({ value, onChange, multiline = false, className = '' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const save = () => { onChange(draft); setEditing(false) }

  if (editing) return multiline ? (
    <div className="flex flex-col gap-2">
      <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)} rows={5}
        className={`bg-transparent border-0 border-b border-rule outline-none resize-none w-full ${className}`} />
      <div className="flex justify-end">
        <button onClick={save}
          className="flex items-center gap-1.5 font-sans text-[11px] font-medium px-2.5 py-1 rounded bg-ink text-white border-0 cursor-pointer"
          onMouseEnter={e => e.currentTarget.style.background = '#e85d3b'}
          onMouseLeave={e => e.currentTarget.style.background = '#1a1a1a'}
        ><Check size={11} /> Save</button>
      </div>
    </div>
  ) : (
    <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
      onBlur={save} onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
      className={`bg-transparent border-0 border-b border-rule outline-none w-full ${className}`} />
  )

  return (
    <div className="group flex items-start gap-1.5 cursor-text" onClick={() => { setEditing(true); setDraft(value) }}>
      <span className={`flex-1 ${className}`}>{value}</span>
      <Pencil size={10} className="text-ink-mute opacity-0 group-hover:opacity-50 transition-opacity mt-0.5 shrink-0" />
    </div>
  )
}

function InfoBox({ icon: Icon, label, children }) {
  return (
    <div className="bg-white border border-rule rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Icon size={12} className="text-ink-mute shrink-0" />
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-mute">{label}</span>
      </div>
      {children}
    </div>
  )
}

function QueryResult({ result, query }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="bg-white border border-rule rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 border-b border-rule bg-bg flex items-center gap-2">
        <Sparkles size={11} className="text-accent shrink-0" />
        <span className="font-sans text-[12px] text-ink-soft italic flex-1">"{query}"</span>
      </div>
      <div className="px-4 py-3.5">
        <p className="font-sans text-[13px] text-ink leading-relaxed">{result.answer}</p>
      </div>
      {result.citations.length > 0 && (
        <div className="border-t border-rule">
          <button onClick={() => setExpanded(p => !p)}
            className="w-full flex items-center justify-between px-4 py-2 bg-transparent border-0 cursor-pointer hover:bg-bg transition-colors">
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-mute">
              {result.citations.length} source{result.citations.length !== 1 ? 's' : ''}
            </span>
            {expanded ? <ChevronUp size={12} className="text-ink-mute" /> : <ChevronDown size={12} className="text-ink-mute" />}
          </button>
          {expanded && (
            <div className="px-4 pb-4 flex flex-col gap-2.5">
              {result.citations.map((c, i) => (
                <div key={i} className="flex gap-2.5 py-2 border-t border-rule first:border-t-0">
                  <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-accent-deep bg-accent-soft px-1.5 py-0.5 rounded border border-accent-soft shrink-0 h-fit mt-0.5">{c.workspace}</span>
                  <p className="font-sans text-[12px] text-ink-soft leading-relaxed">{c.note}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const MOCK_RESPONSES = [
  (sector) => ({
    answer: `Across ${sector.label}, enterprise positioning is strongest among companies that have secured multi-year contracts with large institutional clients. Competitive differentiation clusters around integration depth and compliance posture rather than pure product features.`,
    citations: [{ workspace: sector.workspaces[0]?.title || 'Segment', note: 'Focal company leads on enterprise contract volume with 3 disclosed Fortune 500 relationships.' }]
  }),
  (sector) => ({
    answer: `The funding landscape across ${sector.label} shows a clear bifurcation: early-stage rounds concentrate in product-led companies, while growth-stage capital flows toward those with proven enterprise sales motions.`,
    citations: [{ workspace: sector.workspaces[0]?.title || 'Segment', note: 'Median Series A is €12M, with two outliers above €40M in the past 18 months.' }]
  }),
]

export default function SectorCanvas({ sector, workspaceStates, onSelect }) {
  const mock = MOCK_DATA[sector?.id] || {}

  const [thesis, setThesis] = useState(mock.thesis || 'Click to add a sector thesis — what is the core structural opportunity here?')
  const [dynamics] = useState(mock.dynamics || [])
  const [signals] = useState(mock.signals || [])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeRound, setActiveRound] = useState(null)
  const [activeSignalType, setActiveSignalType] = useState(null)
  const [aiQuery, setAiQuery] = useState('')
  const [results, setResults] = useState([])
  const [thinking, setThinking] = useState(false)

  const allCompanies = useMemo(() => {
    if (!sector) return []
    return sector.workspaces.flatMap(ws =>
      (ws.companies || []).map(co => ({ ...co, workspaceTitle: ws.title, workspaceId: ws.id }))
    )
  }, [sector])

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    return allCompanies.filter(co =>
      co.name.toLowerCase().includes(q) ||
      co.segment?.toLowerCase().includes(q) ||
      co.geography?.toLowerCase().includes(q) ||
      co.fundRound?.toLowerCase().includes(q)
    ).slice(0, 8)
  }, [searchQuery, allCompanies])

  const handleAiQuery = () => {
    const q = aiQuery.trim()
    if (!q || thinking) return
    setAiQuery('')
    setThinking(true)
    setTimeout(() => {
      const mockFn = MOCK_RESPONSES[results.length % MOCK_RESPONSES.length]
      setResults(p => [...p, { query: q, ...mockFn(sector) }])
      setThinking(false)
    }, 1400)
  }

  const totalCompanies = allCompanies.length
  const totalSegments = sector?.workspaces?.length || 0
  const ROUND_ORDER = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D', 'Series E', 'Growth', 'Other']
  const roundCounts = useMemo(() => {
    const counts = {}
    allCompanies.forEach(co => { if (co.fundRound) counts[co.fundRound] = (counts[co.fundRound] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => {
      const ai = ROUND_ORDER.indexOf(a[0])
      const bi = ROUND_ORDER.indexOf(b[0])
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
    })
  }, [allCompanies])

  if (!sector) return (
    <div className="flex-1 flex items-center justify-center text-ink-mute font-sans text-[13px]">
      Select a sector from the sidebar
    </div>
  )

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-bg">

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-rule shrink-0 bg-bg-card">
        <div>
          <div className="font-mono text-[9px] text-ink-mute uppercase tracking-[0.15em] mb-0.5">Sector</div>
          <h1 className="font-serif text-[20px] font-semibold tracking-tight text-ink">{sector.label}</h1>
        </div>
        <span className="font-mono text-[10px] text-ink-mute">{sector.updatedAt}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-7">
          <div className="max-w-[860px] mx-auto flex flex-col gap-8">

            {/* ── Search ── */}
            <div className="flex flex-col gap-3">
            <div className="relative">
              <div className="flex items-center gap-2.5 px-4 py-3 bg-white border border-rule rounded-lg focus-within:border-ink-mute transition-colors">
                <Search size={14} className="text-ink-mute shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={`Search companies across ${sector.label}…`}
                  className="flex-1 bg-transparent border-0 outline-none font-sans text-[13px] text-ink placeholder:text-ink-mute"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="bg-transparent border-0 cursor-pointer text-ink-mute hover:text-ink p-0">
                    <X size={13} />
                  </button>
                )}
              </div>
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-rule rounded-lg shadow-lg overflow-hidden z-20">
                  {searchResults.map((co, i) => (
                    <button key={i}
                      onClick={() => { setSearchQuery(''); onSelect({ type: 'workspace', id: co.workspaceId, sectorId: sector.id }) }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-bg border-0 bg-transparent cursor-pointer text-left transition-colors border-b border-rule last:border-b-0">
                      <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-ink-mute w-16 shrink-0">company</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-sans text-[12.5px] font-medium text-ink truncate">{co.name}</div>
                        <div className="font-sans text-[11px] text-ink-mute truncate">{co.workspaceTitle} · {co.geography} · {co.fundRound}</div>
                      </div>
                      <ArrowRight size={12} className="text-ink-mute shrink-0" />
                    </button>
                  ))}
                </div>
              )}
              {searchQuery && searchResults.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-rule rounded-lg shadow-lg px-4 py-3 z-20">
                  <span className="font-sans text-[12.5px] text-ink-mute italic">No companies match "{searchQuery}"</span>
                </div>
              )}
            </div>

            {/* Stats row — below search */}
            <div className="flex items-center gap-3 px-4 py-3 bg-white border border-rule rounded-lg flex-wrap">
              <div className="flex items-baseline gap-1">
                <span className="font-serif text-[17px] font-semibold text-ink">{totalSegments}</span>
                <span className="font-sans text-[11px] text-ink-mute">segment{totalSegments !== 1 ? 's' : ''}</span>
              </div>
              <div className="w-px h-3.5 bg-rule shrink-0" />
              <div className="flex items-baseline gap-1">
                <span className="font-serif text-[17px] font-semibold text-ink">{totalCompanies}</span>
                <span className="font-sans text-[11px] text-ink-mute">companies</span>
              </div>
              {roundCounts.length > 0 && (
                <>
                  <div className="w-px h-3.5 bg-rule shrink-0" />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {roundCounts.map(([round, count]) => {
                      const active = activeRound === round
                      return (
                        <button
                          key={round}
                          onClick={() => setActiveRound(p => p === round ? null : round)}
                          className="font-mono text-[10px] px-2.5 py-1 rounded border cursor-pointer transition-all"
                          style={active
                            ? { background: '#1a1a1a', color: '#fff', borderColor: '#1a1a1a' }
                            : { background: '#faf9f7', color: '#6a6560', borderColor: '#ddd6cb' }
                          }
                        >
                          {round} · {count}
                        </button>
                      )
                    })}
                    {activeRound && (
                      <button onClick={() => setActiveRound(null)} className="font-mono text-[10px] text-ink-mute hover:text-ink bg-transparent border-0 cursor-pointer px-1 transition-colors">
                        clear ×
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
            </div>

            {/* ── Two info boxes ── */}
            <div className="grid grid-cols-2 gap-3">
              <InfoBox icon={Target} label="Sector Thesis">
                <EditableField value={thesis} onChange={setThesis} multiline
                  className="font-sans text-[12.5px] text-ink leading-relaxed" />
              </InfoBox>
              <InfoBox icon={TrendingUp} label="Key Dynamics">
                {dynamics.length > 0 ? (
                  <ul className="flex flex-col gap-2.5">
                    {dynamics.map((d, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-[6px] w-1 h-1 rounded-full bg-accent shrink-0" />
                        <span className="font-sans text-[12.5px] text-ink leading-relaxed">{d}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="font-sans text-[12.5px] text-ink-mute italic">No dynamics captured yet</p>
                )}
              </InfoBox>
            </div>

            {/* ── Signals feed ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Radio size={11} className="text-ink-mute" />
                  <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute">Signals & Activity</span>
                  <span className="font-mono text-[9px] text-ink-mute">· {activeSignalType ? signals.filter(s => s.type === activeSignalType).length : signals.length} events</span>
                </div>
                {/* Type filter tags */}
                <div className="flex items-center gap-1.5">
                  {[...new Set(signals.map(s => s.type))].map(type => {
                    const colors = SIGNAL_COLORS[type] || { bg: '#f0ede8', text: '#6a6560' }
                    const active = activeSignalType === type
                    return (
                      <button
                        key={type}
                        onClick={() => setActiveSignalType(p => p === type ? null : type)}
                        className="font-mono text-[8.5px] uppercase tracking-[0.08em] px-2 py-0.5 rounded border-0 cursor-pointer transition-all"
                        style={active
                          ? { background: colors.text, color: '#fff' }
                          : { background: colors.bg, color: colors.text, opacity: 0.75 }
                        }
                      >
                        {type}
                      </button>
                    )
                  })}
                  {activeSignalType && (
                    <button onClick={() => setActiveSignalType(null)} className="font-mono text-[8.5px] text-ink-mute hover:text-ink bg-transparent border-0 cursor-pointer px-1 transition-colors">
                      ×
                    </button>
                  )}
                </div>
              </div>

              {signals.length === 0 ? (
                <div className="px-4 py-6 border border-rule rounded-lg bg-white text-center">
                  <span className="font-sans text-[12.5px] text-ink-mute italic">No signals recorded yet</span>
                </div>
              ) : (
                <div className="flex flex-col overflow-y-auto pr-1" style={{ maxHeight: 340 }}>
                  {signals.filter(s => !activeSignalType || s.type === activeSignalType).map((s, i, arr) => {
                    const colors = SIGNAL_COLORS[s.type] || { bg: '#f0ede8', text: '#6a6560' }
                    return (
                      <div key={i} className="flex gap-4 group">
                        {/* Timeline spine */}
                        <div className="flex flex-col items-center" style={{ width: 28 }}>
                          <div className="w-2 h-2 rounded-full border-2 mt-4 shrink-0" style={{ borderColor: colors.text, background: colors.bg }} />
                          {i < arr.length - 1 && <div className="flex-1 w-px bg-rule mt-1" />}
                        </div>
                        {/* Content */}
                        <div className={`flex-1 pb-5 ${i === signals.length - 1 ? '' : ''}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-[9px] text-ink-mute shrink-0">{s.date}</span>
                            <span className="font-mono text-[8px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded shrink-0"
                              style={{ background: colors.bg, color: colors.text }}>{s.type}</span>
                            <span className="font-sans text-[12.5px] font-medium text-ink flex-1">{s.label}</span>
                            {s.url && (
                              <a href={s.url} target="_blank" rel="noopener noreferrer"
                                className="shrink-0 text-ink-mute hover:text-ink transition-colors"
                                title="Open source">
                                <ExternalLink size={11} />
                              </a>
                            )}
                          </div>
                          <p className="font-sans text-[12px] text-ink-soft leading-relaxed">{s.note}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ── Segments ── */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute">Segments</span>
                <span className="font-mono text-[9px] text-ink-mute">· {sector.workspaces.length}</span>
              </div>

              {sector.workspaces.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg py-12" style={{ borderColor: '#d8d2c5' }}>
                  <div className="font-sans text-[13px] text-ink-mute">No segments yet</div>
                  <div className="font-sans text-[11.5px] text-ink-mute">Create a workspace from the sidebar to add a segment</div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {sector.workspaces.map(ws => (
                    <SegmentCard
                      key={ws.id}
                      ws={ws}
                      state={workspaceStates?.[ws.id]}
                      activeRound={activeRound}
                      onEnter={() => onSelect({ type: 'workspace', id: ws.id, sectorId: sector.id })}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── AI Query ── */}
            <div className="pb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute">Ask across segments</span>
                <span className="font-mono text-[9px] text-ink-mute">· AI synthesis</span>
              </div>
              {results.length > 0 && (
                <div className="flex flex-col gap-3 mb-4">
                  {results.map((r, i) => <QueryResult key={i} result={r} query={r.query} />)}
                </div>
              )}
              {thinking && (
                <div className="flex items-center gap-3 px-4 py-4 bg-white border border-rule rounded-lg mb-4">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-accent" style={{ animation: `pulse 1.2s ease-in-out ${i*0.2}s infinite` }} />
                    ))}
                  </div>
                  <span className="font-sans text-[12.5px] text-ink-mute italic">Synthesising across segments…</span>
                </div>
              )}
              <div className="flex items-center gap-3 px-4 py-3.5 bg-white border border-rule rounded-lg focus-within:border-ink-mute transition-colors">
                <Sparkles size={13} className="text-ink-mute shrink-0" />
                <input
                  type="text"
                  value={aiQuery}
                  onChange={e => setAiQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAiQuery() }}
                  placeholder={sector.workspaces.length === 0 ? 'Add segments to start querying…' : 'Ask anything — e.g. "Who has the strongest enterprise traction?"'}
                  disabled={sector.workspaces.length === 0 || thinking}
                  className="flex-1 bg-transparent border-0 outline-none font-sans text-[13px] text-ink placeholder:text-ink-mute disabled:opacity-50"
                />
                <button
                  onClick={handleAiQuery}
                  disabled={!aiQuery.trim() || thinking || sector.workspaces.length === 0}
                  className="shrink-0 p-1 rounded text-ink-mute hover:text-ink disabled:opacity-30 bg-transparent border-0 cursor-pointer transition-colors"
                >
                  <Send size={13} />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
