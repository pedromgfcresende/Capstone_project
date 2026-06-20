import { useState, useMemo, useEffect } from 'react'
import { ArrowRight, Search, X, Sparkles, ChevronDown, ChevronUp, Send, Target, Radio, Layers, RefreshCw, Pencil } from 'lucide-react'
import { segmentOverview, FALLBACK_OVERVIEW } from '../data/segmentOverview'
import CompanyProfile from './CompanyProfile'
import { VerifyDot, VerifyLegend, useVerifyMap } from './VerifyDot'
import { synthesizeSector, askSector, patchSector, enrichSector } from '../api/client'

const SIGNAL_COLORS = {
  'Funding':    { bg: '#d4edda', text: '#2d6a3f' },
  'M&A':        { bg: '#e8e0f8', text: '#5a3d9a' },
  'Regulatory': { bg: '#e9e7fb', text: '#c04a22' },
  'Trend':      { bg: '#e8f0fe', text: '#2a5fd4' },
  'Exit':       { bg: '#fff3cd', text: '#856404' },
}

const MOMENTUM = {
  'Early Adopters': { label: 'Early · heating up', bg: '#d4edda', text: '#2d6a3f' },
  'Early Majority': { label: 'Scaling',            bg: '#e8f0fe', text: '#2a5fd4' },
  'Late Majority':  { label: 'Consolidating',      bg: '#fff3cd', text: '#856404' },
  'Laggards':       { label: 'Mature',             bg: '#f0ede8', text: '#8a8580' },
}

// canonical consolidated funding stages (matches backend normalize_funding_stage)
const ROUND_ORDER = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D', 'Public', 'Acquired']

// Consolidate geography to a single country, so "San Francisco, USA" and "USA"
// (or "Berlin, Germany" and "Germany") count as one entry on the Sector page.
const GEO_CANON = {
  'usa': 'USA', 'us': 'USA', 'u.s.': 'USA', 'u.s.a': 'USA', 'united states': 'USA',
  'uk': 'UK', 'u.k.': 'UK', 'united kingdom': 'UK', 'england': 'UK', 'britain': 'UK', 'gb': 'UK',
}
function normalizeGeo(s) {
  if (!s) return null
  const part = String(s).split(',').pop().trim()       // country is after the last comma
  const key = part.toLowerCase().replace(/\.+$/, '')
  return GEO_CANON[key] || part
}

// Non-destructive segment consolidation for the Sector view: merge segments that
// share a ≥2-word phrase (e.g. "Horizontal Support Platform" + "Horizontal
// Support Voice" -> "Horizontal Support") into one row. Purely a display roll-up —
// the underlying segments are never changed.
const SEG_STOP = new Set(['the', 'and', 'for', 'of', 'a', 'to', 'in', 'on', 'with', 'based', 'native', 'ai', 'co', 'vs', 'de', 'as', 'platform', 'solution', 'tool', 'tools'])
function segTokens(title) {
  return (title || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
    .filter(w => w.length >= 2 && !SEG_STOP.has(w))
}
function consolidateSegments(rows) {
  if (rows.length <= 2) return rows.map(r => ({ label: r.title, rows: [r] }))
  const sets = rows.map(r => new Set(segTokens(r.title)))
  const shared = (a, b) => { let n = 0; for (const t of a) if (b.has(t)) n++; return n }
  // union-find: merge any two segments sharing ≥2 significant tokens
  const parent = rows.map((_, i) => i)
  const find = (x) => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x] } return x }
  for (let i = 0; i < rows.length; i++)
    for (let j = i + 1; j < rows.length; j++)
      if (shared(sets[i], sets[j]) >= 2) parent[find(i)] = find(j)
  const byRoot = {}
  rows.forEach((r, i) => { (byRoot[find(i)] ||= []).push(i) })
  const titleCase = (w) => w.charAt(0).toUpperCase() + w.slice(1)
  const groups = Object.values(byRoot).map(idxs => {
    const groupRows = idxs.map(i => rows[i])
    if (groupRows.length === 1) return { label: groupRows[0].title, rows: groupRows }
    // label = tokens common to ALL members, in the order of the longest title
    let common = null
    idxs.forEach(i => { common = common === null ? new Set(sets[i]) : new Set([...common].filter(t => sets[i].has(t))) })
    const longest = groupRows.reduce((a, b) => (b.title.length > a.title.length ? b : a))
    const ordered = segTokens(longest.title).filter(t => common.has(t))
    const label = ordered.length ? ordered.map(titleCase).join(' ') : groupRows[0].title
    return { label, rows: groupRows }
  })
  return groups.sort((a, b) => b.rows.length - a.rows.length)
}
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const parseDate = (s) => {
  if (!s) return 0
  const [m, y] = s.toLowerCase().split(' ')
  return parseInt(y || '0', 10) * 12 + (MONTHS.indexOf(m?.slice(0, 3)) + 1)
}
// crude TAM parse: "$8.2B" -> 8.2, "$420M" -> 0.42
const parseTam = (s) => {
  if (!s) return 0
  const n = parseFloat(s.replace(/[^0-9.]/g, '')) || 0
  return /b/i.test(s) ? n : /m/i.test(s) ? n / 1000 : n
}

