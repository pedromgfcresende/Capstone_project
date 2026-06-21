import { Sparkles } from 'lucide-react'

// Bold every mention of the focal company so the reader instantly sees which
// company the synthesis is centred on.
function highlightFocal(text, focal) {
  if (!text || !focal) return text
  const safe = focal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = String(text).split(new RegExp(`(${safe})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === focal.toLowerCase()
      ? <strong key={i} className="font-semibold text-ink">{part}</strong>
      : part
  )
}

function Section({ label, children }) {
  if (!children) return null
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute mb-2">{label}</div>
      <p className="font-sans text-[13px] text-ink-soft leading-relaxed">{children}</p>
    </div>
  )
}

export default function SynthesisPanel({ synthesis, keyInsight, focal }) {
  if (!synthesis) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Sparkles size={20} className="text-ink-mute" />
        <div className="font-sans text-[13px] text-ink-mute">No AI analysis yet.</div>
        <div className="font-sans text-[12px] text-ink-mute">
          Click <span className="font-semibold text-ink">Synthesise</span> in the header to run deep research and generate one.
        </div>
      </div>
    )
  }

  const txt = (s) => s?.text || null

  return (
    <div className="max-w-[820px] mx-auto px-8 py-7 flex flex-col gap-6">

      <div className="flex items-center gap-2 font-mono text-[10px] text-ink-mute">
        <Sparkles size={12} className="text-accent" />
        <span>AI synthesis · deep research</span>
        {synthesis.model && <span>· {synthesis.model}</span>}
        {synthesis.generatedAt && <span>· {synthesis.generatedAt.slice(0, 10)}</span>}
        <span className="ml-auto font-sans normal-case text-ink-mute">Direct sources in the Sources tab →</span>
      </div>

      {/* Executive summary + key insight */}
      <div className="bg-white border border-rule rounded-lg overflow-hidden">
        {focal && (
          <div className="px-6 pt-4 -mb-1 flex items-center gap-2">
            <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-accent-deep bg-accent-soft px-2 py-1 rounded-full border border-accent-soft">Focal · {focal}</span>
            <span className="font-sans text-[11px] text-ink-mute">synthesis is centred on this company</span>
          </div>
        )}
        <div className="px-6 py-5">
          <p className="font-sans text-[14px] text-ink leading-relaxed">{highlightFocal(txt(synthesis.summary), focal)}</p>
        </div>
        {keyInsight && (
          <div className="px-6 py-4 border-t border-rule" style={{ background: 'linear-gradient(180deg,#f1effb,#fff)' }}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-accent-deep">Key insight</span>
            </div>
            <p className="font-sans text-[13px] text-ink leading-relaxed">{highlightFocal(keyInsight, focal)}</p>
          </div>
        )}
      </div>

      {/* Narrative sections */}
      <div className="bg-white border border-rule rounded-lg px-6 py-5 flex flex-col gap-5">
        <Section label="Market overview">{txt(synthesis.overview)}</Section>
        <Section label="Comparative read">{txt(synthesis.comparative)}</Section>
        <Section label="Differentiation vs focal">{txt(synthesis.differentiation)}</Section>
        <Section label="Commentary · investment angle">{txt(synthesis.commentary)}</Section>
      </div>

    </div>
  )
}
