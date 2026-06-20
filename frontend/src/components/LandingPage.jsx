import { useState, useMemo } from 'react'
import { ArrowRight, Upload, Search, X, Database } from 'lucide-react'
import XangeLogo from './XangeLogo'

export default function LandingPage({ sectors, onSelect, onNewSector, onOpenCrm, loadError }) {
  const [query, setQuery] = useState('')

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const results = []
    for (const sector of sectors) {
      if (sector.label.toLowerCase().includes(q)) {
        results.push({ type: 'sector', id: sector.id, label: sector.label, sub: `${sector.workspaces.length} workspace${sector.workspaces.length !== 1 ? 's' : ''}` })
      }
      for (const ws of sector.workspaces) {
        if (ws.title.toLowerCase().includes(q) || ws.focalCompany?.toLowerCase().includes(q)) {
          results.push({ type: 'workspace', id: ws.id, sectorId: sector.id, label: ws.title, sub: sector.label })
        }
        for (const co of (ws.companies || [])) {
          if (co.name.toLowerCase().includes(q) || co.segment?.toLowerCase().includes(q) || co.geography?.toLowerCase().includes(q)) {
            results.push({ type: 'company', id: co.id, sectorId: sector.id, wsId: ws.id, label: co.name, sub: `${ws.title} · ${sector.label}` })
          }
        }
      }
    }
    return results.slice(0, 8)
  }, [query, sectors])

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-bg px-8">
      <div className="w-full max-w-[560px]">

        {/* Brand mark — logo only */}
        <div className="flex items-center mb-8">
          <XangeLogo size={40} radius={9} />
        </div>

        {/* Heading */}
        <h1 className="font-serif text-[32px] font-semibold tracking-tight text-ink leading-tight mb-2">
          Where do you want<br />to start?
        </h1>
        <p className="font-sans text-[13.5px] text-ink-mute leading-relaxed mb-10">
          Map a new market or pick up where you left off.
        </p>

        {loadError && (
          <div className="mb-6 font-sans text-[12.5px] text-accent-deep bg-accent-soft border border-accent-soft rounded-lg px-4 py-2.5">
            Couldn’t reach the API ({loadError}). Is the backend running on :8000?
          </div>
        )}

        {/* Global search */}
        <div className="relative mb-4">
          <div className="flex items-center gap-2.5 px-4 py-3 bg-white border border-rule rounded-lg focus-within:border-ink-mute transition-colors">
            <Search size={14} className="text-ink-mute shrink-0" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search sectors, workspaces, companies…"
              className="flex-1 bg-transparent border-0 outline-none font-sans text-[13px] text-ink placeholder:text-ink-mute"
            />
            {query && (
              <button onClick={() => setQuery('')} className="bg-transparent border-0 cursor-pointer p-0 text-ink-mute hover:text-ink transition-colors">
                <X size={13} />
              </button>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-rule rounded-lg shadow-lg overflow-hidden z-20">
              {searchResults.map((r, i) => (
                <button
                  key={i}
                  onClick={() => { setQuery(''); onSelect({ type: r.type === 'company' ? 'workspace' : r.type, id: r.type === 'company' ? r.wsId : r.id, sectorId: r.sectorId }) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-bg border-0 bg-transparent cursor-pointer text-left transition-colors border-b border-rule last:border-b-0"
                >
                  <span className="font-mono text-[8px] uppercase tracking-[0.1em] text-ink-mute w-14 shrink-0">{r.type}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-sans text-[12.5px] font-medium text-ink truncate">{r.label}</div>
                    <div className="font-sans text-[11px] text-ink-mute truncate">{r.sub}</div>
                  </div>
                  <ArrowRight size={12} className="text-ink-mute shrink-0" />
                </button>
              ))}
            </div>
          )}

          {query && searchResults.length === 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-rule rounded-lg shadow-lg px-4 py-3 z-20">
              <span className="font-sans text-[12.5px] text-ink-mute italic">No results for "{query}"</span>
            </div>
          )}
        </div>

        {/* Primary actions */}
        <div className="flex flex-col gap-3 mb-10">
          <button
            onClick={onNewSector}
            className="flex items-center gap-3 px-5 py-4 bg-ink text-white rounded-lg font-sans text-[13.5px] font-semibold transition-all cursor-pointer border-0 text-left group"
            onMouseEnter={e => e.currentTarget.style.background = '#6a5cd6'}
            onMouseLeave={e => e.currentTarget.style.background = '#15063b'}
          >
            <div className="w-7 h-7 rounded bg-white/15 flex items-center justify-center shrink-0">
              <Upload size={14} />
            </div>
            <div className="flex-1">
              <div>Create a new sector</div>
              <div className="font-sans text-[11px] font-normal opacity-60 mt-0.5">
                Import a competitor-analysis CSV — segments &amp; companies are built from it
              </div>
            </div>
            <ArrowRight size={15} className="opacity-40 group-hover:opacity-80 transition-opacity" />
          </button>

          {/* Browse the CRM pipeline */}
          <button
            onClick={onOpenCrm}
            className="w-full flex items-center gap-3 px-5 py-4 bg-white border border-rule rounded-lg font-sans text-[13.5px] font-semibold transition-all cursor-pointer text-left group hover:border-ink-mute"
          >
            <div className="w-7 h-7 rounded bg-bg flex items-center justify-center shrink-0 border border-rule">
              <Database size={14} className="text-ink-soft" />
            </div>
            <div className="flex-1 text-ink">
              <div>Browse the deal pipeline</div>
            </div>
            <ArrowRight size={15} className="text-ink-mute opacity-40 group-hover:opacity-80 transition-opacity" />
          </button>
        </div>

        {/* Existing sectors */}
        {sectors.length > 0 && (
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute font-semibold mb-3">
              Recent sectors
            </div>
            <div className="flex flex-col gap-1.5">
              {sectors.map(s => (
                <button
                  key={s.id}
                  onClick={() => onSelect({ type: 'sector', id: s.id })}
                  className="flex items-center gap-3 px-4 py-3 bg-white border border-rule rounded-lg font-sans text-[13px] text-ink hover:border-ink-mute transition-all cursor-pointer text-left group"
                >
                  <div className="flex-1">
                    <div className="font-medium">{s.label}</div>
                    <div className="font-sans text-[11px] text-ink-mute mt-0.5">
                      {s.workspaces.length} workspace{s.workspaces.length !== 1 ? 's' : ''} · updated {s.updatedAt}
                    </div>
                  </div>
                  <ArrowRight size={13} className="text-ink-mute opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
