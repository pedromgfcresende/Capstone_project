import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { Search, ChevronRight, ChevronDown, Plus, X, PanelLeftClose } from 'lucide-react'

const Sidebar = forwardRef(function Sidebar({ selected, onSelect, sectors, setSectors, onCollapse, onHome }, ref) {
  useImperativeHandle(ref, () => ({
    triggerNewSector: () => setNewSectorName(''),
    triggerNewWorkspace: (sectorId) => {
      setExpanded(p => ({ ...p, [sectorId]: true }))
      setNewWsName({ sectorId, value: '' })
    }
  }))
  const [mode, setMode] = useState('sector')
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState({})
  const [newSectorName, setNewSectorName] = useState(null)
  const [newWsName, setNewWsName] = useState(null) // sectorId or null
  const newSectorRef = useRef(null)
  const newWsRef = useRef(null)

  useEffect(() => { if (newSectorName !== null) newSectorRef.current?.focus() }, [newSectorName])
  useEffect(() => { if (newWsName !== null) newWsRef.current?.focus() }, [newWsName])

  const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }))

  const commitNewSector = () => {
    const name = (newSectorName || '').trim()
    if (name) {
      const id = `sector-${Date.now()}`
      setSectors(p => [...p, { id, label: name, updatedAt: 'just now', workspaces: [] }])
      onSelect({ type: 'sector', id })
    }
    setNewSectorName(null)
  }

  const commitNewWorkspace = (sectorId) => {
    const name = (newWsName?.value || '').trim()
    if (name) {
      const id = `ws-${Date.now()}`
      setSectors(p => p.map(s => s.id === sectorId
        ? { ...s, workspaces: [...s.workspaces, { id, title: name, focalCompany: null, updatedAt: 'just now', companies: [] }] }
        : s
      ))
      setExpanded(p => ({ ...p, [sectorId]: true }))
      onSelect({ type: 'workspace', id, sectorId })
    }
    setNewWsName(null)
  }

  const startNewWorkspace = (sectorId) => {
    setExpanded(p => ({ ...p, [sectorId]: true }))
    setNewWsName({ sectorId, value: '' })
  }

  const filtered = sectors.filter(s => {
    if (!query) return true
    if (mode === 'sector') return s.label.toLowerCase().includes(query.toLowerCase())
    return s.workspaces.some(ws =>
      ws.companies.some(c => c.name.toLowerCase().includes(query.toLowerCase()))
    )
  })

  // Sidebar uses warm pastel from the same palette as the main canvas
  const bg = '#e8e0d4'
  const bgHover = 'rgba(0,0,0,0.05)'
  const bgActive = 'rgba(0,0,0,0.09)'

  return (
    <div className="w-[260px] h-screen flex flex-col shrink-0 select-none border-r border-rule" style={{ background: bg }}>

      {/* Brand + collapse */}
      <div className="px-4 pt-5 pb-4 border-b border-rule flex items-start justify-between">
        <button
          onClick={onHome}
          className="text-left bg-transparent border-0 cursor-pointer p-0 group"
          title="Go to home"
        >
          <div className="font-serif font-bold text-[16px] text-ink tracking-tight group-hover:text-accent transition-colors">
            XAnge<span className="text-accent">.</span>
          </div>
          <div className="font-mono text-[9px] text-ink-mute uppercase tracking-[0.15em] mt-0.5">
            Market Intelligence
          </div>
        </button>
        <button
          onClick={onCollapse}
          className="p-1 rounded bg-transparent border-0 cursor-pointer text-ink-mute hover:text-ink hover:bg-black/5 transition-colors mt-0.5"
          title="Collapse sidebar"
        >
          <PanelLeftClose size={15} />
        </button>
      </div>

      {/* Search + mode */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative mb-2">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-mute pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={mode === 'sector' ? 'Search sectors…' : 'Search companies…'}
            className="w-full border border-rule rounded pl-8 pr-3 py-1.5 font-sans text-[12px] text-ink placeholder:text-ink-mute outline-none focus:border-ink-mute transition-all"
            style={{ background: 'rgba(255,255,255,0.5)' }}
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-mute hover:text-ink bg-transparent border-0 cursor-pointer p-0">
              <X size={11} />
            </button>
          )}
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1">
          {['sector', 'company'].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="flex-1 py-1 rounded font-sans text-[11px] font-medium transition-all cursor-pointer border capitalize"
              style={mode === m
                ? { background: '#1a1a1a', color: '#fff', borderColor: '#1a1a1a' }
                : { background: 'rgba(255,255,255,0.4)', color: '#8a8580', borderColor: '#d8d2c5' }
              }
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Section label + add */}
      <div className="flex items-center justify-between px-4 pt-1 pb-1">
        <span className="font-mono text-[9px] text-ink-mute uppercase tracking-[0.15em]">Sectors</span>
        <button
          onClick={() => setNewSectorName('')}
          className="text-ink-mute hover:text-ink transition-colors bg-transparent border-0 cursor-pointer p-0.5"
          title="New sector"
        >
          <Plus size={12} />
        </button>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">

        {filtered.map(sector => (
          <div key={sector.id} className="mb-0.5">
            <div
              className="flex items-center gap-1 px-2 py-2 rounded-md transition-all cursor-pointer group"
              style={{
                background: selected?.id === sector.id && selected?.type === 'sector' ? bgActive : 'transparent',
                color: selected?.id === sector.id && selected?.type === 'sector' ? '#1a1a1a' : '#4a4a4a',
              }}
              onMouseEnter={e => { if (!(selected?.id === sector.id && selected?.type === 'sector')) e.currentTarget.style.background = bgHover }}
              onMouseLeave={e => { if (!(selected?.id === sector.id && selected?.type === 'sector')) e.currentTarget.style.background = 'transparent' }}
            >
              <button
                onClick={e => { e.stopPropagation(); toggle(sector.id) }}
                className="shrink-0 p-0 bg-transparent border-0 text-ink-mute hover:text-ink cursor-pointer transition-colors"
              >
                {expanded[sector.id] ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              </button>
              <span
                className="font-sans text-[12.5px] font-medium truncate flex-1"
                onClick={() => onSelect({ type: 'sector', id: sector.id })}
              >
                {sector.label}
              </span>
              <button
                onClick={e => { e.stopPropagation(); startNewWorkspace(sector.id) }}
                className="opacity-0 group-hover:opacity-100 shrink-0 p-0.5 bg-transparent border-0 text-ink-mute hover:text-ink cursor-pointer transition-all"
                title="New workspace"
              >
                <Plus size={11} />
              </button>
            </div>

            {expanded[sector.id] && (
              <div className="ml-4 mt-0.5 space-y-0.5">
                {sector.workspaces.length === 0 && newWsName?.sectorId !== sector.id && (
                  <div className="px-3 py-1.5 font-sans text-[11px] text-ink-mute italic">No workspaces yet</div>
                )}
                {sector.workspaces.map(ws => (
                  <div key={ws.id}>
                    <div
                      className="flex items-center gap-1 px-2 py-1.5 rounded cursor-pointer transition-all"
                      style={{
                        background: selected?.id === ws.id && selected?.type === 'workspace' ? bgActive : 'transparent',
                        color: selected?.id === ws.id && selected?.type === 'workspace' ? '#1a1a1a' : '#6a6560',
                      }}
                      onMouseEnter={e => { if (!(selected?.id === ws.id && selected?.type === 'workspace')) e.currentTarget.style.background = bgHover }}
                      onMouseLeave={e => { if (!(selected?.id === ws.id && selected?.type === 'workspace')) e.currentTarget.style.background = 'transparent' }}
                    >
                      <button
                        onClick={e => { e.stopPropagation(); toggle(ws.id) }}
                        className="shrink-0 p-0 bg-transparent border-0 text-ink-mute hover:text-ink cursor-pointer"
                      >
                        {expanded[ws.id] ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                      </button>
                      <span
                        className="font-sans text-[12px] truncate flex-1"
                        onClick={() => onSelect({ type: 'workspace', id: ws.id, sectorId: sector.id })}
                      >
                        {ws.title}
                      </span>
                    </div>

                    {expanded[ws.id] && (
                      <div className="ml-4 mt-0.5 space-y-0.5">
                        {ws.companies.map(co => (
                          <button
                            key={co.id}
                            onClick={() => onSelect({ type: 'company', id: co.id, workspaceId: ws.id, sectorId: sector.id })}
                            className="w-full text-left flex items-center gap-1.5 px-2 py-1.5 rounded border-0 cursor-pointer transition-all font-sans text-[11.5px] bg-transparent"
                            style={{ color: selected?.id === co.id ? '#1a1a1a' : '#8a8580' }}
                          >
                            {co.focal && (
                              <span className="font-mono text-[8px] bg-accent-soft text-accent-deep px-1 py-0.5 rounded uppercase tracking-[0.05em] shrink-0 border border-accent-soft">
                                focal
                              </span>
                            )}
                            {co.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {/* Inline new workspace input */}
                {newWsName?.sectorId === sector.id && (
                  <div className="flex items-center gap-1 px-2 py-1.5 rounded" style={{ background: bgActive }}>
                    <ChevronRight size={10} className="text-ink-mute shrink-0" />
                    <input
                      ref={newWsRef}
                      type="text"
                      value={newWsName.value}
                      onChange={e => setNewWsName(p => ({ ...p, value: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitNewWorkspace(sector.id)
                        if (e.key === 'Escape') setNewWsName(null)
                      }}
                      onBlur={() => commitNewWorkspace(sector.id)}
                      placeholder="Workspace name…"
                      className="flex-1 bg-transparent border-0 outline-none font-sans text-[12px] text-ink placeholder:text-ink-mute"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Inline new sector row */}
        {newSectorName !== null && (
          <div className="flex items-center gap-1 px-2 py-1.5 rounded-md mt-0.5" style={{ background: bgActive }}>
            <ChevronRight size={11} className="text-ink-mute shrink-0" />
            <input
              ref={newSectorRef}
              type="text"
              value={newSectorName}
              onChange={e => setNewSectorName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitNewSector()
                if (e.key === 'Escape') setNewSectorName(null)
              }}
              onBlur={commitNewSector}
              placeholder="Sector name…"
              className="flex-1 bg-transparent border-0 outline-none font-sans text-[12.5px] font-medium text-ink placeholder:text-ink-mute"
            />
          </div>
        )}

        {filtered.length === 0 && newSectorName === null && (
          <div className="px-3 py-6 text-center font-sans text-[12px] text-ink-mute italic">No results</div>
        )}
      </div>
    </div>
  )
})

export default Sidebar
