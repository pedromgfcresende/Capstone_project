import { useState, useRef, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import { PanelLeftOpen } from 'lucide-react'
import SectorCanvas from './components/SectorCanvas'
import SeedScreen from './components/SeedScreen'
import GeneratingState from './components/GeneratingState'
import WorkspaceView from './components/WorkspaceView'
import LandingPage from './components/LandingPage'
import ConceptMemo from './components/ConceptMemo'
import CrmView from './components/CrmView'
import { getSectors } from './api/client'

export default function App() {
  const [sectors, setSectors] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [selected, setSelected] = useState(null)
  const sidebarRef = useRef(null)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [workspaceStates, setWorkspaceStates] = useState({})
  const [conceptOpen, setConceptOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    getSectors()
      .then(setSectors)
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false))
  }, [])

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

  const startNewWorkspace = () => setSelected({ type: 'newWorkspace' })

  // After a competitor CSV upload creates a real workspace: refetch and select it.
  const handleWorkspaceCreated = async (created) => {
    try {
      const data = await getSectors()
      setSectors(data)
      setSelected({ type: 'workspace', id: created.id, sectorId: created.sectorId })
    } catch (e) {
      setLoadError(e.message)
    }
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
            onCreateWorkspace={startNewWorkspace}
            onNewWorkspace={startNewWorkspace}
            onOpenCrm={() => setSelected({ type: 'crm' })}
          />
        )}

        {selected?.type === 'crm' && <CrmView />}

        {selected?.type === 'newWorkspace' && (
          <SeedScreen
            workspace={{ title: '' }}
            sector={null}
            onCreated={handleWorkspaceCreated}
            onCancel={() => setSelected(null)}
          />
        )}

        {selected?.type === 'sector' && (
          <SectorCanvas
            sector={getSector(selected.id)}
            workspaceStates={workspaceStates}
            onSelect={setSelected}
            onToggleSources={() => setSourcesOpen(o => !o)}
            onSectorUpdated={(s) => setSectors(prev => prev.map(x => x.id === s.id ? { ...x, ...s } : x))}
          />
        )}

        {selected?.type === 'workspace' && (() => {
          const sector = getSector(selected.sectorId)
          const workspace = getWorkspace(selected.sectorId, selected.id)
          if (!workspace) return null

          // A workspace loaded from the API may already be 'ready' (has companies);
          // local seed/generating state takes precedence when present.
          const effectiveStatus =
            wsState?.status || (workspace.status === 'ready' ? 'ready' : 'seed')

          if (effectiveStatus === 'seed') {
            return (
              <SeedScreen
                workspace={workspace}
                sector={sector}
                onCreated={handleWorkspaceCreated}
              />
            )
          }

          if (effectiveStatus === 'generating') {
            return (
              <GeneratingState
                workspace={workspace}
                onDone={() => handleGenerateDone(selected.id)}
              />
            )
          }

          if (effectiveStatus === 'ready') {
            return (
              <WorkspaceView
                workspace={workspace}
                sector={sector}
                seedData={wsState?.seedData}
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
