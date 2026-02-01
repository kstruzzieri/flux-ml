interface HeaderProps {
  version?: string
}

const NAV_ITEMS = [
  { id: 'experiments', label: 'Experiments' },
  { id: 'compare', label: 'Compare' },
  { id: 'data', label: 'Data' },
  { id: 'code', label: 'Code' },
] as const

export function Header({ version }: HeaderProps) {
  return (
    <header className="header" role="banner">
      <div className="header__brand">
        <span className="header__title">Flux</span>
      </div>

      <nav className="header__nav" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`header__nav-item ${item.id === 'experiments' ? 'header__nav-item--active' : ''}`}
            aria-current={item.id === 'experiments' ? 'page' : undefined}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="header__spacer" />

      <div className="header__status">
        {version && <span className="header__version">v{version}</span>}
      </div>
    </header>
  )
}
