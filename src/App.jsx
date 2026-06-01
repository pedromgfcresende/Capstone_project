import { useState, useRef } from 'react'
import Sidebar from './components/Sidebar'
import { PanelLeftOpen } from 'lucide-react'
import SectorCanvas from './components/SectorCanvas'
import SeedScreen from './components/SeedScreen'
import GeneratingState from './components/GeneratingState'
import WorkspaceView from './components/WorkspaceView'
import LandingPage from './components/LandingPage'
import ConceptMemo from './components/ConceptMemo'
import { sectors as initialSectors } from './data/mockData'

export default function App() {
  const [sectors, setSectors] = useState(initialSectors)
  const [selected, setSelected] = useState(null)
  const sidebarRef = useRef(null)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [workspaceStates, setWorkspaceStates] = useState({})
  const [conceptOpen, setConceptOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const getSector = (id) => sectors.find(s => s.id === id)
  const getWorkspace = (sectorId, wsId) => {
    const sector = getSector(sectorId)
    return sector?.workspaces.find(w => w.id === wsId)
  }

  const handleGenerate = (wsId, seedData) => {
    setWorkspaceStates(p => ({ ...p, [wsId]: { status: 'generating', seedData } }))
  }

  const handleGenerateDone = (wsId) => {
    setWorkspaceStates(p => ({ ...p, [wsId]: { ...p[wsId], status: 'ready' } }))
  }

  const wsState = selected?.type === 'workspace'
    ? workspaceStates[selected.id]
    : null

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {conceptOpen && <ConceptMemo onClose={() => setConceptOpen(false)} />}

      {/* Concept button — always top-right */}
      <button
        onClick={() => setConceptOpen(true)}
        className="fixed top-4 right-5 z-40 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-mute hover:text-ink border border-rule bg-bg-card hover:border-ink-mute px-3 py-1.5 rounded transition-all cursor-pointer"
      >
        Concept
      </button>

      {/* Sidebar — slides in/out */}
      <div style={{ width: sidebarOpen ? 264 : 0, transition: 'width 0.22s ease', overflow: 'hidden', flexShrink: 0 }}>
        <Sidebar ref={sidebarRef} selected={selected} onSelect={setSelected} sectors={sectors} setSectors={setSectors} onCollapse={() => setSidebarOpen(false)} onHome={() => setSelected(null)} />
      </div>

      {/* Expand button — only when sidebar is hidden */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-4 left-4 z-50 p-1.5 rounded-md bg-bg-card border border-rule text-ink-mute hover:text-ink hover:border-ink-mute transition-all cursor-pointer"
          title="Open sidebar"
        >
          <PanelLeftOpen size={15} />
        </button>
      )}

      <div className="flex-1 flex min-w-0">

        {!selected && (
          <LandingPage
            sectors={sectors}
            onSelect={setSelected}
            onCreateSector={() => sidebarRef.current?.triggerNewSector()}
            onCreateWorkspace={(sectorId) => sidebarRef.current?.triggerNewWorkspace(sectorId)}
          />
        )}

        {selected?.type === 'sector' && (
          <SectorCanvas
            sector={getSector(selected.id)}
            workspaceStates={workspaceStates}
            onSelect={setSelected}
            onToggleSources={() => setSourcesOpen(o => !o)}
          />
        )}

        {selected?.type === 'workspace' && (() => {
          const sector = getSector(selected.sectorId)
          const workspace = getWorkspace(selected.sectorId, selected.id)
          if (!workspace) return null

          if (!wsState || wsState.status === 'seed') {
            return (
              <SeedScreen
                workspace={workspace}
                sector={sector}
                onGenerate={(seedData) => handleGenerate(selected.id, seedData)}
              />
            )
          }

          if (wsState.status === 'generating') {
            return (
              <GeneratingState
                workspace={workspace}
                onDone={() => handleGenerateDone(selected.id)}
              />
            )
          }

          if (wsState.status === 'ready') {
            return (
              <WorkspaceView
                workspace={workspace}
                sector={sector}
                seedData={wsState.seedData}
                onToggleSources={() => setSourcesOpen(o => !o)}
              />
            )
          }
        })()}

        {selected?.type === 'company' && (
          <div className="flex-1 flex items-center justify-center text-ink-mute font-sans text-[13px] italic">
            Company view — coming next
          </div>
        )}

      </div>

    </div>
  )
}
