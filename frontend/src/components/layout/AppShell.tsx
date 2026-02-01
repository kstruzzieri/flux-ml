import { useEffect, useState } from 'react'
import { Header } from './Header'
import { LeftSidebar } from './LeftSidebar'
import { MainContent } from './MainContent'
import { RightInspector } from './RightInspector'
import { BottomPanel } from './BottomPanel'
import { GetAppInfo } from '../../../wailsjs/go/main/App'

interface AppInfo {
  name: string
  version: string
}

export function AppShell() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)

  useEffect(() => {
    GetAppInfo()
      .then((info) => setAppInfo(info as AppInfo))
      .catch((err) => console.error('Failed to get app info:', err))
  }, [])

  return (
    <div className="app-shell">
      <Header version={appInfo?.version} />
      <LeftSidebar />
      <MainContent />
      <RightInspector />
      <BottomPanel />
    </div>
  )
}
