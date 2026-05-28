import { useState, useRef } from 'react'
import { ChevronRight, ChevronDown, Plus, Sparkles, X, Trash2 } from 'lucide-react'

const BUBBLE_COLORS = {
  1: { active: '#e8a09a', inactive: '#f5e0de' },
  2: { active: '#e8c97a', inactive: '#f5edcf' },
  3: { active: '#e8c97a', inactive: '#f5edcf' },
  4: { active: '#8ec9a0', inactive: '#d4edda' },
  5: { active: '#8ec9a0', inactive: '#d4edda' },
}

const FIXED_COLS = [
  { key: 'founded',   label: 'Founded',    width: '80px'  },
  { key: 'geography', label: 'Geography',  width: '110px' },
  { key: 'fundRound', label: 'Fund Round', width: '120px' },
]

function PriorityPicker({ value, onChange }) {
  const colors = value ? BUBBLE_COLORS[value] : { active: '#d8d2c5', inactive: '#ece8e1' }
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={() => onChange(value === n ? null : n)}
          className="w-2.5 h-2.5 rounded-full border-0 cursor-pointer"
          style={{
            background: value >= n ? colors.active : colors.inactive,
            transition: 'background 0.25s ease, transform 0.15s ease',
            transform: value >= n ? 'scale(1.15)' : 'scale(1)',
          }}
        />
      ))}
    </div>
  )
}

function EditableField({ label, value, onChange, rows = 1 }) {
  const [editing, setEditing] = useState(false)
  const ref = useRef(null)
  const activate = () => { setEditing(true); setTimeout(() => ref.current?.focus(), 0) }

  return (
    <div className="flex items-start gap-4 py-2.5 border-b border-rule last:border-b-0">
      <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-mute w-28 shrink-0 pt-0.5">{label}</span>
      {editing ? (
        <textarea
          ref={ref}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          rows={rows}
          className="flex-1 bg-transparent border-0 border-b-2 border-accent outline-none font-sans text-[13px] text-ink resize-none leading-relaxed"
        />
      ) : (
        <div onClick={activate} className="flex-1 font-sans text-[13px] leading-relaxed cursor-text" style={{ color: value ? '#1a1a1a' : '#b0a89e' }}>
          {value || `Add ${label.toLowerCase()}…`}
        </div>
      )}
    </div>
  )
}

function InlineCell({ value, onChange }) {
  const [editing, setEditing] = useState(false)
  const ref = useRef(null)
  const activate = (e) => { e.stopPropagation(); setEditing(true); setTimeout(() => ref.current?.focus(), 0) }

  if (editing) return (
    <input
      ref={ref}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      onBlur={() => setEditing(false)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditing(false) }}
      onClick={e => e.stopPropagation()}
      className="w-full bg-white border border-ink-mute rounded px-2 py-0.5 font-sans text-[12.5px] text-ink outline-none"
    />
  )

  return (
    <div onClick={activate} className="font-sans text-[12.5px] cursor-text truncate" style={{ color: value ? '#4a4a4a' : '#c0b9b0' }}>
      {value || '—'}
    </div>
  )
}

