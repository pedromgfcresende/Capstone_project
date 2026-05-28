import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function ConceptMemo({ onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(20,18,15,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[680px] max-h-[82vh] overflow-y-auto mx-4 bg-bg-card rounded-xl border border-rule shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-8 pt-7 pb-5 border-b border-rule">
          <div>
            <div className="font-mono text-[9px] text-ink-mute uppercase tracking-[0.15em] mb-1.5">
              Internal brief · XAnge
            </div>
            <h2 className="font-serif text-[24px] font-semibold tracking-tight text-ink leading-snug">
              Market Intelligence Platform
            </h2>
          </div>
          <button
            onClick={onClose}
            className="mt-1 p-1.5 rounded text-ink-mute hover:text-ink hover:bg-bg transition-all bg-transparent border-0 cursor-pointer shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-8 py-7 font-sans text-[13.5px] text-ink leading-relaxed space-y-6">

          <section>
            <h3 className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute font-semibold mb-2">
              What this is
            </h3>
            <p>
              This platform is XAnge's internal tool for structured market intelligence. It allows the investment team to map competitive landscapes, track players, and synthesise market signals — all in one place, anchored by AI and editable by analysts.
            </p>
          </section>

          <section>
            <h3 className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute font-semibold mb-2">
              How it works
            </h3>
            <p>
              The tool is organised around <strong>sectors</strong> and <strong>workspaces</strong>. A sector represents a market vertical (e.g. Embedded Finance, Climate Tech). Inside each sector, workspaces are individual competitive analyses — one per thesis or focus area.
            </p>
            <p className="mt-3">
              Each workspace is seeded by the analyst: a market description, an investment thesis or memo, and optionally a list of known players and supporting documents. From this seed, the platform generates a structured landscape — a player table, positioning plot, commentary, and differentiation read relative to a focal company.
            </p>
          </section>

          <section>
            <h3 className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute font-semibold mb-2">
              What it's for
            </h3>
            <p>
              The goal is to reduce the time between "we should look at this market" and "we have a clear view of who's in it and what matters." It is not a replacement for analyst judgment — it is a first-pass scaffold that the team can interrogate, correct, and build on.
            </p>
            <p className="mt-3">
              Workspaces are designed to be shared within the team. Any member can read the concept memo of a sector, open a workspace, and get oriented in minutes without needing a briefing.
            </p>
          </section>

          <section>
            <h3 className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute font-semibold mb-2">
              Current status
            </h3>
            <p>
              This is an early prototype built for XAnge's investment team. The data layer, source citations, and AI generation pipeline are under active development. Content in workspaces should be treated as a starting point and verified before use in investment decisions.
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-rule flex items-center justify-between">
          <span className="font-mono text-[9px] text-ink-mute uppercase tracking-[0.12em]">
            XAnge · Market Intelligence · Internal use only
          </span>
          <button
            onClick={onClose}
            className="font-sans text-[12px] font-medium text-ink-mute hover:text-ink transition-colors bg-transparent border-0 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
