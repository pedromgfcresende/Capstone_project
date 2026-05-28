import { useState } from 'react'
import PlayersTab from './tabs/PlayersTab'
import ComparativeTab from './tabs/ComparativeTab'
import CommentaryTab from './tabs/CommentaryTab'
import DifferentiationTab from './tabs/DifferentiationTab'
import SummaryTab from './tabs/SummaryTab'
import SourcesTab from './tabs/SourcesTab'

const TABS = [
  { id: 'players', label: 'Players' },
  { id: 'comparative', label: 'Comparative' },
  { id: 'commentary', label: 'Market Commentary' },
  { id: 'differentiation', label: 'Differentiation' },
  { id: 'summary', label: 'Summary' },
  { id: 'sources', label: 'Sources' },
]

export default function WorkspaceView({ workspace, sector, seedData }) {
  const [activeTab, setActiveTab] = useState('players')

  return (
    <div className="flex-1 flex flex-col min-h-0">

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-rule bg-bg-card shrink-0">
        <div>
          <div className="font-mono text-[9px] text-ink-mute uppercase tracking-[0.12em] mb-1">
            {sector?.label} · Workspace
          </div>
          <h1 className="font-serif text-[20px] font-semibold tracking-tight text-ink">
            {workspace.title}
          </h1>
        </div>
        <div className="font-mono text-[10px] text-ink-mute">
          {workspace.updatedAt}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-6 border-b border-rule bg-bg-card shrink-0">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="relative px-3 py-3 font-sans text-[12.5px] font-medium transition-colors bg-transparent border-0 cursor-pointer whitespace-nowrap"
            style={{ color: activeTab === tab.id ? '#1a1a1a' : '#8a8580' }}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 flex flex-col min-h-0">
        {activeTab === 'players' && <PlayersTab workspace={workspace} sector={sector} />}
        {activeTab === 'comparative' && <ComparativeTab workspace={workspace} sector={sector} />}
        {activeTab === 'commentary' && <CommentaryTab workspace={workspace} sector={sector} />}
        {activeTab === 'differentiation' && <DifferentiationTab workspace={workspace} sector={sector} />}
        {activeTab === 'summary' && <SummaryTab workspace={workspace} sector={sector} />}
        {activeTab === 'sources' && <SourcesTab workspace={workspace} sector={sector} />}
      </div>

    </div>
  )
}
