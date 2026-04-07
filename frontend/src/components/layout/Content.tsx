import { ViewId } from './Header'
import { ExperimentsView, CompareView, DataView, CodeView } from '../views'
import { LayoutPersistence } from '../../hooks/useLayoutPersistence'

export type AppMode = 'welcome' | 'project' | 'no-project-compat'

interface ContentProps {
  activeView: ViewId
  layout: LayoutPersistence
  appMode?: AppMode
}

export function Content({ activeView, layout, appMode }: ContentProps) {
  if (appMode === 'welcome') {
    return <div className="content content--welcome" data-testid="welcome-screen"></div>
  }

  switch (activeView) {
    case 'experiments':
      return <ExperimentsView layout={layout} />
    case 'compare':
      return <CompareView layout={layout} />
    case 'data':
      return <DataView layout={layout} />
    case 'code':
      return <CodeView layout={layout} />
    default:
      return <ExperimentsView layout={layout} />
  }
}
