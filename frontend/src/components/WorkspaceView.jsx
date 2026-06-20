import { useState, useEffect, useCallback } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'
import OverviewTab from './tabs/OverviewTab'
import PlayersTab from './tabs/PlayersTab'
import ComparativeTab from './tabs/ComparativeTab'
import DifferentiationTab from './tabs/DifferentiationTab'
import SourcesTab from './tabs/SourcesTab'
import SynthesisPanel from './SynthesisPanel'
import { getSegment, synthesizeSegment } from '../api/client'

const TABS = [
  { id: 'summary', label: 'AI Analysis' },
  { id: 'overview', label: 'Market Overview' },
  { id: 'players', label: 'Players' },
  { id: 'comparative', label: 'Comparative' },
  { id: 'differentiation', label: 'Differentiation' },
  { id: 'sources', label: 'Sources' },
]

export default function WorkspaceView({ workspace, sector, onSectorsChanged }) {
  const [activeTab, setActiveTab] = useState('summary')
  const [detail, setDetail] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    getSegment(workspace.id).then(setDetail).catch((e) => setError(e.message))
  }, [workspace.id])

  useEffect(() => { setDetail(null); setError(null); load() }, [load])

  const ws = detail || workspace
  const synthesis = detail?.synthesis || null

  const runSynthesis = async () => {
    setBusy(true); setError(null)
    try {
      const updated = await synthesizeSegment(workspace.id)
      setDetail(updated)
      setActiveTab('summary')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">

      {/* Header */}
      <div className="flex items-center justify-between pl-8 pr-28 py-4 border-b border-rule bg-bg-card shrink-0">
        <div>
          <div className="font-mono text-[9px] text-ink-mute uppercase tracking-[0.12em] mb-1">
            {sector?.label} · Segment
          </div>
          <h1 className="font-serif text-[20px] font-semibold tracking-tight text-ink">
            {ws.title}
          </h1>
        </div>
        <button
          onClick={runSynthesis}
          disabled={busy}
          className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-mute hover:text-ink border border-rule hover:border-ink-mute px-3 py-1.5 rounded transition-all cursor-pointer bg-bg-card disabled:opacity-50"
        >
          {busy
            ? <><RefreshCw size={11} className="animate-spin" /> Synthesising…</>
            : <><Sparkles size={11} /> {synthesis ? 'Re-synthesise' : 'Synthesise'}</>}
        </button>
      </div>

      {error && (
        <div className="px-8 py-2 bg-accent-soft border-b border-rule font-sans text-[12px] text-accent-deep shrink-0">
          {error}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-6 border-b border-rule bg-bg-card shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="relative px-3 py-3 font-sans text-[12.5px] font-medium transition-colors bg-transparent border-0 cursor-pointer whitespace-nowrap"
            style={{ color: activeTab === tab.id ? '#15063b' : '#8a8580' }}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {!detail && !error ? (
          <div className="flex-1 flex items-center justify-center font-sans text-[13px] text-ink-mute">
            Loading workspace…
          </div>
        ) : (
          <>
            {activeTab === 'summary' && (
              <SynthesisPanel workspaceId={workspace.id} synthesis={synthesis} keyInsight={ws.keyInsight} />
            )}
            {activeTab === 'overview' && <OverviewTab workspace={ws} sector={sector} />}
            {activeTab === 'players' && <PlayersTab workspace={ws} sector={sector} onMoved={() => { load(); onSectorsChanged?.() }} />}
            {activeTab === 'comparative' && <ComparativeTab workspace={ws} sector={sector} />}
            {activeTab === 'differentiation' && <DifferentiationTab workspace={ws} sector={sector} />}
            {activeTab === 'sources' && <SourcesTab workspace={ws} sector={sector} onReload={load} />}
          </>
        )}
      </div>

    </div>
  )
}
