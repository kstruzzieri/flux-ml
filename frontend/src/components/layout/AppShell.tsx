import { useEffect, useState } from 'react'
import { Header } from './Header'
import { ActivityBar } from './ActivityBar'
import { Content } from './Content'
import { GetAppInfo } from '../../../wailsjs/go/main/App'

interface AppInfo {
  name: string
  version: string
}

export function AppShell() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [activeView, setActiveView] = useState('experiments')

  useEffect(() => {
    GetAppInfo()
      .then((info) => setAppInfo(info as AppInfo))
      .catch((err) => console.error('Failed to get app info:', err))
  }, [])

  return (
    <div className="app-shell">
      <Header version={appInfo?.version} />
      <ActivityBar activeItem={activeView} onItemClick={setActiveView} />
      <Content />
    </div>
  )
}
