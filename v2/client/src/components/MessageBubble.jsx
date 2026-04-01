function MessageBubble({ message, isOwn }) {
  return (
    <article className={`message-row ${isOwn ? 'message-row-own' : ''}`.trim()}>
      <div className={`message-bubble ${isOwn ? 'message-bubble-own' : ''}`.trim()}>
        <p className="message-text">{message.text}</p>
        <div className="message-meta">
          <span>{message.time}</span>
          {isOwn ? (
            <span className={`message-read ${message.read ? 'seen' : ''}`.trim()}>
              {message.read ? '✓✓' : '✓'}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  )
}

export default MessageBubble
