import { useState } from 'react'
import { Pencil, Plus, X, Target, GitBranch, TrendingUp, TrendingDown, RotateCcw, Flag, Eye } from 'lucide-react'
import { segmentOverview, FALLBACK_OVERVIEW } from '../../data/segmentOverview'

const VERDICTS = {
  'Active conviction': { bg: '#d4edda', text: '#2d6a3f' },
  'Worth watching':    { bg: '#fff3cd', text: '#856404' },
  'Low priority':      { bg: '#f0ede8', text: '#8a8580' },
}

// Segment-level memo seeds, keyed by workspace id.
const MEMO = {
  'ws-1': {
    thesis: 'Mid-market AP/AR automation is consolidating into a single CFO platform, and the segment is wide open — no incumbent yet owns it. This is a market worth being early in.',
    structure: 'Fragmented and consolidating. Qonto leads on scale, Pennylane owns the accountant channel, Spendesk owns brand — but no one yet owns unified AP/AR for the mid-market. That white space is the prize.',
    attractive: [
      'Large, underserved mid-market sitting between SMB neobanks and enterprise suites.',
      'Regulatory tailwind (PSD3, open banking) lowers entry costs while raising the floor.',
      'AI-native automation is actively displacing rule-based ERP modules.',
    ],
    risks: [
      'Incumbents (Qonto) can bundle AP/AR for free and compress pricing.',
      'Distribution is the bottleneck — the accountant channel is unproven at scale.',
      'Compliance cost rises with PSD3, squeezing thinly-capitalised entrants.',
    ],
    changeMind: [
      'A clear distribution winner emerging and locking up the accountant channel.',
      'Qonto or a bank moving decisively into unified mid-market AP/AR.',
      'Funding drying up at Series A, signalling investor cooling on the category.',
    ],
  },
  'ws-2': {
    thesis: 'CSRD makes enterprise carbon accounting non-discretionary, but measurement is commoditising — the durable value is concentrating in audit-grade data verification.',
    structure: 'Bifurcating. Sweep leads enterprise on Scope 1–3 depth; Greenly and a long SMB tail compete on price below. The defensible ground is audit-grade verification, not measurement.',
    attractive: [
      'CSRD creates mandatory, recurring demand across large-cap Europe.',
      'Data verification is emerging as a real, premium-priced moat.',
      'Enterprise contracts are multi-year and sticky.',
    ],
    risks: [
      'Measurement is commoditising fast from the SMB tier upward.',
      'Hyperscalers (SAP, Salesforce) could bundle native carbon modules.',
      'Mid-cap CSRD delay softens the near-term pipeline.',
    ],
    changeMind: [
      'Verification proving out as a sustained pricing premium.',
      'A hyperscaler shipping a native carbon module.',
      'Enterprise net retention slipping below 100%.',
    ],
  },
  'ws-3': {
    thesis: 'Spend management is a large but late-majority market where card issuance is commoditised — the contest is now distribution and geography, and consolidation is near.',
    structure: 'Mature and crowded. Pleo, Spendesk and Payhawk are all scaled; differentiation is now motion and geography, not product. Card issuance itself is fully commoditised.',
    attractive: [
      'Large installed base and proven willingness to pay across EU SMBs.',
      'Interchange economics fund efficient, near-free distribution.',
      'AI-driven controls open a fresh upgrade and upsell cycle.',
    ],
    risks: [
      'Neobanks (Qonto) bundle spend management for free at the low end.',
      'Category is late-majority — growth is decelerating sector-wide.',
      'Differentiation is thin; consolidation will compress multiples.',
    ],
    changeMind: [
      'A scaled player breaking out internationally at efficient CAC.',
      'AI controls proving to drive measurable, durable upsell.',
      'A wave of consolidation resetting the competitive map.',
    ],
  },
  'ws-4': {
    thesis: 'Embedded B2B lending is early and fast-growing, filling the gap banks left in SMB credit — but the rate cycle will separate the data-driven, asset-light winners from the rest.',
    structure: 'Early and capital-constrained. Defacto leads on embedded API distribution and real-time underwriting; RBF peers (Silvr, Karmen) are direct and balance-sheet-heavier; trade-credit players sit adjacent.',
    attractive: [
      'Structural SMB working-capital gap left by retreating banks.',
      'Real-time data underwriting expands the addressable borrower base.',
      'Embedded distribution into platforms compounds borrower flow.',
    ],
    risks: [
      'Higher rates compress spreads and raise default risk across the segment.',
      'Capital intensity deters pure-SaaS investors.',
      'Regulation (CCD2) is pulling some models into scope.',
    ],
    changeMind: [
      'Loss rates holding across a full rate cycle.',
      'A capital-efficient funding structure proving it scales.',
      'A standout player locking in platform-partner distribution.',
    ],
  },
}

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

function SectionLabel({ icon: Icon, children }) {
  return (
    <div className="flex items-center gap-2">
      {Icon && <Icon size={11} className="text-ink-mute" />}
      <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute">{children}</span>
    </div>
  )
}