// ── AI query (kept — synthesis Q&A across segments, not data ingestion) ───────
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
              {result.citations.length} segment{result.citations.length !== 1 ? 's' : ''} cited
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

// Inline editable text — synthesis pre-fills, analyst can override.
function InlineText({ value, onChange, multiline = false, placeholder = 'Click to edit…', className = '' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const save = () => { onChange(draft); setEditing(false) }
  const cancel = () => { setDraft(value); setEditing(false) }

  if (editing) return multiline ? (
    <div className="flex flex-col gap-2 w-full">
      <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)} rows={5}
        onKeyDown={e => { if (e.key === 'Escape') cancel() }}
        className={`bg-white border border-rule rounded-md px-3 py-2 outline-none resize-none w-full leading-relaxed ${className}`} />
      <div className="flex gap-2">
        <button onClick={save} className="font-mono text-[9px] uppercase tracking-[0.08em] px-2.5 py-1 rounded bg-ink text-white border-0 cursor-pointer"
          onMouseEnter={e => e.currentTarget.style.background = '#6a5cd6'} onMouseLeave={e => e.currentTarget.style.background = '#15063b'}>Save</button>
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

function SectionHeader({ icon: Icon, label, count }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {Icon && <Icon size={11} className="text-ink-mute" />}
      <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute">{label}</span>
      {count != null && <span className="font-mono text-[9px] text-ink-mute">· {count}</span>}
    </div>
  )
}

