import { useState } from 'react'
import { X, Pencil, Plus, ArrowRight, Mail, CalendarDays, Users, Banknote, BarChart3 } from 'lucide-react'
import { getProfile, METRIC_LEVELS } from '../data/companyProfiles'

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

export default function CompanyProfile({ company, onClose, onEnterSegment }) {
  const base = getProfile(company)
  const [contacts, setContacts] = useState(base.contacts.map(c => ({ ...c })))
  const [meetings, setMeetings] = useState(base.meetings.map(m => ({ ...m })))

  const updateContact = (id, patch) => setContacts(p => p.map(c => c.id === id ? { ...c, ...patch } : c))
  const removeContact = (id) => setContacts(p => p.filter(c => c.id !== id))
  const addContact = () => setContacts(p => [...p, { id: `k-${Date.now()}`, name: '', role: '', email: '', note: '' }])

  const updateMeeting = (id, patch) => setMeetings(p => p.map(m => m.id === id ? { ...m, ...patch } : m))
  const removeMeeting = (id) => setMeetings(p => p.filter(m => m.id !== id))
  const addMeeting = () => setMeetings(p => [{ id: `m-${Date.now()}`, date: new Date().toISOString().slice(0, 10), time: '', title: '', attendees: '', notes: '' }, ...p])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      {/* Blurred backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Centered modal */}
      <div className="relative bg-bg border border-rule rounded-xl shadow-2xl flex flex-col overflow-hidden" style={{ width: 640, maxWidth: '94vw', maxHeight: '88vh' }}>

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-rule bg-bg-card shrink-0">
          <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute">Company · Relationship</span>
          <div className="flex items-center gap-2">
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
                </div>
                <span className="font-sans text-[12.5px] text-ink-soft">
                  {[company.geography, company.founded && `Founded ${company.founded}`].filter(Boolean).join(' · ')}
                </span>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                {company.fundRound && <span className="font-mono text-[10px] text-ink-soft bg-bg px-2.5 py-1 rounded-full border border-rule">{company.fundRound}</span>}
                {base.totalRaised && (
                  <div className="flex flex-col items-end mt-1">
                    <span className="font-serif text-[22px] font-semibold text-ink leading-none">{base.totalRaised}</span>
                    <span className="font-sans text-[10.5px] text-ink-mute mt-1">total raised</span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* ── Contacts (relationship focus) ── */}
          <div>
            <SectionLabel icon={Users} action={
              <button onClick={addContact} className="flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.08em] text-ink-mute hover:text-ink bg-transparent border-0 cursor-pointer transition-colors">
                <Plus size={10} /> Add
              </button>
            }>Contacts</SectionLabel>
            <Card className="overflow-hidden divide-y divide-rule">
              {contacts.length === 0 && (
                <div className="px-4 py-5 font-sans text-[12.5px] text-ink-mute italic text-center">No contacts yet — click Add.</div>
              )}
              {contacts.map(c => (
                <div key={c.id} className="px-4 py-3.5 group flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <div className="min-w-[120px]">
                      <InlineText value={c.name} onChange={v => updateContact(c.id, { name: v })} placeholder="Name" className="font-sans text-[13px] font-semibold text-ink" />
                    </div>
                    <span className="text-ink-mute">·</span>
                    <div className="flex-1 min-w-0">
                      <InlineText value={c.role} onChange={v => updateContact(c.id, { role: v })} placeholder="Role" className="font-sans text-[11.5px] text-ink-soft" />
                    </div>
                    <button onClick={() => removeContact(c.id)} className="shrink-0 text-ink-mute hover:text-red-500 bg-transparent border-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-all p-0.5">
                      <X size={11} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail size={10} className="text-ink-mute shrink-0" />
                    <InlineText value={c.email} onChange={v => updateContact(c.id, { email: v })} placeholder="email…" className="font-mono text-[10.5px] text-ink-soft" />
                  </div>
                  <InlineText value={c.note} onChange={v => updateContact(c.id, { note: v })} placeholder="Relationship note…" className="font-sans text-[11.5px] text-ink-mute italic leading-relaxed" />
                </div>
              ))}
            </Card>
          </div>

          {/* ── Meeting notes history (relationship focus) ── */}
          <div>
            <SectionLabel icon={CalendarDays} action={
              <button onClick={addMeeting} className="flex items-center gap-1 font-mono text-[8.5px] uppercase tracking-[0.08em] text-ink-mute hover:text-ink bg-transparent border-0 cursor-pointer transition-colors">
                <Plus size={10} /> Log meeting
              </button>
            }>Meeting notes</SectionLabel>
            <div className="flex flex-col gap-2.5">
              {meetings.length === 0 && (
                <Card className="px-4 py-5"><div className="font-sans text-[12.5px] text-ink-mute italic text-center">No meetings logged yet — click Log meeting.</div></Card>
              )}
              {meetings.map(m => (
                <Card key={m.id} className="p-4 group">
                  <div className="flex items-center gap-2 mb-2.5">
                    <input type="date" value={m.date || ''} onChange={e => updateMeeting(m.id, { date: e.target.value })}
                      className="font-mono text-[10.5px] text-ink-soft bg-bg border border-rule rounded px-1.5 py-1 outline-none focus:border-ink-mute cursor-pointer shrink-0" />
                    <input type="time" value={m.time || ''} onChange={e => updateMeeting(m.id, { time: e.target.value })}
                      className="font-mono text-[10.5px] text-ink-soft bg-bg border border-rule rounded px-1.5 py-1 outline-none focus:border-ink-mute cursor-pointer shrink-0" />
                    <div className="flex-1 min-w-0">
                      <InlineText value={m.title} onChange={v => updateMeeting(m.id, { title: v })} placeholder="Meeting title" className="font-sans text-[13px] font-semibold text-ink" />
                    </div>
                    <button onClick={() => removeMeeting(m.id)} className="shrink-0 text-ink-mute hover:text-red-500 bg-transparent border-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-all p-0.5">
                      <X size={11} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <InlineText value={m.attendees} onChange={v => updateMeeting(m.id, { attendees: v })} placeholder="Attendees…" className="font-sans text-[11px] text-ink-soft" />
                    <InlineText value={m.notes} onChange={v => updateMeeting(m.id, { notes: v })} multiline placeholder="What was discussed…" className="font-sans text-[12px] text-ink leading-relaxed" />
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* ── Funding ── */}
          {(base.latestRound || base.fundingHistory.length > 0) && (
            <div>
              <SectionLabel icon={Banknote}>Funding</SectionLabel>
              <Card className="overflow-hidden">
                {base.latestRound && (
                  <div className="px-5 py-4 border-b border-rule">
                    <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-mute">Latest round</span>
                    <div className="font-sans text-[14px] font-semibold text-ink mt-1">
                      {[base.latestRound.stage, base.latestRound.amount].filter(Boolean).join(' · ')}
                    </div>
                    {base.latestRound.date && <div className="font-sans text-[11.5px] text-ink-mute mt-0.5">{base.latestRound.date}</div>}
                  </div>
                )}
                {base.investors.length > 0 && (
                  <div className="px-5 py-4 border-b border-rule">
                    <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-mute">Key investors</span>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {base.investors.map((inv, i) => (
                        <span key={i} className="font-sans text-[11.5px] px-2.5 py-1 rounded-full border" style={{ background: '#f5f2ef', color: '#4a4a4a', borderColor: '#e8e0d4' }}>{inv}</span>
                      ))}
                    </div>
                  </div>
                )}
                {base.fundingHistory.length > 0 && (
                  <div className="px-5 py-4">
                    <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-ink-mute">History</span>
                    <div className="flex flex-col mt-2 divide-y divide-rule">
                      {base.fundingHistory.map((f, i) => (
                        <div key={i} className="flex items-center gap-4 py-2.5">
                          <span className="font-mono text-[10px] text-ink-mute w-[64px] shrink-0">{f.date}</span>
                          <span className="font-serif text-[14px] font-semibold text-ink w-[64px] shrink-0">{f.amount}</span>
                          <span className="font-sans text-[12px] text-ink-soft flex-1">{f.round}{f.lead ? ` · ${f.lead}` : ''}</span>
                          {f.current && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#2d6a3f' }} />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ── Team ── */}
          {base.team.length > 0 && (
            <div>
              <SectionLabel icon={Users}>Team &amp; leadership</SectionLabel>
              <Card className="overflow-hidden divide-y divide-rule">
                {base.team.map((p, i) => (
                  <div key={i} className="px-5 py-4 flex gap-3.5">
                    <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center font-serif text-[14px] text-ink-soft" style={{ background: '#d8d2c5' }}>
                      {p.name.charAt(0)}
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-sans text-[13px] font-semibold text-ink">{p.name}</span>
                      <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-ink-mute">{p.role}</span>
                      <p className="font-sans text-[12px] text-ink-soft leading-relaxed mt-0.5">{p.bio}</p>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          )}

          {/* ── Core metrics ── */}
          {base.metrics && (
            <div className="pb-2">
              <SectionLabel icon={BarChart3}>Core metrics</SectionLabel>
              <Card className="overflow-hidden">
                <div className="grid grid-cols-2">
                  {Object.entries(base.metrics).map(([label, m], i) => {
                    const lv = METRIC_LEVELS[m.level] || METRIC_LEVELS.Low
                    return (
                      <div key={label} className="px-5 py-4 border-rule" style={{ borderRightWidth: i % 2 === 0 ? 1 : 0, borderTopWidth: i >= 2 ? 1 : 0 }}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono text-[8.5px] uppercase tracking-[0.1em] text-ink-mute">{label}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[8px] uppercase tracking-[0.06em] px-1.5 py-0.5 rounded" style={{ background: lv.bg, color: lv.text }}>{m.level}</span>
                            <span className="w-2 h-2 rounded-full" style={{ background: lv.dot }} />
                          </div>
                        </div>
                        <span className="font-serif text-[15px] font-semibold text-ink">{m.value}</span>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
