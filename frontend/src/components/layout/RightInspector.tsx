export function RightInspector() {
  return (
    <aside className="inspector" role="complementary" aria-label="Inspector">
      <div className="inspector__header">
        <span className="inspector__title">Inspector</span>
      </div>
      <div className="inspector__content">
        <div className="inspector__placeholder">Select an item to view details</div>
      </div>
    </aside>
  )
}
