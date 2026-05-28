import { useState, useRef, useEffect } from 'react'
import { BookOpen, Plus, ArrowRight, Users, Clock, Send, Sparkles, ChevronDown, ChevronUp, X, Pencil, Check } from 'lucide-react'

const STATUS_LABEL = {
  seed: { label: 'Not started', color: '#d8d2c5', text: '#8a8580' },
  generating: { label: 'Generating…', color: '#fce6dc', text: '#e85d3b' },
  ready: { label: 'Ready', color: '#d4edda', text: '#2d6a3f' },
}

const MOCK_THEMES = [
  { id: 't1', title: 'Structural shift in buyer behaviour', body: 'End customers are demanding more transparency and control, compressing margins for incumbents and creating entry points for agile challengers with better UX and pricing models.' },
  { id: 't2', title: 'AI as infrastructure, not feature', body: 'The market is moving past AI as a differentiator toward AI as a baseline expectation. Companies that have embedded it into their core workflows hold a structural advantage over late adopters.' },
  { id: 't3', title: 'Regulatory tailwind creating urgency', body: 'Incoming regulation is forcing procurement cycles to accelerate. Compliance-native players are winning deals not on merit alone but on the reduced risk they represent to buyers.' },
  { id: 't4', title: 'Consolidation pressure in the mid-market', body: 'A wave of undercapitalised Series A and B companies from 2020-2022 are approaching runway limits. Strategic acquirers and larger players are beginning to absorb them, reshaping the competitive map.' },
  { id: 't5', title: 'Distribution moats over product moats', body: 'In a market where products are converging, the winners are those with locked-in distribution — whether through partnerships, ecosystems, or embedded channels. Product alone is no longer a sustainable edge.' },
]

const MOCK_RESPONSES = [
  (sector) => ({
    answer: `Across the workspaces in ${sector.label}, enterprise positioning is strongest among companies that have secured multi-year contracts with large institutional clients. The competitive differentiation tends to cluster around integration depth and compliance posture rather than pure product features.`,
    citations: [
      { workspace: sector.workspaces[0]?.title || 'Workspace One', note: 'Company A leads on enterprise contract volume, with 3 disclosed Fortune 500 relationships.' },
      { workspace: sector.workspaces[1]?.title || 'Workspace Two', note: 'Company D shows comparable traction in the mid-market segment with a stronger self-serve motion.' },
    ]
  }),
  (sector) => ({
    answer: `The funding landscape across ${sector.label} shows a clear bifurcation: early-stage rounds are concentrated in product-led companies, while growth-stage capital is flowing toward those with proven enterprise sales. Total disclosed funding across tracked workspaces suggests the market is past early consensus but pre-consolidation.`,
    citations: [
      { workspace: sector.workspaces[0]?.title || 'Workspace One', note: 'Median Series A is $12M, with two outliers above $40M.' },
      { workspace: sector.workspaces[1]?.title || 'Workspace Two', note: 'Later-stage rounds skewing toward infrastructure plays over application layer.' },
    ]
  }),
  (sector) => ({
    answer: `Regulatory signals across ${sector.label} workspaces point toward increasing compliance requirements in the EU, particularly around data residency and auditability. Companies with built-in compliance tooling are gaining ground. This is likely to accelerate consolidation among smaller players without the resources to adapt.`,
    citations: [
      { workspace: sector.workspaces[0]?.title || 'Workspace One', note: 'Two players have proactively built GDPR/AI Act compliance into their core product.' },
    ]
  }),
]

