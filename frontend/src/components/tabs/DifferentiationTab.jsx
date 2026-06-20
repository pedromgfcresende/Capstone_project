import { useState, useMemo } from 'react'
import { Pencil, X, Plus, Crosshair, Search } from 'lucide-react'

// ── Differentiation Tab ───────────────────────────────────────────────────────
// Two paths, one content structure (Tab Content Refinement.pdf):
//   • company search → focal is LOCKED, compare against up to 3 (pre-suggested
//     from the direct-type tags computed in Players). Framed vs the focal.
//   • sector search  → no focal, pick 2–4 symmetrically.
// Sections: where they actually differ (6 dimensions) · side-by-side · scorecard
// · recent momentum.

const DIFF_DIMS = [
  { key: 'distribution', label: 'Distribution model', caption: 'Defines growth motion & cost structure' },
  { key: 'pricing',      label: 'Pricing position',   caption: 'Clearest signal of segment & unit economics' },
  { key: 'target',       label: 'Target customer',    caption: 'Who they compete for day to day' },
  { key: 'product',      label: 'Product scope',      caption: 'Breadth vs depth trade-off across the set' },
  { key: 'geography',    label: 'Geographic reach',   caption: 'Where each company actually competes' },
  { key: 'moat',         label: 'Moat / defensibility', caption: 'Hardest to assess — flag if thin' },
]
const DIFF_SOURCE = {
  distribution: 'Source: pricing & careers pages — AI-classified',
  pricing: 'Source: pricing page — AI-extracted',
  target: 'Source: homepage hero & case studies — AI-extracted',
  product: 'Source: product / features pages — AI-classified',
  geography: 'Source: regional pages & job locations — scraped',
  moat: 'Source: analyst judgment — verify',
}
const SCORE_DIMS = ['Distribution', 'Product depth', 'Pricing position', 'Moat strength', 'Intl reach']
const SIDE_ROWS = [
  { key: 'gtm',     label: 'GTM' },
  { key: 'pricing', label: 'Pricing model' },
  { key: 'target',  label: 'Target' },
  { key: 'moat',    label: 'Moat' },
  { key: 'markets', label: 'Markets' },
  { key: 'raised',  label: 'Raised' },
  { key: 'team',    label: 'Team' },
]
const MOMENTUM_TAGS = ['Product', 'Funding', 'Geo', 'Partner', 'Hiring']

// derive a sensible editable default for each dimension from real fields
function deriveDiff(co) {
  return {
    distribution: '',
    pricing: '',
    target: co.primaryCustomer || (co.category ? `${co.category} buyers` : ''),
    product: co.category || '',
    geography: co.location || '',
    moat: '',
  }
}
function deriveSide(co) {
  return {
    gtm: '',
    pricing: '',
    target: co.primaryCustomer || co.category || '',
    moat: '',
    markets: co.location || '',
    raised: [co.round, co.raised].filter(Boolean).join(' · ') || '—',
    team: co.team || '—',
  }
}

function InlineText({ value, onChange, placeholder = 'Click to add…', multiline = false, className = '' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const save = () => { onChange(draft); setEditing(false) }
  if (editing) {
    const cancel = () => { setDraft(value); setEditing(false) }
    return multiline ? (
      <textarea autoFocus value={draft} rows={2} onChange={e => setDraft(e.target.value)} onBlur={save}
        onKeyDown={e => { if (e.key === 'Escape') cancel() }}
        className={`bg-white border border-rule rounded px-2 py-1 outline-none resize-none w-full ${className}`} />
    ) : (
      <input autoFocus value={draft} onChange={e => setDraft(e.target.value)} onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }}
        className={`bg-white border border-rule rounded px-2 py-1 outline-none w-full ${className}`} />
    )
  }
  return (
    <div className="group flex items-start gap-1 cursor-text" onClick={() => { setEditing(true); setDraft(value) }}>
      <span className={`flex-1 ${className} ${!value ? 'text-ink-mute italic' : ''}`}>{value || placeholder}</span>
      <Pencil size={9} className="text-ink-mute opacity-0 group-hover:opacity-40 transition-opacity mt-0.5 shrink-0" />
    </div>
  )
}

function ScoreDots({ score, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map(n => (
        <button key={n} onClick={() => onChange(n)}
          className="w-2.5 h-2.5 rounded-full border-0 p-0 cursor-pointer hover:scale-125 transition-transform"
          style={{ background: n <= score ? '#e8896e' : '#ece8e1' }} />
      ))}
    </div>
  )
}

