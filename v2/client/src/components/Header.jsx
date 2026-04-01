function Header({ friendName, statusText, onPing, pingDisabled }) {
  return (
    <header className="chat-header">
      <div className="chat-header-meta">
        <p className="chat-friend-name">{friendName}</p>
        <p className="chat-status-text">{statusText}</p>
      </div>
      <button
        type="button"
        className="quick-ping-button"
        onClick={onPing}
        disabled={pingDisabled}
      >
        Ping
      </button>
    </header>
  )
}

export default Header
