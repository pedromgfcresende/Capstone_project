import { useState } from 'react'
import { Sparkles, ShieldCheck } from 'lucide-react'
import { VerifyDot, VerifyLegend, VERIFY_ORDER } from './VerifyDot'
import { patchVerification } from '../api/client'

const next = (s) => VERIFY_ORDER[(VERIFY_ORDER.indexOf(s) + 1) % VERIFY_ORDER.length]

function Section({ label, children }) {
  if (!children) return null
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute mb-2">{label}</div>
      <p className="font-sans text-[13px] text-ink-soft leading-relaxed">{children}</p>
    </div>
  )
}

export default function SynthesisPanel({ workspaceId, synthesis, keyInsight }) {
  const initial = synthesis?.verifications || {}
  const [verifs, setVerifs] = useState(initial)

  if (!synthesis) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Sparkles size={20} className="text-ink-mute" />
        <div className="font-sans text-[13px] text-ink-mute">No AI analysis yet.</div>
        <div className="font-sans text-[12px] text-ink-mute">
          Click <span className="font-semibold text-ink">Synthesise</span> in the header to generate one.
        </div>
      </div>
    )
  }

  const claims = synthesis.sources?.claims || []

  const cycle = async (key) => {
    const newStatus = next(verifs[key] || 'ai')
    setVerifs((p) => ({ ...p, [key]: newStatus }))  // optimistic
    try {
      await patchVerification({
        entityType: 'workspace_synthesis',
        entityId: workspaceId,
        claimKey: key,
        status: newStatus,
      })
    } catch {
      setVerifs((p) => ({ ...p, [key]: verifs[key] || 'ai' }))  // revert on failure
    }
  }

  const txt = (s) => s?.text || null

  return (
    <div className="max-w-[820px] mx-auto px-8 py-7 flex flex-col gap-6">

      <div className="flex items-center gap-2 font-mono text-[10px] text-ink-mute">
        <Sparkles size={12} className="text-accent" />
        <span>AI synthesis</span>
        {synthesis.model && <span>· {synthesis.model}</span>}
        {synthesis.generatedAt && <span>· {synthesis.generatedAt.slice(0, 10)}</span>}
      </div>

      {/* Executive summary + key insight */}
      <div className="bg-white border border-rule rounded-lg overflow-hidden">
        <div className="px-6 py-5">
          <p className="font-serif text-[16px] text-ink leading-snug">{txt(synthesis.summary)}</p>
        </div>
        {keyInsight && (
          <div className="px-6 py-4 border-t border-rule" style={{ background: 'linear-gradient(180deg,#fff1ea,#fff)' }}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              <span className="font-mono text-[8px] uppercase tracking-[0.14em] text-accent-deep">Key insight</span>
            </div>
            <p className="font-sans text-[13px] text-ink leading-relaxed">{keyInsight}</p>
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

      {/* Verifiable claims */}
      {claims.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={11} className="text-ink-mute" />
              <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute">
                Verifiable claims · {claims.length}
              </span>
            </div>
            <VerifyLegend />
          </div>
          <div className="bg-white border border-rule rounded-lg overflow-hidden divide-y divide-rule">
            {claims.map((c) => (
              <div key={c.key} className="flex items-start gap-3 px-4 py-3 hover:bg-bg transition-colors">
                <div className="mt-[3px]">
                  <VerifyDot status={verifs[c.key] || 'ai'} onClick={() => cycle(c.key)} />
                </div>
                <p className="font-sans text-[12.5px] text-ink-soft leading-relaxed flex-1">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
