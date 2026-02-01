import {
  ExperimentsPanel,
  FilesPanel,
  MainPanel,
  InspectorPanel,
  ConfigPanel,
  OutputPanel,
} from './panels'

export function Content() {
  return (
    <div className="content">
      <ExperimentsPanel />
      <FilesPanel />
      <MainPanel />
      <InspectorPanel />
      <ConfigPanel />
      <OutputPanel />
    </div>
  )
}
