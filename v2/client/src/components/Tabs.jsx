function Tabs({ items, activeTab, onChange, className = '' }) {
  return (
    <nav className={`tabs ${className}`.trim()}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`tab-button ${activeTab === item.key ? 'active' : ''}`.trim()}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}

export default Tabs
