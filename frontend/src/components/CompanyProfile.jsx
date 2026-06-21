import { useState } from 'react'
import { X, Pencil, ArrowRight, Banknote, Sparkles } from 'lucide-react'
import { getProfile } from '../data/companyProfiles'
import { VerifyDot, VerifyLegend, useVerifyMap } from './VerifyDot'
import { patchCompany } from '../api/client'

function InlineText({ value, onChange, multiline = false, placeholder = '—', className = '' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const save = () => { onChange(draft); setEditing(false) }
  const cancel = () => { setDraft(value); setEditing(false) }
  if (editing) return multiline ? (
    <div className="flex flex-col gap-2 w-full">
      <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)} rows={4}
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
    <div className="group/edit flex items-start gap-1.5 cursor-text w-full" onClick={() => { setEditing(true); setDraft(value) }}>
      <span className={`flex-1 ${className} ${!value ? 'text-ink-mute italic' : ''}`}>{value || placeholder}</span>
      <Pencil size={9} className="text-ink-mute opacity-0 group-hover/edit:opacity-40 transition-opacity mt-1 shrink-0" />
    </div>
  )
}

function SectionLabel({ icon: Icon, children, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={11} className="text-ink-mute" />}
        <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute">{children}</span>
      </div>
      {action}
    </div>
  )
}

function Card({ children, className = '' }) {
  return <div className={`bg-white border border-rule rounded-lg ${className}`}>{children}</div>
}

// Editable + verifiable company fact. Edits persist to the shared company record;
// the verify dot lets the analyst mark each fact AI-generated / verified / needs-check.
function Fact({ label, value, onChange, verify, vkey, multiline = false }) {
  return (
    <div className="px-5 py-3.5 flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <VerifyDot status={verify.get(vkey)} onClick={() => verify.cycle(vkey)} />
        <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-mute">{label}</span>
      </div>
      <div className="pl-[18px]">
        <InlineText value={value || ''} onChange={onChange} multiline={multiline}
          placeholder="Click to add…" className="font-sans text-[13px] text-ink leading-relaxed" />
      </div>
    </div>
  )
}