function PlayerRow({ player, customColumns, onUpdate, onRemove }) {
  const [expanded, setExpanded] = useState(false)
  const [enhancing, setEnhancing] = useState(false)
  const [extraFields, setExtraFields] = useState(player.extraFields || [])
  const [confirmDelete, setConfirmDelete] = useState(false)

  const colTemplate = `28px 1fr ${FIXED_COLS.map(c => c.width).join(' ')}${customColumns.map(() => ' 120px').join('')} 36px 130px 28px`

  const handleEnhance = () => {
    setEnhancing(true)
    setTimeout(() => {
      onUpdate({
        description: player.description || `${player.name} is a notable player in this space with a differentiated approach to the market.`,
        segment: player.segment || 'B2B SaaS',
        primaryCustomer: player.primaryCustomer || 'Mid-market companies',
      })
      setEnhancing(false)
    }, 1200)
  }

  return (
    <div className={`border-b border-rule last:border-b-0 ${player.focal ? 'bg-accent-soft/30' : ''}`}>
      {confirmDelete ? (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50/60 border-b border-red-100">
          <span className="font-sans text-[12.5px] text-ink flex-1">
            Remove <span className="font-medium">{player.name}</span>? This can't be undone.
          </span>
          <button
            onClick={() => setConfirmDelete(false)}
            className="font-sans text-[12px] px-3 py-1.5 rounded-md border border-rule bg-white text-ink-soft hover:text-ink cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onRemove}
            className="font-sans text-[12px] px-3 py-1.5 rounded-md border border-red-300 bg-red-500 text-white hover:bg-red-600 cursor-pointer transition-colors"
          >
            Remove
          </button>
        </div>
      ) : (
      <div
        className="group grid items-center px-4 py-3 cursor-pointer hover:bg-bg transition-colors"
        style={{ gridTemplateColumns: colTemplate }}
        onClick={() => setExpanded(p => !p)}
      >
        <span className="text-ink-mute">
          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>

        <div className="flex items-center gap-2 min-w-0">
          <span className="font-sans text-[13px] font-medium text-ink truncate">{player.name}</span>
          {player.focal && (
            <span className="font-mono text-[8px] bg-accent-soft text-accent-deep px-1.5 py-0.5 rounded uppercase tracking-[0.05em] border border-accent-soft shrink-0">focal</span>
          )}
        </div>

        {FIXED_COLS.map(col => (
          <InlineCell key={col.key} value={player[col.key]} onChange={v => onUpdate({ [col.key]: v })} />
        ))}

        {customColumns.map(col => (
          <InlineCell
            key={col.id}
            value={player.customFields?.[col.id] || ''}
            onChange={v => onUpdate({ customFields: { ...player.customFields, [col.id]: v } })}
          />
        ))}

        <span />

        <div onClick={e => e.stopPropagation()}>
          <PriorityPicker value={player.priority} onChange={v => onUpdate({ priority: v })} />
        </div>

        <button
          onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
          className="opacity-0 group-hover:opacity-100 flex items-center justify-center bg-transparent border-0 cursor-pointer text-ink-mute hover:text-red-400 transition-all p-0"
        >
          <Trash2 size={12} />
        </button>
      </div>
      )}

      {expanded && (
        <div className="px-4 py-3 bg-bg border-t border-rule flex gap-4 items-start">
          <div className="flex-1 bg-white border border-rule rounded-lg px-5 py-1">
            {[
              { key: 'description',    label: 'Description',      rows: 2 },
              { key: 'segment',        label: 'Segment',           rows: 1 },
              { key: 'primaryCustomer',label: 'Primary customer',  rows: 1 },
              { key: 'notes',          label: 'Notes',             rows: 2 },
            ].map(({ key, label, rows }) => (
              <EditableField key={key} label={label} value={player[key]} onChange={v => onUpdate({ [key]: v })} rows={rows} />
            ))}
            {extraFields.map((field, i) => (
              <EditableField
                key={field.id}
                label={field.label}
                value={field.value}
                onChange={v => {
                  const updated = extraFields.map((f, j) => j === i ? { ...f, value: v } : f)
                  setExtraFields(updated)
                  onUpdate({ extraFields: updated })
                }}
                rows={1}
              />
            ))}
            <button
              onClick={() => {
                const updated = [...extraFields, { id: `ef-${Date.now()}`, label: 'New field', value: '' }]
                setExtraFields(updated)
                onUpdate({ extraFields: updated })
              }}
              className="flex items-center gap-1.5 w-full py-2.5 font-sans text-[11.5px] text-ink-mute hover:text-ink bg-transparent border-0 cursor-pointer transition-colors border-t border-rule"
            >
              <Plus size={11} />
              Add field
            </button>
          </div>
          <button
            onClick={handleEnhance}
            disabled={enhancing}
            className="shrink-0 flex items-center gap-1.5 font-sans text-[11.5px] font-medium px-3 py-2 rounded-md border border-rule bg-white text-ink-soft hover:text-ink hover:border-ink-mute transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap mt-1"
          >
            <Sparkles size={11} className="text-accent" />
            {enhancing ? 'Enhancing…' : 'AI enhance'}
          </button>
        </div>
      )}
    </div>
  )
}

