import { useState } from 'react'
import Button from './Button'

function ChatInput({ onSend, disabled = false }) {
  const [text, setText] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()

    const value = text.trim()
    if (!value || disabled) {
      return
    }

    onSend(value)
    setText('')
  }

  return (
    <form className="chat-input-bar" onSubmit={handleSubmit}>
      <input
        className="chat-input"
        type="text"
        placeholder="Write a message"
        value={text}
        onChange={(event) => setText(event.target.value)}
        disabled={disabled}
        aria-label="Write a message"
      />
      <Button type="submit" variant="primary" disabled={disabled || !text.trim()}>
        Send
      </Button>
    </form>
  )
}

export default ChatInput