export default function CompanyProfile({ company, onClose, onEnterSegment, onSaved }) {
  const base = getProfile(company)
  const verify = useVerifyMap()
  const [saveMsg, setSaveMsg] = useState('')
  // editable core facts, seeded from the company; funding_status maps from the raw round
  const [form, setForm] = useState({
    founded: company.founded || '',
    geography: company.geography || company.location || '',
    funding_status: company.roundRaw || company.fundRound || '',
    funding_amount: company.fundingAmount || '',
    top_investors: company.topInvestors || '',
    primary_customer: company.primaryCustomer || '',
    description: company.description || '',
  })

  const saveField = async (field, value) => {
    setForm(f => ({ ...f, [field]: value }))
    try {
      await patchCompany(company.id, { [field]: value })
      setSaveMsg('Saved ✓')
      onSaved?.()
    } catch (e) {
      setSaveMsg(`Save failed: ${e.message}`)
    }
  }

  const extra = company.extra || {}
  const aiWhy = company.why || extra.why
  const aiSources = company.sources || extra.sources || []
  const aiConfidence = company.confidence ?? extra.confidence

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      {/* Blurred backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Centered modal */}
      <div className="relative bg-bg border border-rule rounded-xl shadow-2xl flex flex-col overflow-hidden" style={{ width: 640, maxWidth: '94vw', maxHeight: '88vh' }}>

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-rule bg-bg-card shrink-0">
          <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute">Company · Profile</span>
          <div className="flex items-center gap-2">
            {saveMsg && <span className="font-mono text-[9px] text-ink-mute">{saveMsg}</span>}
            {onEnterSegment && company.workspaceId && (
              <button onClick={onEnterSegment}
                className="flex items-center gap-1.5 font-sans text-[11.5px] font-medium px-3 py-1.5 rounded-md border border-rule bg-white text-ink-soft hover:text-ink hover:border-ink-mute cursor-pointer transition-all">
                Open in segment <ArrowRight size={11} />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-md text-ink-mute hover:text-ink hover:bg-black/5 border-0 bg-transparent cursor-pointer transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">

          {/* ── Header ── */}
          <Card className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="font-serif text-[24px] font-semibold text-ink tracking-tight">{company.name}</h2>
                  {company.focal && <span className="font-mono text-[8px] uppercase tracking-[0.06em] text-accent-deep bg-accent-soft px-2 py-1 rounded-full border border-accent-soft">focal</span>}
                  {company.origin === 'ai' && <span className="font-mono text-[8px] uppercase tracking-[0.06em] px-2 py-1 rounded-full" style={{ background: '#e8e0f8', color: '#5a3d9a' }}>AI-found</span>}
                </div>
                <span className="font-sans text-[12.5px] text-ink-soft">
                  {[form.geography, form.founded && `Founded ${form.founded}`, company.segment].filter(Boolean).join(' · ')}
                </span>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                {company.fundRound && <span className="font-mono text-[10px] text-ink-soft bg-bg px-2.5 py-1 rounded-full border border-rule">{company.fundRound}</span>}
                {(base.totalRaised || company.raised) && (
                  <div className="flex flex-col items-end mt-1">
                    <span className="font-serif text-[22px] font-semibold text-ink leading-none">{base.totalRaised || company.raised}</span>
                    <span className="font-sans text-[10.5px] text-ink-mute mt-1">{base.totalRaised ? 'total raised' : 'raised'}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* ── Key facts (editable + verifiable) ── */}
          <div>
            <SectionLabel icon={Pencil} action={<VerifyLegend />}>Key facts · editable</SectionLabel>
            <Card className="overflow-hidden divide-y divide-rule">
              <div className="grid grid-cols-2 divide-x divide-rule">
                <Fact label="Year founded" value={form.founded} verify={verify} vkey="founded" onChange={v => saveField('founded', v)} />
                <Fact label="Location" value={form.geography} verify={verify} vkey="geography" onChange={v => saveField('geography', v)} />
              </div>
              <div className="grid grid-cols-2 divide-x divide-rule">
                <Fact label="Funding stage" value={form.funding_status} verify={verify} vkey="funding_status" onChange={v => saveField('funding_status', v)} />
                <Fact label="Funding amount" value={form.funding_amount} verify={verify} vkey="funding_amount" onChange={v => saveField('funding_amount', v)} />
              </div>
              <Fact label="Top investors" value={form.top_investors} verify={verify} vkey="top_investors" onChange={v => saveField('top_investors', v)} />
              <Fact label="Primary customer" value={form.primary_customer} verify={verify} vkey="primary_customer" onChange={v => saveField('primary_customer', v)} />
              <Fact label="Description" value={form.description} verify={verify} vkey="description" multiline onChange={v => saveField('description', v)} />
            </Card>
          </div>

          {/* ── AI provenance (for AI-discovered competitors) ── */}
          {(aiWhy || aiSources.length > 0) && (
            <div>
              <SectionLabel icon={Sparkles}>Why it's a competitor · AI</SectionLabel>
              <Card className="p-5 flex flex-col gap-3">
                {aiWhy && <p className="font-sans text-[12.5px] text-ink leading-relaxed">{aiWhy}</p>}
                {aiConfidence != null && <span className="font-mono text-[9px] text-ink-mute">confidence {Math.round(aiConfidence * 100)}%</span>}
                {aiSources.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[8px] uppercase tracking-[0.08em] text-ink-mute">sources</span>
                    {aiSources.slice(0, 6).map((s, i) => {
                      const u = typeof s === 'string' ? s : (s?.url || '')
                      if (!u) return null
                      return (
                        <a key={i} href={u} target="_blank" rel="noreferrer" className="font-mono text-[9px] text-accent-deep hover:underline truncate max-w-[160px]">
                          {u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                        </a>
                      )
                    })}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ── Funding (latest round + investors, from the company record) ── */}
          {(base.latestRound || base.investors.length > 0) && (
            <div>
              <SectionLabel icon={Banknote}>Funding</SectionLabel>
              <Card className="overflow-hidden">
                {base.latestRound && (
                  <div className="px-5 py-4 border-b border-rule">
                    <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-mute">Latest round</span>
                    <div className="font-sans text-[14px] font-semibold text-ink mt-1">
                      {[base.latestRound.stage, base.latestRound.amount].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                )}
                {base.investors.length > 0 && (
                  <div className="px-5 py-4">
                    <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-mute">Key investors</span>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {base.investors.map((inv, i) => (
                        <span key={i} className="font-sans text-[11.5px] px-2.5 py-1 rounded-full border" style={{ background: '#f5f2ef', color: '#4a4a4a', borderColor: '#e8e0d4' }}>{inv}</span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