function EditableColHeader({ label, onChange, onRemove }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(label)
  const ref = useRef(null)

  const save = () => { onChange(draft); setEditing(false) }

  return (
    <div className="group flex items-center gap-1 min-w-0">
      {editing ? (
        <input
          ref={ref}
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false) }}
          className="w-full bg-transparent border-0 border-b border-ink-mute outline-none font-mono text-[9px] uppercase tracking-[0.12em] text-ink"
        />
      ) : (
        <>
          <span
            className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-mute cursor-pointer hover:text-ink truncate"
            onClick={() => { setEditing(true); setDraft(label) }}
          >
            {label}
          </span>
          <button
            onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 shrink-0 bg-transparent border-0 cursor-pointer p-0 text-ink-mute hover:text-red-400 transition-all"
          >
            <X size={9} />
          </button>
        </>
      )}
    </div>
  )
}

export default function PlayersTab({ workspace }) {
  const [players, setPlayers] = useState(() =>
    (workspace.companies || []).map(co => ({
      founded: '', geography: '', fundRound: '', priority: null,
      description: '', segment: '', primaryCustomer: '', notes: '',
      customFields: {}, ...co,
    }))
  )
  const [customColumns, setCustomColumns] = useState([])

  const sorted = [...players].sort((a, b) => {
    if (!a.priority && !b.priority) return 0
    if (!a.priority) return 1
    if (!b.priority) return -1
    return b.priority - a.priority
  })

  const update = (id, changes) => setPlayers(p => p.map(co => co.id === id ? { ...co, ...changes } : co))

  const addPlayer = () => {
    const id = `co-${Date.now()}`
    setPlayers(p => [...p, {
      id, name: 'New company', focal: false, founded: '', geography: '',
      fundRound: '', priority: null, description: '', segment: '',
      primaryCustomer: '', notes: '', customFields: {},
    }])
  }

  const addColumn = () => {
    const id = `col-${Date.now()}`
    setCustomColumns(p => [...p, { id, label: 'New column' }])
  }

  const remove = (id) => setPlayers(p => p.filter(co => co.id !== id))

  const colTemplate = `28px 1fr ${FIXED_COLS.map(c => c.width).join(' ')}${customColumns.map(() => ' 120px').join('')} 36px 130px 28px`

  return (
    <div className="flex-1 flex flex-col min-h-0">

      {/* Table header */}
      <div
        className="grid items-center px-4 py-2 border-b border-rule bg-bg-card shrink-0"
        style={{ gridTemplateColumns: colTemplate }}
      >
        <span />
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-mute">Name</span>
        {FIXED_COLS.map(col => (
          <span key={col.key} className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-mute">{col.label}</span>
        ))}
        {customColumns.map(col => (
          <EditableColHeader
            key={col.id}
            label={col.label}
            onChange={label => setCustomColumns(p => p.map(c => c.id === col.id ? { ...c, label } : c))}
            onRemove={() => setCustomColumns(p => p.filter(c => c.id !== col.id))}
          />
        ))}
        <button
          onClick={addColumn}
          className="flex items-center justify-center text-ink-mute hover:text-ink bg-transparent border-0 cursor-pointer transition-colors p-0"
          title="Add column"
        >
          <Plus size={13} />
        </button>
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-mute">Priority /5</span>
        <span />
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-ink-mute font-sans text-[13px] italic">
            No companies yet — add one below
          </div>
        ) : (
          sorted.map(player => (
            <div key={player.id} style={{ transition: 'all 0.3s ease' }}>
              <PlayerRow
                player={player}
                customColumns={customColumns}
                onUpdate={changes => update(player.id, changes)}
                onRemove={() => remove(player.id)}
              />
            </div>
          ))
        )}

        <button
          onClick={addPlayer}
          className="flex items-center gap-2 w-full px-5 py-3 text-left font-sans text-[12.5px] text-ink-mute hover:text-ink hover:bg-bg border-0 bg-transparent cursor-pointer transition-colors border-t border-rule"
        >
          <Plus size={13} />
          Add company
        </button>
      </div>
    </div>
  )
}