function AddCompany({ pool, onAdd, disabled }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const s = q.trim().toLowerCase()
  const filtered = pool.filter(c => !s || c.name.toLowerCase().includes(s) || c.category?.toLowerCase().includes(s))
  if (disabled) return null
  return (
    <div className="relative inline-block">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 font-sans text-[11.5px] text-ink-soft hover:text-ink border border-dashed border-rule rounded-full px-2.5 py-1 cursor-pointer transition-colors">
        <Plus size={11} /> add
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setQ('') }} />
          <div className="absolute top-full left-0 mt-1 bg-white border border-rule rounded-lg shadow-lg overflow-hidden z-20 w-[260px]">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-rule">
              <Search size={12} className="text-ink-mute shrink-0" />
              <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search players…"
                className="flex-1 bg-transparent border-0 outline-none font-sans text-[12px] text-ink" />
            </div>
            <div className="max-h-[260px] overflow-y-auto">
              {filtered.length === 0 && <div className="px-3 py-4 text-center font-sans text-[12px] text-ink-mute italic">No matches</div>}
              {filtered.map(c => (
                <button key={c.id} onClick={() => { onAdd(c.id); setOpen(false); setQ('') }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-bg border-0 bg-transparent cursor-pointer border-b border-rule last:border-b-0">
                  <span className="font-sans text-[12.5px] text-ink truncate">{c.name}</span>
                  {c.relationType && <span className="font-mono text-[8px] text-ink-mute shrink-0">{c.relationType}</span>}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function DifferentiationTab({ workspace }) {
  const companies = useMemo(() => workspace.companies || [], [workspace.companies])
  const searchPath = workspace.searchPath || (workspace.focalCompany ? 'company' : 'sector')
  const focal = companies.find(c => c.focal)
  const maxCols = 4

  // selection (ids of the non-focal companies in company-path; all in sector-path)
  const [selectedIds, setSelectedIds] = useState(() => {
    if (searchPath === 'company') {
      const suggested = companies.filter(c => !c.focal && c.relationType === 'direct').slice(0, 2).map(c => c.id)
      const fill = companies.filter(c => !c.focal).slice(0, 2).map(c => c.id)
      return (suggested.length ? suggested : fill)
    }
    return companies.slice(0, 3).map(c => c.id)
  })

  const columns = useMemo(() => {
    if (searchPath === 'company') {
      const others = selectedIds.map(id => companies.find(c => c.id === id)).filter(Boolean)
      return [focal, ...others].filter(Boolean)
    }
    return selectedIds.map(id => companies.find(c => c.id === id)).filter(Boolean)
  }, [searchPath, selectedIds, companies, focal])

  // editable state, lazily seeded from real fields
  const [diff, setDiff] = useState({})       // id -> {dimensionKey: text}
  const [side, setSide] = useState({})       // id -> {rowKey: text}
  const [scores, setScores] = useState({})   // id -> {dim: 1-3}
  const [momentum, setMomentum] = useState({}) // id -> {tag, text}

  const getDiff = (co) => diff[co.id] || deriveDiff(co)
  const getSide = (co) => side[co.id] || deriveSide(co)
  const getScore = (co, dim) => scores[co.id]?.[dim] ?? 2
  const getMomentum = (co) => momentum[co.id] || { tag: 'Product', text: '' }

  const setDiffCell = (id, key, v) => setDiff(p => ({ ...p, [id]: { ...(p[id] || deriveDiff(companies.find(c => c.id === id))), [key]: v } }))
  const setSideCell = (id, key, v) => setSide(p => ({ ...p, [id]: { ...(p[id] || deriveSide(companies.find(c => c.id === id))), [key]: v } }))
  const setScore = (id, dim, v) => setScores(p => ({ ...p, [id]: { ...(p[id] || {}), [dim]: v } }))
  const setMomentumCell = (id, patch) => setMomentum(p => ({ ...p, [id]: { ...getMomentum({ id }), ...p[id], ...patch } }))

  const removeCol = (id) => setSelectedIds(ids => ids.filter(x => x !== id))
  const addCol = (id) => setSelectedIds(ids => {
    const limit = searchPath === 'company' ? maxCols - 1 : maxCols
    if (ids.length >= limit) return ids
    return ids.includes(id) ? ids : [...ids, id]
  })

  const pool = companies.filter(c => !c.focal && !selectedIds.includes(c.id))
  const colLimit = searchPath === 'company' ? maxCols - 1 : maxCols
  const canAdd = selectedIds.length < colLimit
  const tooFew = searchPath === 'sector' && columns.length < 2

  if (companies.length === 0) {
    return <div className="flex-1 flex items-center justify-center text-ink-mute font-sans text-[13px] italic">Add companies in the Players tab to compare.</div>
  }

  const gridCols = `150px repeat(${Math.max(columns.length, 1)}, minmax(0, 1fr))`

  return (
    <div className="flex-1 overflow-y-auto bg-bg">
      <div className="px-8 py-7 max-w-[1000px] mx-auto flex flex-col gap-7">

        {/* Header + selector */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Crosshair size={12} className="text-accent" />
            <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-accent-deep">
              {searchPath === 'company' ? 'Company search' : 'Sector search'} · Differentiation · {workspace.title}
            </span>
          </div>
          <h2 className="font-serif text-[22px] font-semibold text-ink tracking-tight mb-3">
            {searchPath === 'company' ? (focal?.name || workspace.title) : workspace.title}
          </h2>

          <div className="bg-white border border-rule rounded-lg px-4 py-3">
            <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-mute">
              {searchPath === 'company' ? 'Compare with' : 'Select companies to compare'}
            </span>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {searchPath === 'company' && focal && (
                <span className="flex items-center gap-1.5 bg-accent-soft border border-accent-soft rounded-full px-2.5 py-1 font-sans text-[12px] font-medium text-accent-deep">
                  {focal.name}
                  <span className="font-mono text-[7px] uppercase tracking-[0.05em]">focal</span>
                </span>
              )}
              {searchPath === 'company' && <span className="font-mono text-[10px] text-ink-mute">vs</span>}
              {selectedIds.map(id => {
                const co = companies.find(c => c.id === id)
                if (!co) return null
                return (
                  <span key={id} className="flex items-center gap-1.5 bg-bg border border-rule rounded-full px-2.5 py-1 font-sans text-[12px] text-ink">
                    {co.name}
                    <button onClick={() => removeCol(id)} className="text-ink-mute hover:text-red-500 bg-transparent border-0 cursor-pointer p-0"><X size={11} /></button>
                  </span>
                )
              })}
              <AddCompany pool={pool} onAdd={addCol} disabled={!canAdd} />
            </div>
            <p className="font-sans text-[10.5px] text-ink-mute mt-2">
              {searchPath === 'company'
                ? 'Suggested from direct competitors — add up to 3. Comparison is framed against the focal.'
                : 'Pick 2–4 companies from the players list. Comparison is symmetric — no anchor.'}
            </p>
          </div>
        </div>

        {tooFew ? (
          <div className="bg-white border border-rule rounded-lg px-5 py-8 text-center font-sans text-[13px] text-ink-mute italic">
            Select at least two companies to compare.
          </div>
        ) : (
          <>
            {/* Where they actually differ */}
            <section className="flex flex-col gap-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute">Where they actually differ</span>
              <div className="bg-white border border-rule rounded-lg overflow-hidden">
                {DIFF_DIMS.map((dim, di) => (
                  <div key={dim.key} className={`px-4 py-3 ${di < DIFF_DIMS.length - 1 ? 'border-b border-rule' : ''}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-soft">{dim.label}</span>
                      <span className="font-sans text-[10px] text-ink-mute italic">{dim.caption}</span>
                    </div>
                    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0,1fr))` }}>
                      {columns.map(co => (
                        <div key={co.id} className="min-w-0">
                          <div className="font-mono text-[8px] uppercase tracking-[0.08em] text-ink-mute mb-1 flex items-center gap-1">
                            {co.name}{co.focal && <span className="text-accent-deep">·focal</span>}
                          </div>
                          <InlineText value={getDiff(co)[dim.key]} onChange={v => setDiffCell(co.id, dim.key, v)} multiline
                            placeholder="—" className="font-sans text-[12px] text-ink leading-relaxed" />
                        </div>
                      ))}
                    </div>
                    <p className="font-sans text-[9px] text-ink-mute italic mt-2">{DIFF_SOURCE[dim.key]}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Side by side */}
            <section className="flex flex-col gap-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute">Side by side</span>
              <div className="bg-white border border-rule rounded-lg overflow-x-auto">
                <div className="grid" style={{ gridTemplateColumns: gridCols, minWidth: 520 }}>
                  <div className="px-4 py-2.5 border-b border-rule bg-bg-card" />
                  {columns.map(co => (
                    <div key={co.id} className="px-4 py-2.5 border-b border-rule bg-bg-card font-sans text-[12px] font-semibold text-ink truncate">
                      {co.name}{co.focal && <span className="ml-1 font-mono text-[7px] uppercase text-accent-deep">focal</span>}
                    </div>
                  ))}
                  {SIDE_ROWS.map((row, ri) => (
                    <RowFrag key={row.key} last={ri === SIDE_ROWS.length - 1}>
                      <div className="px-4 py-2.5 border-b border-rule font-mono text-[8.5px] uppercase tracking-[0.08em] text-ink-mute">{row.label}</div>
                      {columns.map(co => {
                        const readOnly = ['raised', 'team', 'markets'].includes(row.key)
                        const val = getSide(co)[row.key]
                        return (
                          <div key={co.id} className="px-4 py-2.5 border-b border-rule font-sans text-[12px] text-ink-soft min-w-0">
                            {readOnly
                              ? <span>{val || '—'}</span>
                              : <InlineText value={val} onChange={v => setSideCell(co.id, row.key, v)} placeholder="—" className="font-sans text-[12px] text-ink-soft" />}
                          </div>
                        )
                      })}
                    </RowFrag>
                  ))}
                </div>
              </div>
            </section>

            {/* Scorecard */}
            <section className="flex flex-col gap-2">
              <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute">Scorecard</span>
              <div className="bg-white border border-rule rounded-lg overflow-x-auto">
                <div className="grid" style={{ gridTemplateColumns: gridCols, minWidth: 520 }}>
                  <div className="px-4 py-2.5 border-b border-rule bg-bg-card font-mono text-[8.5px] uppercase tracking-[0.08em] text-ink-mute">Dimension</div>
                  {columns.map(co => (
                    <div key={co.id} className="px-4 py-2.5 border-b border-rule bg-bg-card font-sans text-[12px] font-semibold text-ink truncate">{co.name}</div>
                  ))}
                  {SCORE_DIMS.map((dim, ri) => (
                    <RowFrag key={dim} last={ri === SCORE_DIMS.length - 1}>
                      <div className="px-4 py-3 border-b border-rule font-sans text-[12px] text-ink-soft">{dim}</div>
                      {columns.map(co => (
                        <div key={co.id} className="px-4 py-3 border-b border-rule">
                          <ScoreDots score={getScore(co, dim)} onChange={v => setScore(co.id, dim, v)} />
                        </div>
                      ))}
                    </RowFrag>
                  ))}
                </div>
              </div>
              <span className="font-mono text-[8.5px] text-ink-mute">Each score is editable · AI-seeded, analyst overrides</span>
            </section>

            {/* Recent momentum */}
            <section className="flex flex-col gap-2 pb-4">
              <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute">Recent momentum</span>
              <div className="bg-white border border-rule rounded-lg overflow-hidden">
                {columns.map((co, ci) => {
                  const m = getMomentum(co)
                  return (
                    <div key={co.id} className={`flex items-start gap-3 px-4 py-3 ${ci < columns.length - 1 ? 'border-b border-rule' : ''}`}>
                      <span className="font-sans text-[12px] font-medium text-ink w-28 shrink-0 truncate">{co.name}</span>
                      <select value={m.tag} onChange={e => setMomentumCell(co.id, { tag: e.target.value })}
                        className="font-mono text-[9px] uppercase tracking-[0.06em] bg-bg border border-rule rounded px-1.5 py-1 text-ink-soft cursor-pointer shrink-0">
                        {MOMENTUM_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <div className="flex-1 min-w-0">
                        <InlineText value={m.text} onChange={v => setMomentumCell(co.id, { text: v })}
                          placeholder="Latest signal — e.g. raised Series C, opened Madrid office…" className="font-sans text-[12px] text-ink-soft" />
                      </div>
                    </div>
                  )
                })}
              </div>
              <span className="font-mono text-[8.5px] text-ink-mute">Source: web search (company + news, last 90 days) + job posts — refreshed weekly</span>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

// React fragment that renders grid cells contiguously (keeps the CSS grid flat)
function RowFrag({ children }) {
  return <>{children}</>
}
