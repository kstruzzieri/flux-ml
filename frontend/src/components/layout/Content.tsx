import { ViewId } from './Header'
import { ExperimentsView, CompareView, DataView, CodeView } from '../views'
import { LayoutPersistence } from '../../hooks/useLayoutPersistence'

interface ContentProps {
  activeView: ViewId
  layout: LayoutPersistence
}

export function Content({ activeView, layout }: ContentProps) {
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