export default function SectorCanvas({ sector, onSelect, onSectorUpdated }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [aiQuery, setAiQuery] = useState('')
  const [results, setResults] = useState([])
  const [thinking, setThinking] = useState(false)
  const [resynth, setResynth] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [enriching, setEnriching] = useState(false)
  const [enrichMsg, setEnrichMsg] = useState('')
  const [profileCompany, setProfileCompany] = useState(null)
  const signalVerify = useVerifyMap()
  const aiVerify = useVerifyMap()

  const workspaces = sector?.workspaces || []

  const allCompanies = useMemo(() =>
    workspaces.flatMap(ws => (ws.companies || []).map(co => ({ ...co, workspaceTitle: ws.title, workspaceId: ws.id }))),
    [workspaces]
  )
  // Aggregate: stage distribution
  const roundCounts = useMemo(() => {
    const counts = {}
    allCompanies.forEach(co => { if (co.fundRound) counts[co.fundRound] = (counts[co.fundRound] || 0) + 1 })
    return Object.entries(counts).sort((a, b) =>
      (ROUND_ORDER.indexOf(a[0]) === -1 ? 99 : ROUND_ORDER.indexOf(a[0])) - (ROUND_ORDER.indexOf(b[0]) === -1 ? 99 : ROUND_ORDER.indexOf(b[0]))
    )
  }, [allCompanies])

  // Aggregate: geography
  const geoCounts = useMemo(() => {
    const counts = {}
    allCompanies.forEach(co => {
      const geo = normalizeGeo(co.geography)
      if (geo) counts[geo] = (counts[geo] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [allCompanies])

  // Roll-up: signals timeline (regulatory + M&A from each segment overview)
  const signals = useMemo(() => {
    const out = []
    workspaces.forEach(ws => {
      const ov = segmentOverview[ws.id] || FALLBACK_OVERVIEW
      ;(ov.regulatory || []).forEach(r => out.push({ type: 'Regulatory', date: r.date, label: r.label, note: r.note, segment: ws.title, wsId: ws.id }))
      ;(ov.recentMA || []).forEach(m => out.push({ type: 'M&A', date: m.date, label: m.event, note: m.note, segment: ws.title, wsId: ws.id }))
    })
    // dedupe identical labels (same event surfaced by multiple segments)
    const seen = new Set()
    const deduped = out.filter(s => { const k = s.label; if (seen.has(k)) return false; seen.add(k); return true })
    return deduped.sort((a, b) => parseDate(b.date) - parseDate(a.date))
  }, [workspaces])

  // Segment comparison rows
  const segmentRows = useMemo(() =>
    workspaces.map(ws => {
      const ov = segmentOverview[ws.id] || FALLBACK_OVERVIEW
      return {
        id: ws.id, title: ws.title, focal: ws.focalCompany,
        companies: (ws.companies || []).length,
        tam: ov.tam, cagr: ov.cagr, stage: ov.adoptionStage || ov.maturity,
      }
    }).sort((a, b) => parseTam(b.tam) - parseTam(a.tam)),
    [workspaces]
  )

  // Consolidated segment rows: each themed group collapses to a single row that
  // sums its companies and points to the largest constituent segment.
  const consolidatedGroups = useMemo(() => {
    return consolidateSegments(segmentRows).map(g => {
      const primary = [...g.rows].sort((a, b) => b.companies - a.companies)[0]
      return {
        id: primary.id,
        title: g.label,
        focal: g.rows.find(r => r.focal)?.focal || null,
        companies: g.rows.reduce((s, r) => s + r.companies, 0),
        tam: primary.tam, cagr: primary.cagr, stage: primary.stage,
        merged: g.rows.length > 1 ? g.rows.map(r => r.title) : null,
      }
    })
  }, [segmentRows])

  const derivedHeadline = sector?.synthesisHeadline || ''
  const derivedBody = sector?.synthesisBody || ''

  // Maturity gradient — where each segment sits on the adoption curve (derived, read-only)
  const STAGE_POS = { 'Early Adopters': 14, 'Early Majority': 42, 'Late Majority': 70, 'Laggards': 90 }
  const maturity = useMemo(() =>
    workspaces.map(ws => {
      const stage = (segmentOverview[ws.id] || FALLBACK_OVERVIEW).adoptionStage
      return { id: ws.id, title: ws.title, stage, pos: STAGE_POS[stage] ?? 30 }
    }).filter(m => m.stage).sort((a, b) => a.pos - b.pos),
    [workspaces]
  )

  // Editable synthesis state — seeded from the roll-up, re-seeded on sector change or re-synthesise.
  const [headline, setHeadline] = useState(derivedHeadline)
  const [thesis, setThesis] = useState(derivedBody)
  const [groupSegs, setGroupSegs] = useState(true)  // segments shown consolidated by default (display only)

  useEffect(() => {
    setHeadline(derivedHeadline)
    setThesis(derivedBody)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sector.id])

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    return allCompanies.filter(co =>
      co.name.toLowerCase().includes(q) || co.segment?.toLowerCase().includes(q) ||
      co.geography?.toLowerCase().includes(q) || co.fundRound?.toLowerCase().includes(q)
    ).slice(0, 8)
  }, [searchQuery, allCompanies])

  const handleAiQuery = async () => {
    const q = aiQuery.trim()
    if (!q || thinking) return
    setAiQuery(''); setThinking(true)
    try {
      const r = await askSector(sector.id, q)
      const citations = (r.citations || []).map(c => ({ workspace: c, note: '' }))
      setResults(p => [...p, { query: q, answer: r.answer, citations }])
    } catch (e) {
      setResults(p => [...p, { query: q, answer: `Error: ${e.message}`, citations: [] }])
    } finally {
      setThinking(false)
    }
  }

  const handleResynth = async () => {
    setResynth(true); setSaveMsg('')
    try {
      const s = await synthesizeSector(sector.id)
      setHeadline(s.synthesisHeadline || '')
      setThesis(s.synthesisBody || '')
      onSectorUpdated?.(s)
    } catch (e) {
      setSaveMsg(`Synthesis failed: ${e.message}`)
    } finally {
      setResynth(false)
    }
  }

  const handleSave = async () => {
    setSaving(true); setSaveMsg('')
    try {
      const s = await patchSector(sector.id, {
        synthesisHeadline: headline,
        synthesisBody: thesis,
        synthesisExtra: {
          ...(sector.synthesisExtra || {}),
        },
      })
      onSectorUpdated?.(s)
      setSaveMsg('Saved ✓')
    } catch (e) {
      setSaveMsg(`Save failed: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleEnrich = async () => {
    setEnriching(true); setEnrichMsg('')
    try {
      const r = await enrichSector(sector.id)
      onSectorUpdated?.(r.sector)
      setEnrichMsg(`+${r.enrichment.createdCount} AI-found competitor${r.enrichment.createdCount === 1 ? '' : 's'}`)
    } catch (e) {
      setEnrichMsg(`Enrichment failed: ${e.message}`)
    } finally {
      setEnriching(false)
    }
  }

  if (!sector) return (
    <div className="flex-1 flex items-center justify-center text-ink-mute font-sans text-[13px]">Select a sector from the sidebar</div>
  )

  const maxRound = Math.max(1, ...roundCounts.map(([, c]) => c))

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-bg">

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-rule shrink-0 bg-bg-card">
        <div>
          <div className="font-mono text-[9px] text-ink-mute uppercase tracking-[0.15em] mb-0.5">Sector · Synthesis</div>
          <h1 className="font-serif text-[20px] font-semibold tracking-tight text-ink">{sector.label}</h1>
        </div>
        <div className="flex items-center gap-2">
          {enrichMsg && <span className="font-mono text-[9px] text-ink-mute">{enrichMsg}</span>}
          <button
            onClick={handleEnrich}
            disabled={enriching}
            title="AI market research — find competitors not in our CRM (web + LLM)"
            className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] px-3 py-1.5 rounded transition-all cursor-pointer disabled:opacity-50 border-0"
            style={{ background: enriching ? '#d8d2c5' : '#15063b', color: enriching ? '#8a8580' : '#fff' }}
            onMouseEnter={e => { if (!enriching) e.currentTarget.style.background = '#6a5cd6' }}
            onMouseLeave={e => { if (!enriching) e.currentTarget.style.background = '#15063b' }}
          >
            {enriching ? <><RefreshCw size={11} className="animate-spin" /> Researching…</> : <><Sparkles size={11} /> Find competitors</>}
          </button>
          {saveMsg && <span className="font-mono text-[9px] text-ink-mute">{saveMsg}</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-mute hover:text-ink border border-rule hover:border-ink-mute px-3 py-1.5 rounded transition-all cursor-pointer bg-bg-card disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={handleResynth}
            disabled={resynth}
            className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-mute hover:text-ink border border-rule hover:border-ink-mute px-3 py-1.5 rounded transition-all cursor-pointer bg-bg-card disabled:opacity-50"
          >
            <RefreshCw size={11} className={resynth ? 'animate-spin' : ''} />
            {resynth ? 'Synthesising…' : 'Re-synthesise'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-7">
          <div className="max-w-[880px] mx-auto flex flex-col gap-8">

            {/* Provenance + search */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 font-mono text-[10px] text-ink-mute">
                <Layers size={11} />
                <span>Synthesised from {workspaces.length} segment{workspaces.length !== 1 ? 's' : ''}</span>
                <span>· updated {sector.updatedAt}</span>
              </div>
              <div className="relative">
                <div className="flex items-center gap-2.5 px-4 py-3 bg-white border border-rule rounded-lg focus-within:border-ink-mute transition-colors">
                  <Search size={14} className="text-ink-mute shrink-0" />
                  <input
                    type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder={`Find a company across ${sector.label}…`}
                    className="flex-1 bg-transparent border-0 outline-none font-sans text-[13px] text-ink placeholder:text-ink-mute"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="bg-transparent border-0 cursor-pointer text-ink-mute hover:text-ink p-0"><X size={13} /></button>
                  )}
                </div>
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-rule rounded-lg shadow-lg overflow-hidden z-20">
                    {searchResults.map((co, i) => (
                      <button key={i}
                        onClick={() => { setSearchQuery(''); setProfileCompany(co) }}
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
            </div>

            {/* ── Landscape stats (aggregated) ── */}
            <div className="bg-white border border-rule rounded-lg p-5 flex flex-col gap-4">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-serif text-[22px] font-semibold text-ink">{workspaces.length}</span>
                  <span className="font-sans text-[11.5px] text-ink-mute">segments</span>
                </div>
                <div className="w-px h-5 bg-rule" />
                <div className="flex items-baseline gap-1.5">
                  <span className="font-serif text-[22px] font-semibold text-ink">{allCompanies.length}</span>
                  <span className="font-sans text-[11.5px] text-ink-mute">companies</span>
                </div>
                {sector?.stats && (
                  <>
                    <div className="w-px h-5 bg-rule" />
                    <div className="flex items-baseline gap-1.5" title="AI-discovered competitors not (yet) in the Deal Pipeline">
                      <span className="font-serif text-[22px] font-semibold" style={{ color: '#5a3d9a' }}>{sector.stats.aiCompanies}</span>
                      <span className="font-sans text-[11.5px] text-ink-mute">AI-found</span>
                    </div>
                    <div className="flex items-baseline gap-1.5" title="Competitors already present in XAnge's Deal Pipeline">
                      <span className="font-serif text-[22px] font-semibold" style={{ color: '#2d6a3f' }}>{sector.stats.inCrm}</span>
                      <span className="font-sans text-[11.5px] text-ink-mute">on Deal Pipeline</span>
                    </div>
                  </>
                )}
              </div>

              {/* stage distribution bar */}
              {roundCounts.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-mute">Funding stage distribution</span>
                  <div className="flex items-end gap-2">
                    {roundCounts.map(([round, count]) => (
                      <div key={round} className="flex flex-col items-center gap-1.5 flex-1">
                        <span className="font-mono text-[10px] text-ink-soft">{count}</span>
                        <div className="w-full rounded-t" style={{ height: `${(count / maxRound) * 44 + 4}px`, background: '#6a5cd6' }} />
                        <span className="font-mono text-[8px] text-ink-mute text-center leading-tight">{round}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* geography */}
              {geoCounts.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-mute mr-1">Geography</span>
                  {geoCounts.map(([geo, count]) => (
                    <span key={geo} className="font-sans text-[11px] px-2 py-0.5 rounded-full border" style={{ background: '#f5f2ef', color: '#6a6560', borderColor: '#e8e0d4' }}>
                      {geo} · {count}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ── Sector Thesis (synthesised, hybrid) ── */}
            <div>
              <SectionHeader icon={Target} label="Sector Thesis" />
              <div className="bg-white border border-rule rounded-lg overflow-hidden">

                {/* Headline bet — the punchline, large serif */}
                <div className="px-6 pt-6 pb-5 border-b border-rule" style={{ background: 'linear-gradient(180deg, #f1effb 0%, #ffffff 100%)' }}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-accent-deep">The bet</span>
                  </div>
                  <InlineText value={headline} onChange={setHeadline}
                    placeholder="The core bet — one line…"
                    className="font-serif text-[20px] font-semibold text-ink leading-snug tracking-tight" />
                </div>

                {/* Supporting narrative */}
                <div className="px-6 py-5">
                  <InlineText value={thesis} onChange={setThesis} multiline
                    placeholder="Supporting reasoning…"
                    className="font-sans text-[13px] text-ink-soft leading-relaxed" />
                </div>

                {/* Maturity gradient across segments */}
                {maturity.length > 0 && (
                  <div className="px-6 pb-5 pt-1">
                    <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-mute">Maturity across segments</span>
                    <div className="mt-4 mb-2 relative">
                      {/* track */}
                      <div className="relative h-1.5 rounded-full" style={{ background: 'linear-gradient(to right, #e8e0d4, #6a5cd6)' }}>
                        {maturity.map((m) => (
                          <div key={m.id} className="absolute -translate-x-1/2" style={{ left: `${m.pos}%`, top: -3 }}>
                            <div className="w-3 h-3 rounded-full bg-white border-2 shadow-sm" style={{ borderColor: '#15063b' }} title={`${m.title} · ${m.stage}`} />
                          </div>
                        ))}
                      </div>
                      {/* stage axis labels */}
                      <div className="flex justify-between mt-2 font-mono text-[8px] uppercase tracking-[0.06em] text-ink-mute">
                        <span>Early adopters</span><span>Early majority</span><span>Late majority</span><span>Laggards</span>
                      </div>
                    </div>
                    {/* legend */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                      {maturity.map(m => (
                        <button key={m.id} onClick={() => onSelect({ type: 'workspace', id: m.id, sectorId: sector.id })}
                          className="flex items-center gap-1.5 bg-transparent border-0 cursor-pointer group p-0">
                          <span className="w-2 h-2 rounded-full bg-ink shrink-0" />
                          <span className="font-sans text-[11.5px] text-ink-soft group-hover:text-ink transition-colors">{m.title}</span>
                          <span className="font-mono text-[9px] text-ink-mute">· {m.stage}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* ── Segment comparison (aggregated + entry points) ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <SectionHeader icon={Layers} label="Segments" count={groupSegs ? consolidatedGroups.length : workspaces.length} />
                {segmentRows.length > 2 && (
                  <button
                    onClick={() => setGroupSegs(g => !g)}
                    title="Consolidate related segments into fewer themes (display only — no data is changed)"
                    className="flex items-center gap-1.5 font-mono text-[8.5px] uppercase tracking-[0.08em] px-2.5 py-1.5 rounded border cursor-pointer transition-all mb-3"
                    style={groupSegs
                      ? { background: '#15063b', color: '#fff', borderColor: '#15063b' }
                      : { background: '#fff', color: '#6a6560', borderColor: '#d8d2c5' }}
                  >
                    <Layers size={10} /> {groupSegs ? 'Consolidated' : 'Show all'}
                  </button>
                )}
              </div>
              {segmentRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg py-12" style={{ borderColor: '#d8d2c5' }}>
                  <div className="font-sans text-[13px] text-ink-mute">No segments yet</div>
                  <div className="font-sans text-[11.5px] text-ink-mute">Create a workspace from the sidebar to add a segment</div>
                </div>
              ) : (
                <div className="bg-white border border-rule rounded-lg overflow-hidden">
                  <div className="grid items-center px-4 py-2 border-b border-rule bg-bg" style={{ gridTemplateColumns: '1fr 130px 70px 80px 150px 110px' }}>
                    {['Segment', 'Stage', 'Cos', 'TAM', 'CAGR', ''].map((h, i) => (
                      <span key={i} className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-ink-mute">{h}</span>
                    ))}
                  </div>
                  {(groupSegs ? consolidatedGroups : segmentRows).map(row => {
                    const m = MOMENTUM[row.stage] || { label: row.stage || '—', bg: '#f0ede8', text: '#8a8580' }
                    return (
                      <div key={row.id} className="grid items-center px-4 py-3.5 border-b border-rule last:border-b-0 hover:bg-bg transition-colors" style={{ gridTemplateColumns: '1fr 130px 70px 80px 150px 110px' }}>
                        <div className="flex flex-col gap-0.5 min-w-0 pr-3">
                          <span className="font-sans text-[13px] font-semibold text-ink truncate">{row.title}</span>
                          {row.merged
                            ? <span className="font-sans text-[10.5px] text-ink-mute truncate" title={row.merged.join(' · ')}>Merged · {row.merged.join(' · ')}</span>
                            : row.focal && <span className="font-sans text-[11px] text-ink-mute truncate">Focal · {row.focal}</span>}
                        </div>
                        <span className="font-mono text-[9px] uppercase tracking-[0.05em] px-2 py-0.5 rounded w-fit" style={{ background: m.bg, color: m.text }}>{m.label}</span>
                        <span className="font-sans text-[12.5px] text-ink-soft">{row.companies}</span>
                        <span className="font-sans text-[13px] font-semibold text-ink">{row.tam || '—'}</span>
                        <span className="font-mono text-[11px] text-ink-soft">{row.cagr || '—'}</span>
                        <button
                          onClick={() => onSelect({ type: 'workspace', id: row.id, sectorId: sector.id })}
                          className="flex items-center gap-1.5 font-sans text-[11.5px] font-medium px-3 py-1.5 rounded-md bg-ink text-white border-0 cursor-pointer transition-all w-fit justify-self-end"
                          onMouseEnter={e => e.currentTarget.style.background = '#6a5cd6'}
                          onMouseLeave={e => e.currentTarget.style.background = '#15063b'}
                        >
                          Enter <ArrowRight size={11} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ── Company × Segment matrix ── */}
            {sector?.companies?.length > 0 && (sector?.segments?.length || 0) > 1 && (() => {
              const segs = sector.segments
              const comps = [...sector.companies].sort((a, b) => b.segments.length - a.segments.length || a.name.localeCompare(b.name))
              const multi = comps.filter(c => c.segments.length > 1)
              return (
                <div>
                  <SectionHeader icon={Layers} label="Company × Segment matrix" count={comps.length} />
                  {multi.length > 0 ? (
                    <div className="mb-3 font-sans text-[11.5px] text-ink-soft">
                      <span className="font-semibold text-ink">{multi.length}</span> compan{multi.length === 1 ? 'y' : 'ies'} compete across multiple segments
                      <span className="text-ink-mute"> — {multi.slice(0, 4).map(c => c.name).join(', ')}{multi.length > 4 ? '…' : ''}</span>
                    </div>
                  ) : (
                    <div className="mb-3 font-sans text-[11.5px] text-ink-mute">Each company maps to a single segment in this upload.</div>
                  )}
                  <div className="bg-white border border-rule rounded-lg overflow-x-auto">
                    <table className="border-collapse w-full">
                      <thead>
                        <tr className="border-b border-rule">
                          <th className="text-left font-mono text-[8.5px] uppercase tracking-[0.1em] text-ink-mute px-3 py-2 sticky left-0 bg-white z-10">Company</th>
                          {segs.map(s => (
                            <th key={s.id} className="font-mono text-[8px] uppercase tracking-[0.05em] text-ink-mute px-2 py-2 align-bottom" style={{ minWidth: 46 }}>
                              <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }} className="whitespace-nowrap mx-auto">{s.title}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {comps.map(c => (
                          <tr key={c.id} className="border-b border-rule-soft hover:bg-bg transition-colors">
                            <td className="px-3 py-1.5 sticky left-0 bg-white z-10 whitespace-nowrap">
                              <span className="font-sans text-[12px] font-medium text-ink">{c.name}</span>
                              {c.focal && <span className="ml-1.5 font-mono text-[7px] uppercase tracking-[0.05em] text-accent-deep bg-accent-soft px-1 py-0.5 rounded">focal</span>}
                            </td>
                            {segs.map(s => {
                              const m = c.segments.find(x => x.segmentId === s.id)
                              return (
                                <td key={s.id} className="px-2 py-1.5 text-center">
                                  {m ? (
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full font-mono text-[9px] font-semibold"
                                      style={{ background: m.focal ? '#e9e7fb' : '#6a5cd6', color: m.focal ? '#4a3fae' : '#fff' }}
                                      title={`${c.name} · ${s.title}${m.tier ? ` · tier ${m.tier}` : ''}`}>
                                      {m.focal ? '★' : (m.tier ?? '•')}
                                    </span>
                                  ) : <span className="text-rule">·</span>}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-2 font-mono text-[8px] uppercase tracking-[0.08em] text-ink-mute">★ focal · number = competitive tier (1 = most serious) · • present</div>
                </div>
              )
            })()}

            {/* ── AI-discovered competitors (M2 enrichment) ── */}
            {(() => {
              const ai = (sector?.companies || []).filter(c => c.origin === 'ai')
              if (ai.length === 0) return null
              return (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <SectionHeader icon={Sparkles} label="AI-discovered competitors" count={ai.length} />
                    <VerifyLegend />
                  </div>
                  <div className="font-sans text-[11.5px] text-ink-mute mb-2">
                    Found by AI market research (web + LLM) — not from the uploaded CSV. Verify before use.
                  </div>
                  <div className="bg-white border border-rule rounded-lg overflow-hidden divide-y divide-rule">
                    {ai.map(c => (
                      <div key={c.id} className="flex items-start gap-3 px-4 py-3 hover:bg-bg transition-colors">
                        <div className="mt-[3px]"><VerifyDot status={aiVerify.get(c.id)} onClick={() => aiVerify.cycle(c.id)} /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-sans text-[13px] font-semibold text-ink">{c.name}</span>
                            {c.inCrm
                              ? <span className="font-mono text-[8px] uppercase tracking-[0.05em] px-1.5 py-0.5 rounded" style={{ background: '#d4edda', color: '#2d6a3f' }}>on Deal Pipeline</span>
                              : <span className="font-mono text-[8px] uppercase tracking-[0.05em] px-1.5 py-0.5 rounded" style={{ background: '#e8e0f8', color: '#5a3d9a' }}>net-new</span>}
                            {c.segments?.[0]?.title && <span className="font-mono text-[8px] uppercase tracking-[0.05em] text-ink-mute bg-bg px-1.5 py-0.5 rounded border border-rule">{c.segments[0].title}</span>}
                            {c.confidence != null && <span className="font-mono text-[9px] text-ink-mute">conf {Math.round(c.confidence * 100)}%</span>}
                          </div>
                          {c.why && <p className="font-sans text-[12px] text-ink-soft leading-relaxed mt-1">{c.why}</p>}
                          {c.sources?.length > 0 && (
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-ink-mute">sources</span>
                              {c.sources.slice(0, 4).map((u, i) => (
                                <a key={i} href={u} target="_blank" rel="noreferrer" className="font-mono text-[9px] text-accent-deep hover:underline truncate max-w-[160px]">
                                  {u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* ── Signals timeline (roll-up) ── */}
            {signals.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <SectionHeader icon={Radio} label="Signals & Activity" count={`${signals.length} events`} />
                  <div className="mb-3"><VerifyLegend /></div>
                </div>
                <div className="flex flex-col overflow-y-auto pr-1" style={{ maxHeight: 320 }}>
                  {signals.map((s, i, arr) => {
                    const colors = SIGNAL_COLORS[s.type] || { bg: '#f0ede8', text: '#6a6560' }
                    return (
                      <div key={i} className="flex gap-4">
                        <div className="flex flex-col items-center" style={{ width: 28 }}>
                          <div className="w-2 h-2 rounded-full border-2 mt-4 shrink-0" style={{ borderColor: colors.text, background: colors.bg }} />
                          {i < arr.length - 1 && <div className="flex-1 w-px bg-rule mt-1" />}
                        </div>
                        <div
                          onClick={() => onSelect({ type: 'workspace', id: s.wsId, sectorId: sector.id })}
                          className="flex-1 pb-5 text-left cursor-pointer group"
                          title={`Open ${s.segment} →`}
                        >
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <VerifyDot status={signalVerify.get(i)} onClick={(e) => { e.stopPropagation(); signalVerify.cycle(i) }} />
                            <span className="font-mono text-[9px] text-ink-mute shrink-0">{s.date}</span>
                            <span className="font-mono text-[8px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded shrink-0" style={{ background: colors.bg, color: colors.text }}>{s.type}</span>
                            <span className="font-sans text-[12.5px] font-medium text-ink flex-1 group-hover:text-accent transition-colors">{s.label}</span>
                            <span className="flex items-center gap-1 shrink-0">
                              <span className="font-mono text-[8px] uppercase tracking-[0.05em] text-ink-mute group-hover:text-ink transition-colors">{s.segment}</span>
                              <ArrowRight size={10} className="text-ink-mute opacity-0 group-hover:opacity-70 transition-opacity" />
                            </span>
                          </div>
                          <p className="font-sans text-[12px] text-ink-soft leading-relaxed">{s.note}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── Ask across segments (synthesis Q&A) ── */}
            <div className="pb-4">
              <SectionHeader icon={Sparkles} label="Ask across segments" />
              {results.length > 0 && (
                <div className="flex flex-col gap-3 mb-4">
                  {results.map((r, i) => <QueryResult key={i} result={r} query={r.query} />)}
                </div>
              )}
              {thinking && (
                <div className="flex items-center gap-3 px-4 py-4 bg-white border border-rule rounded-lg mb-4">
                  <div className="flex gap-1">{[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-accent" style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}</div>
                  <span className="font-sans text-[12.5px] text-ink-mute italic">Synthesising across segments…</span>
                </div>
              )}
              <div className="flex items-center gap-3 px-4 py-3.5 bg-white border border-rule rounded-lg focus-within:border-ink-mute transition-colors">
                <Sparkles size={13} className="text-ink-mute shrink-0" />
                <input
                  type="text" value={aiQuery} onChange={e => setAiQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAiQuery() }}
                  placeholder={workspaces.length === 0 ? 'Add segments to start querying…' : 'Ask anything — e.g. "Which segment has the strongest enterprise traction?"'}
                  disabled={workspaces.length === 0 || thinking}
                  className="flex-1 bg-transparent border-0 outline-none font-sans text-[13px] text-ink placeholder:text-ink-mute disabled:opacity-50"
                />
                <button onClick={handleAiQuery} disabled={!aiQuery.trim() || thinking || workspaces.length === 0}
                  className="shrink-0 p-1 rounded text-ink-mute hover:text-ink disabled:opacity-30 bg-transparent border-0 cursor-pointer transition-colors">
                  <Send size={13} />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {profileCompany && (
        <CompanyProfile
          company={profileCompany}
          onClose={() => setProfileCompany(null)}
          onEnterSegment={() => { onSelect({ type: 'workspace', id: profileCompany.workspaceId, sectorId: sector.id }); setProfileCompany(null) }}
        />
      )}
    </div>
  )
}
