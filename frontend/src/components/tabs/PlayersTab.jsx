import { useState, useMemo } from 'react'
import { ChevronRight, ChevronDown, Sparkles } from 'lucide-react'

// ── Players Overview ──────────────────────────────────────────────────────────
// A clean, signal-first table. No black-box priority score (removed by design —
// it anchors judgment before the analyst reads the data). Two paths:
//   • company search → Type (direct/indirect/adjacent, relative to the focal)
//   • sector search  → no Type column; Category carries the weight.
// (Spec: Tab Content Refinement.pdf — Players Overview Tab)

const TYPE_STYLE = {
  direct:   { bg: '#ffe5d8', text: '#c0420c', label: 'direct' },
  indirect: { bg: '#f5edcf', text: '#8a6d1f', label: 'indirect' },
  adjacent: { bg: '#ece8e1', text: '#6a6560', label: 'adjacent' },
}
const TYPE_CYCLE = ['direct', 'indirect', 'adjacent']

const ROUND_ORDER = ['Pre-Seed', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D', 'Series D+', 'Series E']
const roundRank = (r) => {
  if (!r) return -1
  const i = ROUND_ORDER.findIndex(o => o.toLowerCase() === String(r).toLowerCase())
  return i === -1 ? ROUND_ORDER.length : i
}

const SORTS = [
  { id: 'round',   label: 'Round',   get: c => roundRank(c.round) },
  { id: 'raised',  label: 'Raised',  get: c => c.raisedEur ?? -1 },
  { id: 'founded', label: 'Founded', get: c => c.yearFounded ?? -1 },
  { id: 'team',    label: 'Team',    get: c => c.employeeCount ?? -1 },
  { id: 'name',    label: 'Name',    get: c => c.name?.toLowerCase() },
]

function TypePill({ value, onCycle }) {
  if (!value) return (
    <button onClick={onCycle} className="font-mono text-[9px] text-ink-mute hover:text-ink bg-transparent border border-dashed border-rule rounded px-1.5 py-0.5 cursor-pointer">set</button>
  )
  const s = TYPE_STYLE[value] || TYPE_STYLE.adjacent
  return (
    <button
      onClick={onCycle}
      title="Click to change · AI-inferred, verify"
      className="font-mono text-[9.5px] px-1.5 py-0.5 rounded cursor-pointer border-0"
      style={{ background: s.bg, color: s.text }}
    >
      {s.label}
    </button>
  )
}

function CategoryPill({ value }) {
  if (!value) return <span className="text-ink-mute">—</span>
  return (
    <span className="inline-block font-sans text-[11px] text-ink-soft bg-bg border border-rule rounded-full px-2 py-0.5 truncate max-w-full">
      {value}
    </span>
  )
}

function RoundBadge({ value }) {
  if (!value) return <span className="text-ink-mute font-mono text-[11px]">—</span>
  return (
    <span className="font-mono text-[10px] text-ink-soft border border-rule rounded px-1.5 py-0.5 whitespace-nowrap">
      {value}
    </span>
  )
}

function PlayerRow({ player, showType, colTemplate, onCycleType, onDescribe }) {
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)

  const expand = () => {
    setExpanded(e => !e)
    if (!expanded && !player.description && onDescribe) {
      setBusy(true)
      Promise.resolve(onDescribe(player.id)).finally(() => setBusy(false))
    }
  }

  return (
    <div className={`border-b border-rule last:border-b-0 ${player.focal ? 'bg-accent-soft/25' : ''}`}>
      <div
        className="grid items-center px-4 py-2.5 cursor-pointer hover:bg-bg transition-colors"
        style={{ gridTemplateColumns: colTemplate }}
        onClick={expand}
      >
        <span className="text-ink-mute">{expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span>

        <div className="flex items-center gap-2 min-w-0">
          <span className="font-sans text-[13px] font-medium text-ink truncate">{player.name}</span>
          {player.focal && (
            <span className="font-mono text-[8px] bg-accent-soft text-accent-deep px-1.5 py-0.5 rounded uppercase tracking-[0.05em] border border-accent-soft shrink-0">focal</span>
          )}
        </div>

        {showType && (
          <div onClick={e => e.stopPropagation()}>
            {player.focal ? <span className="text-ink-mute font-mono text-[11px]">—</span> : <TypePill value={player.relationType} onCycle={() => onCycleType(player.id)} />}
          </div>
        )}

        <div className="min-w-0"><CategoryPill value={player.category} /></div>
        <span className="font-mono text-[11.5px] text-ink-soft">{player.yearFounded || player.founded || '—'}</span>
        <span className="font-sans text-[12px] text-ink-soft truncate">{player.location || '—'}</span>
        <RoundBadge value={player.round} />
        <span className="font-mono text-[11.5px] text-ink-soft">{player.raised || '—'}</span>
        <span className="font-mono text-[11px] text-ink-mute whitespace-nowrap">{player.team || '—'}</span>
      </div>

      {expanded && (
        <div className="px-4 py-3 bg-bg border-t border-rule" style={{ paddingLeft: 44 }}>
          {busy ? (
            <div className="flex items-center gap-2 font-sans text-[12px] text-ink-mute italic">
              <Sparkles size={12} className="text-accent animate-pulse" /> Generating description…
            </div>
          ) : (
            <p className="font-sans text-[12.5px] text-ink-soft leading-relaxed max-w-[680px]">
              {player.description || 'No description yet — expand triggers a one-time AI summary from the homepage + Crunchbase, then caches it.'}
            </p>
          )}
          {player.notes && (
            <p className="mt-2 font-sans text-[11.5px] text-ink-mute italic leading-relaxed max-w-[680px]">
              <span className="font-mono text-[8px] uppercase tracking-[0.08em] not-italic mr-1.5">Note</span>{player.notes}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function PlayersTab({ workspace }) {
  const searchPath = workspace.searchPath || (workspace.focalCompany ? 'company' : 'sector')
  const showType = searchPath === 'company'

  const [overrides, setOverrides] = useState({})  // id -> { relationType?, description? }
  const [sortId, setSortId] = useState('round')

  const merged = useMemo(
    () => (workspace.companies || []).map(c => ({ ...c, ...overrides[c.id] })),
    [workspace.companies, overrides]
  )

  const sorted = useMemo(() => {
    const sort = SORTS.find(s => s.id === sortId) || SORTS[0]
    const arr = [...merged]
    arr.sort((a, b) => {
      // focal pinned to top
      if (a.focal && !b.focal) return -1
      if (b.focal && !a.focal) return 1
      const va = sort.get(a), vb = sort.get(b)
      if (typeof va === 'string') return va.localeCompare(vb)
      return vb - va  // numeric: descending (most-funded / latest / largest first)
    })
    return arr
  }, [merged, sortId])

  const cycleType = (id) => setOverrides(o => {
    const cur = (o[id]?.relationType) ?? merged.find(c => c.id === id)?.relationType
    const idx = TYPE_CYCLE.indexOf(cur)
    const nextType = TYPE_CYCLE[(idx + 1) % TYPE_CYCLE.length]
    return { ...o, [id]: { ...o[id], relationType: nextType } }
  })

  // Stand-in for the "generate on first expand, then cache" description flow.
  const describe = (id) => setOverrides(o => ({
    ...o,
    [id]: { ...o[id], description: o[id]?.description || _stubDescription(merged.find(c => c.id === id)) },
  }))

  // grid: chevron | name | [type] | category | founded | location | round | raised | team
  const colTemplate = showType
    ? '28px minmax(150px,1.5fr) 84px minmax(110px,1fr) 74px 110px 96px 84px 96px'
    : '28px minmax(150px,1.5fr) minmax(130px,1.2fr) 74px 110px 96px 84px 96px'

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-rule bg-bg-card shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-mute">Sort by</span>
          <div className="flex items-center gap-1">
            {SORTS.map(s => (
              <button
                key={s.id}
                onClick={() => setSortId(s.id)}
                className="font-sans text-[11.5px] px-2 py-1 rounded border cursor-pointer transition-all"
                style={sortId === s.id
                  ? { background: '#15063b', color: '#fff', borderColor: '#15063b' }
                  : { background: '#fff', color: '#6a6560', borderColor: '#d8d2c5' }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-mute">
          {sorted.length} companies · {searchPath} search
        </span>
      </div>

      {/* Header */}
      <div className="grid items-center px-4 py-2 border-b border-rule bg-bg-card shrink-0" style={{ gridTemplateColumns: colTemplate }}>
        <span />
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-mute">Name</span>
        {showType && <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-mute">Type</span>}
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-mute">Category</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-mute">Founded</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-mute">Location</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-mute">Round</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-mute">Raised</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-mute">Team</span>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-ink-mute font-sans text-[13px] italic">
            No companies in this segment yet.
          </div>
        ) : (
          sorted.map(player => (
            <PlayerRow
              key={player.id}
              player={player}
              showType={showType}
              colTemplate={colTemplate}
              onCycleType={cycleType}
              onDescribe={describe}
            />
          ))
        )}
      </div>
    </div>
  )
}

function _stubDescription(co) {
  if (!co) return ''
  const bits = [co.category, co.location, co.round].filter(Boolean).join(', ')
  return `${co.name} operates in ${co.category || 'this segment'}${bits ? ` (${bits})` : ''}. ` +
    `${co.raised && co.raised !== '—' ? `It has raised ${co.raised}. ` : ''}` +
    `Expand-time summaries are generated once from public sources and cached.`
}
