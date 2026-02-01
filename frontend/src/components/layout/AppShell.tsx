import { useCallback, useEffect, useState } from 'react'
import { Header, ViewId } from './Header'
import { ActivityBar } from './ActivityBar'
import { Content } from './Content'
import { GetAppInfo } from '../../../wailsjs/go/main/App'

interface AppInfo {
  name: string
  version: string
}

export function AppShell() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [activeView, setActiveView] = useState<ViewId>('experiments')

  // TODO: These will be driven by actual experiment state
  const [runningCount] = useState(0)
  const [alertCount] = useState(0)

  useEffect(() => {
    GetAppInfo()
      .then((info) => setAppInfo(info as AppInfo))
      .catch((err) => console.error('Failed to get app info:', err))
  }, [])

  const handleViewChange = useCallback((view: ViewId) => {
    setActiveView(view)
  }, [])

  const handleCommandPalette = useCallback(() => {
    // TODO: Open command palette modal
    console.log('Command palette triggered')
  }, [])

  return (
    <div className="app-shell">
      <Header
        version={appInfo?.version}
        activeView={activeView}
        onViewChange={handleViewChange}
        runningCount={runningCount}
        alertCount={alertCount}
        onCommandPalette={handleCommandPalette}
      />
      <ActivityBar activeItem={activeView} onItemClick={handleViewChange} />
      <Content />
    </div>
  )
}