function EditableList({ items, onChange, accentColor, placeholder, ordered = false }) {
  const update = (i, v) => onChange(items.map((x, j) => j === i ? v : x))
  const remove = (i) => onChange(items.filter((_, j) => j !== i))
  const add = () => onChange([...items, ''])
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2.5 group">
          {ordered
            ? <span className="font-mono text-[10px] text-ink-mute shrink-0 mt-[4px]">{i + 1}.</span>
            : <span className="mt-[6px] w-1.5 h-1.5 rounded-full shrink-0" style={{ background: accentColor }} />}
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

function ConvictionDots({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} onClick={() => onChange(n)}
          className="w-2.5 h-2.5 rounded-full border-0 p-0 cursor-pointer hover:scale-125 transition-transform"
          style={{ background: n <= value ? '#e8896e' : '#ece8e1' }} />
      ))}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SummaryTab({ workspace }) {
  const ov = segmentOverview[workspace.id] || FALLBACK_OVERVIEW
  const memo = MEMO[workspace.id] || { thesis: '', structure: '', attractive: [], risks: [], changeMind: [] }
  const companies = workspace.companies || []

  const [verdict, setVerdict] = useState('Active conviction')
  const [conviction, setConviction] = useState(4)
  const [thesis, setThesis] = useState(memo.thesis)
  const [structure, setStructure] = useState(memo.structure)
  const [attractive, setAttractive] = useState(memo.attractive)
  const [risks, setRisks] = useState(memo.risks)
  const [changeMind, setChangeMind] = useState(memo.changeMind)
  const [nextSteps, setNextSteps] = useState(['Prioritise the top tracked companies for first calls.', 'Refresh market sizing and funding data before the next pipeline review.'])

  // Top tracked companies — seeded from the Players-level priority ratings, then editable.
  const [tracked, setTracked] = useState(() =>
    [...companies].filter(c => c.priority).sort((a, b) => (b.priority || 0) - (a.priority || 0)).slice(0, 4)
  )
  const [addOpen, setAddOpen] = useState(false)
  const available = companies.filter(c => !tracked.some(t => t.id === c.id))
  const addTracked = (co) => { setTracked(p => [...p, { ...co }]); setAddOpen(false) }
  const removeTracked = (id) => setTracked(p => p.filter(c => c.id !== id))
  const setTrackedPriority = (id, n) => setTracked(p => p.map(c => c.id === id ? { ...c, priority: n } : c))

  const stats = [
    { label: 'TAM', value: ov.tam },
    { label: 'Growth', value: ov.cagr },
    { label: 'Maturity', value: ov.maturity || ov.adoptionStage },
    { label: 'Companies', value: String(companies.length) },
  ].filter(s => s.value)

  return (
    <div className="flex-1 overflow-y-auto bg-bg">
      <div className="px-8 py-8 max-w-[860px] mx-auto flex flex-col gap-7">

        {/* ── Header: verdict + market thesis ── */}
        <div className="bg-white border border-rule rounded-lg overflow-hidden">
          <div className="px-6 pt-5 pb-5" style={{ background: 'linear-gradient(180deg, #fdf6f2 0%, #ffffff 100%)' }}>
            <div className="flex items-start justify-between gap-6 flex-wrap mb-4">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-accent-deep">Segment summary</span>
                <h2 className="font-serif text-[22px] font-semibold text-ink tracking-tight">{workspace.title}</h2>
              </div>
              <div className="flex flex-col items-end gap-2.5">
                <div className="flex items-center gap-1.5">
                  {Object.keys(VERDICTS).map(v => (
                    <button key={v} onClick={() => setVerdict(v)}
                      className="font-mono text-[9px] uppercase tracking-[0.06em] px-2.5 py-1 rounded border cursor-pointer transition-all"
                      style={verdict === v
                        ? { background: VERDICTS[v].text, color: '#fff', borderColor: VERDICTS[v].text }
                        : { background: VERDICTS[v].bg, color: VERDICTS[v].text, borderColor: 'transparent' }}>
                      {v}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[8.5px] uppercase tracking-[0.08em] text-ink-mute">Conviction</span>
                  <ConvictionDots value={conviction} onChange={setConviction} />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <Target size={12} className="text-accent" />
              <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-accent-deep">Market thesis</span>
            </div>
            <InlineText value={thesis} onChange={setThesis} multiline
              placeholder="The investable thesis for this market, in one line…"
              className="font-serif text-[18px] font-semibold text-ink leading-snug tracking-tight" />
          </div>

          {/* Snapshot stats */}
          <div className="flex items-center gap-5 px-6 py-3.5 border-t border-rule flex-wrap">
            {stats.map((s, i) => (
              <div key={i} className="flex items-baseline gap-1.5">
                <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-ink-mute">{s.label}</span>
                <span className="font-serif text-[15px] font-semibold text-ink">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Competitive structure ── */}
        <div className="flex flex-col gap-3">
          <SectionLabel icon={GitBranch}>Competitive structure</SectionLabel>
          <div className="bg-white border border-rule rounded-lg p-5">
            <InlineText value={structure} onChange={setStructure} multiline
              placeholder="How is this market shaped — who leads, where is the white space, how concentrated…"
              className="font-sans text-[13px] text-ink leading-relaxed" />
          </div>
        </div>

        {/* ── Why this market / Risks ── */}
        <div className="flex flex-col gap-3">
          <SectionLabel icon={Target}>The case on this market</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border rounded-lg p-5 flex flex-col gap-3" style={{ borderColor: '#cfe6d6' }}>
              <div className="flex items-center gap-2">
                <TrendingUp size={12} style={{ color: '#2d6a3f' }} />
                <span className="font-mono text-[9px] uppercase tracking-[0.13em]" style={{ color: '#2d6a3f' }}>Why it's attractive</span>
              </div>
              <EditableList items={attractive} onChange={setAttractive} accentColor="#2d6a3f" placeholder="A reason this market is attractive…" />
            </div>
            <div className="bg-white border rounded-lg p-5 flex flex-col gap-3" style={{ borderColor: '#f0d2c6' }}>
              <div className="flex items-center gap-2">
                <TrendingDown size={12} style={{ color: '#c04a22' }} />
                <span className="font-mono text-[9px] uppercase tracking-[0.13em]" style={{ color: '#c04a22' }}>Risks &amp; concerns</span>
              </div>
              <EditableList items={risks} onChange={setRisks} accentColor="#c04a22" placeholder="A market-level risk…" />
            </div>
          </div>
        </div>

        {/* ── Top tracked companies (seeded from Players, editable) ── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <SectionLabel icon={Eye}>Top tracked companies</SectionLabel>
            <div className="relative">
              <button onClick={() => setAddOpen(o => !o)} disabled={available.length === 0}
                className="flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.08em] text-ink-mute hover:text-ink bg-transparent border-0 cursor-pointer transition-colors disabled:opacity-40">
                <Plus size={10} /> Add
              </button>
              {addOpen && available.length > 0 && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setAddOpen(false)} />
                  <div className="absolute top-full right-0 mt-1 bg-white border border-rule rounded-lg shadow-lg overflow-hidden z-20 min-w-[220px] max-h-[280px] overflow-y-auto">
                    <div className="px-3 py-2 border-b border-rule">
                      <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-ink-mute">From the Players tab</span>
                    </div>
                    {available.map(c => (
                      <button key={c.id} onClick={() => addTracked(c)}
                        className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-bg border-0 bg-transparent cursor-pointer transition-colors border-b border-rule last:border-b-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-sans text-[12.5px] text-ink truncate">{c.name}</span>
                          {c.focal && <span className="font-mono text-[7px] uppercase tracking-[0.05em] text-accent-deep bg-accent-soft px-1 py-0.5 rounded border border-accent-soft shrink-0">focal</span>}
                        </div>
                        <span className="font-mono text-[9px] text-ink-mute shrink-0">{c.fundRound}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="bg-white border border-rule rounded-lg overflow-hidden divide-y divide-rule">
            {tracked.length === 0 && (
              <div className="px-4 py-5 font-sans text-[12.5px] text-ink-mute italic text-center">No companies tracked yet — click Add.</div>
            )}
            {tracked.map(co => (
              <div key={co.id} className="flex items-center gap-3 px-4 py-3 group">
                <span className="font-sans text-[13px] font-medium text-ink w-[120px] shrink-0 truncate">{co.name}</span>
                {co.focal && <span className="font-mono text-[7.5px] uppercase tracking-[0.05em] text-accent-deep bg-accent-soft px-1.5 py-0.5 rounded border border-accent-soft shrink-0">focal</span>}
                <span className="font-mono text-[10px] text-ink-mute shrink-0">{[co.geography, co.fundRound].filter(Boolean).join(' · ')}</span>
                <div className="flex items-center gap-1 ml-auto shrink-0">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setTrackedPriority(co.id, n)}
                      className="w-2 h-2 rounded-full border-0 p-0 cursor-pointer hover:scale-125 transition-transform"
                      style={{ background: n <= (co.priority || 0) ? '#e8896e' : '#ece8e1' }} />
                  ))}
                </div>
                <button onClick={() => removeTracked(co.id)}
                  className="shrink-0 text-ink-mute hover:text-red-500 bg-transparent border-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-all p-0.5">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── What would change our mind ── */}
        <div className="flex flex-col gap-3">
          <SectionLabel icon={RotateCcw}>What would change our mind</SectionLabel>
          <div className="bg-white border border-rule rounded-lg p-5">
            <EditableList items={changeMind} onChange={setChangeMind} ordered placeholder="A catalyst or proof point to watch for…" />
          </div>
        </div>

        {/* ── Recommended next steps ── */}
        <div className="flex flex-col gap-3 pb-4">
          <SectionLabel icon={Flag}>Recommended next steps</SectionLabel>
          <div className="bg-white border border-rule rounded-lg p-5">
            <EditableList items={nextSteps} onChange={setNextSteps} ordered placeholder="A concrete next action for the team…" />
          </div>
        </div>

      </div>
    </div>
  )
}
