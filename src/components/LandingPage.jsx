import { useState } from 'react'
import { Plus, ArrowRight, FolderOpen, ChevronDown } from 'lucide-react'

export default function LandingPage({ sectors, onSelect, onCreateSector, onCreateWorkspace }) {
  const [pickingSector, setPickingSector] = useState(false)

  const handlePickSector = (sectorId) => {
    setPickingSector(false)
    onCreateWorkspace(sectorId)
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-bg px-8">
      <div className="w-full max-w-[560px]">

        {/* Brand mark */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-7 h-7 rounded-md bg-accent shrink-0"
            style={{ transform: 'rotate(-8deg)' }}
          />
          <div>
            <div className="font-serif font-bold text-[18px] text-ink tracking-tight">
              XAnge<span className="text-accent">.</span>
            </div>
            <div className="font-mono text-[9px] text-ink-mute uppercase tracking-[0.15em]">
              Market Intelligence
            </div>
          </div>
        </div>

        {/* Heading */}
        <h1 className="font-serif text-[32px] font-semibold tracking-tight text-ink leading-tight mb-2">
          Where do you want<br />to start?
        </h1>
        <p className="font-sans text-[13.5px] text-ink-mute leading-relaxed mb-10">
          Map a new market or pick up where you left off.
        </p>

        {/* Primary actions */}
        <div className="flex flex-col gap-3 mb-10">
          <button
            onClick={onCreateSector}
            className="flex items-center gap-3 px-5 py-4 bg-ink text-white rounded-lg font-sans text-[13.5px] font-semibold transition-all cursor-pointer border-0 text-left group"
            onMouseEnter={e => e.currentTarget.style.background = '#e85d3b'}
            onMouseLeave={e => e.currentTarget.style.background = '#1a1a1a'}
          >
            <div className="w-7 h-7 rounded bg-white/15 flex items-center justify-center shrink-0">
              <Plus size={14} />
            </div>
            <div className="flex-1">
              <div>Create a new sector</div>
              <div className="font-sans text-[11px] font-normal opacity-60 mt-0.5">
                Start fresh — describe a market and let the AI build the landscape
              </div>
            </div>
            <ArrowRight size={15} className="opacity-40 group-hover:opacity-80 transition-opacity" />
          </button>

          {/* Create workspace — inline sector picker */}
          <div className="relative">
            <button
              onClick={() => sectors.length > 0 ? setPickingSector(p => !p) : onCreateSector()}
              className="w-full flex items-center gap-3 px-5 py-4 bg-white border border-rule rounded-lg font-sans text-[13.5px] font-semibold transition-all cursor-pointer text-left group hover:border-ink-mute"
            >
              <div className="w-7 h-7 rounded bg-bg flex items-center justify-center shrink-0 border border-rule">
                <FolderOpen size={14} className="text-ink-soft" />
              </div>
              <div className="flex-1 text-ink">
                <div>Create a new workspace</div>
                <div className="font-sans text-[11px] font-normal text-ink-mute mt-0.5">
                  {sectors.length > 0
                    ? 'Add a competitive landscape to an existing sector'
                    : 'Create a sector first to add workspaces'}
                </div>
              </div>
              {sectors.length > 0 && (
                <ChevronDown
                  size={14}
                  className="text-ink-mute transition-transform"
                  style={{ transform: pickingSector ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              )}
            </button>

            {pickingSector && sectors.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-rule rounded-lg shadow-lg overflow-hidden z-10">
                <div className="px-4 py-2 border-b border-rule">
                  <span className="font-mono text-[9px] text-ink-mute uppercase tracking-[0.15em]">
                    Choose a sector
                  </span>
                </div>
                {sectors.map(s => (
                  <button
                    key={s.id}
                    onClick={() => handlePickSector(s.id)}
                    className="w-full flex items-center justify-between px-4 py-3 font-sans text-[13px] text-ink hover:bg-bg border-0 bg-transparent cursor-pointer text-left transition-colors"
                  >
                    <div>
                      <div className="font-medium">{s.label}</div>
                      <div className="text-[11px] text-ink-mute">{s.workspaces.length} workspace{s.workspaces.length !== 1 ? 's' : ''}</div>
                    </div>
                    <ArrowRight size={13} className="text-ink-mute" />
                  </button>
                ))}
              </div>
            )}
          </div>
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
