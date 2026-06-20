import { useState, useEffect } from 'react'
import { Pencil, Plus, X, ExternalLink, ChevronDown, ChevronRight, Database, Globe, Loader2 } from 'lucide-react'
import { getSources, collectMarketContext } from '../../api/client'

const ACCESS_STYLE = {
  'Fully accessible': { bg: '#d4edda', text: '#2d6a3f' },
  'Partially accessible': { bg: '#f5edcf', text: '#8a6d1f' },
  'Login / paywall limited': { bg: '#f0ede8', text: '#8a8580' },
}

function fmtNum(n) {
  if (n == null) return '—'
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  return Math.round(n).toLocaleString()
}

// Open-data collection panel: the source directory + a live World Bank pull.
function CollectionPanel({ sectorId }) {
  const [open, setOpen] = useState(true)
  const [sources, setSources] = useState([])
  const [ctx, setCtx] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { getSources().then(setSources).catch(() => setSources([])) }, [])

  const pullContext = async () => {
    setBusy(true)
    try { const r = await collectMarketContext(sectorId); setCtx(r.found ? r.marketContext : { none: true }) }
    catch { setCtx({ none: true }) }
    finally { setBusy(false) }
  }

  const live = sources.filter(s => s.live)

  return (
    <div className="px-8 py-4 border-b border-rule bg-bg-card shrink-0">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 bg-transparent border-0 cursor-pointer p-0 mb-1">
        {open ? <ChevronDown size={13} className="text-ink-mute" /> : <ChevronRight size={13} className="text-ink-mute" />}
        <Database size={13} className="text-accent" />
        <span className="font-mono text-[9px] uppercase tracking-[0.13em] text-ink-soft">Open-data collection sources</span>
        <span className="font-mono text-[9px] text-ink-mute">· {live.length} live collectors</span>
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-3">
          {/* Market context (World Bank) */}
          <div className="flex items-center gap-3 flex-wrap bg-white border border-rule rounded-lg px-4 py-2.5">
            <Globe size={13} className="text-ink-mute shrink-0" />
            <span className="font-sans text-[12px] font-medium text-ink">Market context</span>
            {ctx && !ctx.none ? (
              <span className="font-sans text-[11.5px] text-ink-soft">
                {ctx.country}: pop <b>{fmtNum(ctx.population)}</b> · GDP <b>${fmtNum(ctx.gdpUsd)}</b> · GDP/cap <b>${fmtNum(ctx.gdpPerCapitaUsd)}</b>
                <span className="text-ink-mute"> ({ctx.year}, {ctx.sourceName})</span>
              </span>
            ) : ctx?.none ? (
              <span className="font-sans text-[11.5px] text-ink-mute italic">No World Bank match for this sector’s geography.</span>
            ) : (
              <span className="font-sans text-[11.5px] text-ink-mute italic">Pull population & GDP for this sector’s primary geography.</span>
            )}
            <button onClick={pullContext} disabled={busy}
              className="ml-auto flex items-center gap-1 font-sans text-[11px] font-medium px-2.5 py-1 rounded border border-rule bg-white text-ink-soft hover:text-ink hover:border-ink-mute transition-all cursor-pointer disabled:opacity-50">
              {busy ? <Loader2 size={11} className="animate-spin" /> : <Database size={11} className="text-accent" />}
              {busy ? 'Pulling…' : 'Pull from World Bank'}
            </button>
          </div>

          {/* Source directory */}
          <div className="grid gap-1.5" style={{ gridTemplateColumns: '1fr' }}>
            {sources.map((s, i) => {
              const a = ACCESS_STYLE[s.access] || ACCESS_STYLE['Login / paywall limited']
              return (
                <div key={i} className="flex items-center gap-3 bg-white border border-rule rounded-md px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-sans text-[12px] font-medium text-ink truncate">{s.name}</span>
                      {s.live && <span className="font-mono text-[7.5px] uppercase tracking-[0.05em] text-good bg-[#d4edda] px-1 py-0.5 rounded shrink-0">live</span>}
                    </div>
                    <span className="font-mono text-[9.5px] text-ink-mute">{s.section} · {s.reliability}</span>
                  </div>
                  <span className="font-mono text-[8px] uppercase tracking-[0.06em] px-1.5 py-0.5 rounded shrink-0" style={{ background: a.bg, color: a.text }}>{s.access}</span>
                  {s.url && !s.url.includes('[') && (
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-ink-mute hover:text-ink transition-colors"><ExternalLink size={11} /></a>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

const TYPE_COLORS = {
  AI: { bg: '#f0ede8', text: '#8a8580' },
  Primary: { bg: '#d4edda', text: '#2d6a3f' },
  Secondary: { bg: '#e8f0fe', text: '#2a5fd4' },
}
const STATUS_COLORS = {
  Verified: { bg: '#d4edda', text: '#2d6a3f' },
  Unverified: { bg: '#f0ede8', text: '#8a8580' },
}
const TYPE_LIST = ['AI', 'Primary', 'Secondary']
const LEVEL_LIST = ['L1', 'L2', 'L3']

const GRID = '1fr 280px 110px 56px 110px 130px 28px'

function InlineText({ value, onChange, placeholder = '—', className = '' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const save = () => { onChange(draft); setEditing(false) }
  const cancel = () => { setDraft(value); setEditing(false) }
  if (editing) return (
    <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
      onBlur={save} onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }}
      className={`bg-white border border-rule rounded px-2 py-1 outline-none w-full ${className}`} />
  )
  return (
    <div className="group/edit flex items-center gap-1.5 cursor-text min-w-0" onClick={() => { setEditing(true); setDraft(value) }}>
      <span className={`truncate ${className} ${!value ? 'text-ink-mute italic' : ''}`}>{value || placeholder}</span>
      <Pencil size={9} className="text-ink-mute opacity-0 group-hover/edit:opacity-40 transition-opacity shrink-0" />
    </div>
  )
}

function SegmentedFilter({ options, value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {options.map(opt => {
        const active = value === opt.value
        return (
          <button key={opt.label} onClick={() => onChange(opt.value)}
            className="font-mono text-[9px] uppercase tracking-[0.08em] px-2.5 py-1.5 rounded border cursor-pointer transition-all"
            style={active
              ? { background: '#15063b', color: '#fff', borderColor: '#15063b' }
              : { background: '#faf9f7', color: '#8a8580', borderColor: '#ddd6cb' }}>
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export default function SourcesTab({ workspace }) {
  // Seed the evidence register from the AI synthesis claims + their verification status.
  const [rows, setRows] = useState(() => {
    const claims = workspace.synthesis?.sources?.claims || []
    const verifs = workspace.synthesis?.verifications || {}
    return claims.map(c => ({
      id: c.key,
      claim: c.text,
      source: 'AI synthesis',
      url: '',
      type: 'AI',
      level: 'L1',
      status: verifs[c.key] === 'verified' ? 'Verified' : 'Unverified',
      location: '',
    }))
  })
  const [levelFilter, setLevelFilter] = useState(null)
  const [statusFilter, setStatusFilter] = useState(null)

  const update = (id, patch) => setRows(p => p.map(r => r.id === id ? { ...r, ...patch } : r))
  const remove = (id) => setRows(p => p.filter(r => r.id !== id))
  const add = () => setRows(p => [{ id: `c-${Date.now()}`, claim: '', source: '', url: '', type: 'Secondary', level: 'L1', status: 'Unverified', location: '' }, ...p])
  const cycle = (id, key, list, cur) => update(id, { [key]: list[(list.indexOf(cur) + 1) % list.length] })
  const toggleStatus = (id, cur) => update(id, { status: cur === 'Verified' ? 'Unverified' : 'Verified' })

  const verified = rows.filter(r => r.status === 'Verified').length
  const unverified = rows.length - verified

  const filtered = rows.filter(r =>
    (!levelFilter || r.level === levelFilter) &&
    (!statusFilter || r.status === statusFilter)
  )

  const verifyAllShown = () => {
    const ids = new Set(filtered.map(r => r.id))
    setRows(p => p.map(r => ids.has(r.id) ? { ...r, status: 'Verified' } : r))
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-bg">

      <CollectionPanel sectorId={workspace.sectorId} />

      {/* Stats + filters bar */}
      <div className="flex items-center justify-between gap-6 px-8 py-4 border-b border-rule bg-bg-card shrink-0 flex-wrap">
        <div className="flex items-end gap-8">
          <div className="flex flex-col">
            <span className="font-serif text-[22px] font-semibold text-ink leading-none">{rows.length}</span>
            <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-mute mt-1.5">Total sources</span>
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-[22px] font-semibold leading-none" style={{ color: '#2d6a3f' }}>{verified}</span>
            <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-mute mt-1.5">Verified</span>
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-[22px] font-semibold text-ink-mute leading-none">{unverified}</span>
            <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-mute mt-1.5">Unverified</span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <SegmentedFilter
            value={levelFilter}
            onChange={setLevelFilter}
            options={[{ label: 'All', value: null }, ...LEVEL_LIST.map(l => ({ label: l, value: l }))]}
          />
          <div className="w-px h-5 bg-rule" />
          <SegmentedFilter
            value={statusFilter}
            onChange={setStatusFilter}
            options={[{ label: 'All', value: null }, { label: 'Verified', value: 'Verified' }, { label: 'Unverified', value: 'Unverified' }]}
          />
          <button onClick={add}
            className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.08em] px-2.5 py-1.5 rounded border border-rule bg-white text-ink-mute hover:text-ink hover:border-ink-mute cursor-pointer transition-all">
            <Plus size={11} /> Add
          </button>
        </div>
      </div>

      {/* Column header */}
      <div className="grid items-center px-8 py-2.5 border-b border-rule bg-bg-card shrink-0" style={{ gridTemplateColumns: GRID }}>
        {['Claim', 'Source', 'Type', 'Level', 'Status', 'Location', ''].map((h, i) => (
          <span key={i} className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-mute">{h}</span>
        ))}
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-ink-mute font-sans text-[13px] italic">
            {rows.length === 0 ? 'No sources yet — click Add.' : 'No sources match the filter.'}
          </div>
        ) : (
          filtered.map(r => {
            const tc = TYPE_COLORS[r.type] || TYPE_COLORS.Secondary
            const sc = STATUS_COLORS[r.status] || STATUS_COLORS.Unverified
            return (
              <div key={r.id} className="grid items-center px-8 py-3 border-b border-rule hover:bg-white transition-colors group" style={{ gridTemplateColumns: GRID }}>
                {/* Claim */}
                <div className="pr-4 min-w-0">
                  <InlineText value={r.claim} onChange={v => update(r.id, { claim: v })} placeholder="Claim…"
                    className="font-sans text-[12.5px] text-ink leading-snug" />
                </div>
                {/* Source */}
                <div className="flex items-center gap-1.5 pr-3 min-w-0">
                  <div className="min-w-0 flex-1">
                    <InlineText value={r.source} onChange={v => update(r.id, { source: v })} placeholder="source…"
                      className="font-sans text-[11.5px] text-ink-soft" />
                  </div>
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-ink-mute hover:text-ink transition-colors" title="Open source">
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
                {/* Type */}
                <div>
                  <button onClick={() => cycle(r.id, 'type', TYPE_LIST, r.type)} title="Click to change type"
                    className="font-mono text-[8px] uppercase tracking-[0.08em] px-2 py-0.5 rounded border-0 cursor-pointer"
                    style={{ background: tc.bg, color: tc.text }}>
                    {r.type}
                  </button>
                </div>
                {/* Level */}
                <div>
                  <button onClick={() => cycle(r.id, 'level', LEVEL_LIST, r.level)} title="Click to change level"
                    className="font-mono text-[10px] text-ink-soft bg-transparent border-0 cursor-pointer hover:text-ink p-0">
                    {r.level}
                  </button>
                </div>
                {/* Status */}
                <div>
                  <button onClick={() => toggleStatus(r.id, r.status)} title="Click to toggle"
                    className="font-mono text-[8px] uppercase tracking-[0.08em] px-2 py-0.5 rounded border-0 cursor-pointer"
                    style={{ background: sc.bg, color: sc.text }}>
                    {r.status}
                  </button>
                </div>
                {/* Location */}
                <div className="min-w-0">
                  <InlineText value={r.location} onChange={v => update(r.id, { location: v })} placeholder="location"
                    className="font-sans text-[11.5px] text-ink-mute" />
                </div>
                {/* Remove */}
                <button onClick={() => remove(r.id)}
                  className="justify-self-end text-ink-mute hover:text-red-500 bg-transparent border-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-all p-0.5">
                  <X size={12} />
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-8 py-3 border-t border-rule bg-bg-card shrink-0">
        <span className="font-sans text-[12px] text-ink-mute">{filtered.length} source{filtered.length !== 1 ? 's' : ''} shown</span>
        <button onClick={verifyAllShown}
          className="font-sans text-[12px] font-medium px-3.5 py-2 rounded-md border border-rule bg-white text-ink-soft hover:text-ink hover:border-ink-mute cursor-pointer transition-all">
          Verify all shown
        </button>
      </div>

    </div>
  )
}