function ThemeCard({ theme, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(theme.title)
  const [body, setBody] = useState(theme.body)

  const save = () => {
    onUpdate({ ...theme, title, body })
    setEditing(false)
  }

  return (
    <div className="bg-white border border-rule rounded-lg p-5 flex flex-col gap-3 group relative">
      {!editing ? (
        <>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-sans text-[13.5px] font-semibold text-ink leading-snug flex-1">{theme.title}</h3>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                onClick={() => setEditing(true)}
                className="p-1 rounded text-ink-mute hover:text-ink bg-transparent border-0 cursor-pointer transition-colors"
              >
                <Pencil size={11} />
              </button>
              <button
                onClick={onRemove}
                className="p-1 rounded text-ink-mute hover:text-red-500 bg-transparent border-0 cursor-pointer transition-colors"
              >
                <X size={11} />
              </button>
            </div>
          </div>
          <p className="font-sans text-[12.5px] text-ink-soft leading-relaxed">{theme.body}</p>
        </>
      ) : (
        <>
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="font-sans text-[13.5px] font-semibold text-ink bg-transparent border-0 border-b border-rule outline-none pb-1 w-full"
          />
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={3}
            className="font-sans text-[12.5px] text-ink-soft bg-transparent border-0 outline-none resize-none leading-relaxed w-full"
          />
          <div className="flex justify-end">
            <button
              onClick={save}
              className="flex items-center gap-1.5 font-sans text-[12px] font-medium px-3 py-1.5 rounded bg-ink text-white border-0 cursor-pointer transition-all"
              onMouseEnter={e => e.currentTarget.style.background = '#e85d3b'}
              onMouseLeave={e => e.currentTarget.style.background = '#1a1a1a'}
            >
              <Check size={12} />
              Save
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function CitationBlock({ citation }) {
  return (
    <div className="flex gap-3 py-2.5 border-t border-rule-soft first:border-t-0">
      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-accent-deep bg-accent-soft px-2 py-0.5 rounded border border-accent-soft shrink-0 h-fit mt-0.5">
        {citation.workspace}
      </span>
      <p className="font-sans text-[12.5px] text-ink-soft leading-relaxed">{citation.note}</p>
    </div>
  )
}

function QueryResult({ result, query }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white border border-rule rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-rule bg-bg flex items-center gap-2">
        <Sparkles size={11} className="text-accent shrink-0" />
        <span className="font-sans text-[12px] text-ink-soft italic flex-1">"{query}"</span>
      </div>
      <div className="px-5 py-4">
        <p className="font-sans text-[13.5px] text-ink leading-relaxed">{result.answer}</p>
      </div>
      {result.citations.length > 0 && (
        <div className="border-t border-rule">
          <button
            onClick={() => setExpanded(p => !p)}
            className="w-full flex items-center justify-between px-5 py-2.5 bg-transparent border-0 cursor-pointer hover:bg-bg transition-colors"
          >
            <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-mute">
              {result.citations.length} source{result.citations.length !== 1 ? 's' : ''}
            </span>
            {expanded ? <ChevronUp size={12} className="text-ink-mute" /> : <ChevronDown size={12} className="text-ink-mute" />}
          </button>
          {expanded && (
            <div className="px-5 pb-4 flex flex-col">
              {result.citations.map((c, i) => (
                <CitationBlock key={i} citation={c} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SectorCanvas({ sector, workspaceStates, onSelect, onToggleSources }) {
  const [themes, setThemes] = useState(MOCK_THEMES.slice(0, 4))
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [thinking, setThinking] = useState(false)
  const inputRef = useRef(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (results.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [results])

  if (!sector) return (
    <div className="flex-1 flex items-center justify-center text-ink-mute font-sans text-[13px]">
      Select a sector from the sidebar
    </div>
  )

  const addTheme = () => {
    const id = `theme-${Date.now()}`
    setThemes(p => [...p, { id, title: 'New theme', body: 'Describe the structural force or signal driving this theme…' }])
  }

  const handleQuery = () => {
    const q = query.trim()
    if (!q || thinking) return
    setQuery('')
    setThinking(true)
    setTimeout(() => {
      const mockFn = MOCK_RESPONSES[results.length % MOCK_RESPONSES.length]
      setResults(p => [...p, { query: q, ...mockFn(sector) }])
      setThinking(false)
    }, 1400)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-rule shrink-0 bg-bg-card">
        <div>
          <div className="font-mono text-[9px] text-ink-mute uppercase tracking-[0.15em] mb-1">Sector</div>
          <h1 className="font-serif text-[22px] font-semibold tracking-tight text-ink">{sector.label}</h1>
        </div>
        <button
          onClick={onToggleSources}
          className="flex items-center gap-1.5 font-sans text-[12px] font-medium px-3 py-1.5 rounded border border-rule bg-white text-ink-soft hover:text-ink hover:border-ink-mute transition-all cursor-pointer"
        >
          <BookOpen size={13} />
          Sources
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-7">
        <div className="max-w-[820px] mx-auto flex flex-col gap-10">

          {/* Ask across workspaces */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute font-semibold">Ask across workspaces</span>
              <span className="font-mono text-[9px] text-ink-mute">· AI synthesis</span>
            </div>

            {results.length > 0 && (
              <div className="flex flex-col gap-3 mb-4">
                {results.map((r, i) => (
                  <QueryResult key={i} result={r} query={r.query} />
                ))}
              </div>
            )}

            {thinking && (
              <div className="flex items-center gap-3 px-5 py-4 bg-white border border-rule rounded-lg mb-4">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-accent" style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
                <span className="font-sans text-[12.5px] text-ink-mute italic">Synthesising across workspaces…</span>
              </div>
            )}

            <div className="flex items-center gap-3 px-5 py-3.5 bg-white border border-rule rounded-lg focus-within:border-ink-mute transition-colors">
              <Sparkles size={13} className="text-ink-mute shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleQuery() }}
                placeholder={sector.workspaces.length === 0 ? 'Add workspaces to start querying…' : 'Ask anything across this sector — e.g. "Who has the strongest enterprise traction?"'}
                disabled={sector.workspaces.length === 0 || thinking}
                className="flex-1 bg-transparent border-0 outline-none font-sans text-[13px] text-ink placeholder:text-ink-mute disabled:opacity-50"
              />
              <button
                onClick={handleQuery}
                disabled={!query.trim() || thinking || sector.workspaces.length === 0}
                className="shrink-0 p-1 rounded text-ink-mute hover:text-ink disabled:opacity-30 bg-transparent border-0 cursor-pointer transition-colors"
              >
                <Send size={13} />
              </button>
            </div>
            <div className="mt-2 font-sans text-[11px] text-ink-mute">
              Responses cite the workspace they draw from — no cross-contamination between workspaces.
            </div>
            <div ref={bottomRef} />
          </div>

          {/* Themes */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute font-semibold">
                  Key Themes
                </span>
                <span className="font-mono text-[9px] text-ink-mute ml-2">· AI-generated · editable</span>
              </div>
              <button
                onClick={addTheme}
                className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-mute hover:text-ink transition-colors bg-transparent border-0 cursor-pointer"
              >
                <Plus size={11} />
                Add theme
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {themes.map(t => (
                <ThemeCard
                  key={t.id}
                  theme={t}
                  onUpdate={updated => setThemes(p => p.map(x => x.id === updated.id ? updated : x))}
                  onRemove={() => setThemes(p => p.filter(x => x.id !== t.id))}
                />
              ))}
            </div>
          </div>

          {/* Workspaces */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-ink-mute font-semibold">
                Workspaces · {sector.workspaces.length}
              </span>
            </div>
            {sector.workspaces.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg py-10" style={{ borderColor: '#d8d2c5' }}>
                <div className="font-sans text-[13px] text-ink-mute">No workspaces yet</div>
                <div className="font-sans text-[11.5px] text-ink-mute">Use the sidebar to create one</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {sector.workspaces.map(ws => {
                  const state = workspaceStates?.[ws.id]
                  const status = state?.status || 'seed'
                  const badge = STATUS_LABEL[status] || STATUS_LABEL.seed
                  return (
                    <button
                      key={ws.id}
                      onClick={() => onSelect({ type: 'workspace', id: ws.id, sectorId: sector.id })}
                      className="flex flex-col gap-3 p-5 bg-white border border-rule rounded-lg text-left cursor-pointer transition-all group hover:border-ink-mute hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-sans text-[13.5px] font-semibold text-ink leading-snug flex-1">{ws.title}</div>
                        <ArrowRight size={13} className="text-ink-mute opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0" />
                      </div>
                      {ws.focalCompany && (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[8px] bg-accent-soft text-accent-deep px-1.5 py-0.5 rounded uppercase tracking-[0.05em] border border-accent-soft">focal</span>
                          <span className="font-sans text-[12px] text-ink-soft">{ws.focalCompany}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-rule">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 font-sans text-[11px] text-ink-mute">
                            <Users size={10} />{ws.companies.length} player{ws.companies.length !== 1 ? 's' : ''}
                          </span>
                          <span className="flex items-center gap-1 font-sans text-[11px] text-ink-mute">
                            <Clock size={10} />{ws.updatedAt}
                          </span>
                        </div>
                        <span className="font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-[0.05em]" style={{ background: badge.color, color: badge.text }}>
                          {badge.label}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
