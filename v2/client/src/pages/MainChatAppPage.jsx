import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import ChatInput from '../components/ChatInput'
import EmptyState from '../components/EmptyState'
import Header from '../components/Header'
import Loader from '../components/Loader'
import MessageBubble from '../components/MessageBubble'
import Tabs from '../components/Tabs'
import { tabItems } from '../data/mockData'
import { fetchConversation, sendMessage, sendPing } from '../services/api'

function MainChatAppPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const chatScrollRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('messages')
  const [conversation, setConversation] = useState(null)
  const [isTyping, setIsTyping] = useState(false)
  const [pingBusy, setPingBusy] = useState(false)

  const identity = location.state?.identity || localStorage.getItem('pinglet_identity') || ''
  const space = location.state?.space || JSON.parse(localStorage.getItem('pinglet_space') || 'null')

  useEffect(() => {
    if (!identity || !space?._id) {
      navigate('/join', { replace: true })
      return
    }

    localStorage.setItem('pinglet_identity', identity)
    localStorage.setItem('pinglet_space', JSON.stringify(space))
  }, [identity, navigate, space])

  const loadConversation = useCallback(async () => {
    if (!space?._id || !identity) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const result = await fetchConversation({
        spaceId: space._id,
        identity,
      })
      setConversation(result)
      setIsTyping(true)
    } catch (loadError) {
      setError(loadError?.message || 'Could not load your space right now.')
    } finally {
      setLoading(false)
    }
  }, [identity, space?._id])

  useEffect(() => {
    loadConversation()
  }, [loadConversation])

  useEffect(() => {
    if (!isTyping) {
      return undefined
    }

    const timer = setTimeout(() => {
      setIsTyping(false)
    }, 2400)

    return () => clearTimeout(timer)
  }, [isTyping])

  useEffect(() => {
    if (activeTab !== 'messages') {
      return
    }

    const node = chatScrollRef.current
    if (node) {
      node.scrollTop = node.scrollHeight
    }
  }, [conversation?.messages, activeTab])

  const statusText = useMemo(() => {
    if (!conversation) {
      return 'Connecting...'
    }

    if (isTyping) {
      return `${conversation.friendName} is typing...`
    }

    if (conversation.online) {
      return 'Online now'
    }

    return conversation.lastSeen
  }, [conversation, isTyping])

  const handleSendMessage = async (text) => {
    if (!space?._id || !identity) {
      setError('Missing session details. Please join again.')
      return
    }

    const optimisticMessage = {
      id: `tmp-${Date.now()}`,
      sender: 'me',
      text,
      dateLabel: 'Today',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      read: false,
    }

    setConversation((previous) => ({
      ...previous,
      messages: [...previous.messages, optimisticMessage],
    }))

    try {
      await sendMessage({
        spaceId: space._id,
        sender: identity,
        text,
      })
      setTimeout(() => {
        setConversation((previous) => ({
          ...previous,
          messages: previous.messages.map((message) => {
            if (message.id === optimisticMessage.id) {
              return { ...message, read: true }
            }
            return message
          }),
        }))
      }, 1000)
    } catch {
      setError('Message failed to send. Try again.')
    }
  }

  const handleQuickPing = async () => {
    setPingBusy(true)

    try {
      await sendPing(space._id, identity)
      setConversation((previous) => ({
        ...previous,
        activities: [
          {
            id: `ping-${Date.now()}`,
            type: 'ping',
            content: `${identity} sent a quick ping`,
            time: 'Just now',
          },
          ...previous.activities,
        ],
      }))
    } catch {
      setError('Ping failed. Please retry.')
    } finally {
      setPingBusy(false)
    }
  }

  const renderMessages = () => {
    if (!conversation?.messages?.length) {
      return (
        <EmptyState
          title="No messages yet"
          description="Start the conversation with your first message."
        />
      )
    }

    let previousDate = ''

    return conversation.messages.map((message) => {
      const showDate = previousDate !== message.dateLabel
      previousDate = message.dateLabel
      const showUnread = message.id === conversation.firstUnreadMessageId

      return (
        <div key={message.id} className="message-appear">
          {showDate ? <div className="date-separator">{message.dateLabel}</div> : null}
          {showUnread ? <div className="unread-separator">Unread messages</div> : null}
          <MessageBubble message={message} isOwn={message.sender === 'me'} />
        </div>
      )
    })
  }

  if (loading) {
    return (
      <main className="app-shell-center">
        <Loader label="Loading your private space..." />
      </main>
    )
  }

  if (error && !conversation) {
    return (
      <main className="app-shell-center">
        <div className="error-card">
          <p>{error}</p>
          <Button onClick={loadConversation}>Retry</Button>
          <Button variant="ghost" onClick={() => navigate('/')}>
            Back Home
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <section className="chat-panel">
        <Header
          friendName={conversation.friendName}
          statusText={statusText}
          onPing={handleQuickPing}
          pingDisabled={pingBusy}
        />

        {error ? <div className="inline-error">{error}</div> : null}

        <div className="chat-content" ref={chatScrollRef}>
          {activeTab === 'messages' ? renderMessages() : null}

          {activeTab === 'memories' ? (
            <section className="memory-grid">
              {conversation.memories.length ? (
                conversation.memories.map((memory) => (
                  <article key={memory.id} className="memory-card">
                    <p className="memory-title">{memory.title}</p>
                    <p>{memory.note}</p>
                    <span>{memory.date}</span>
                  </article>
                ))
              ) : (
                <EmptyState
                  title="No memories yet"
                  description="Save a memory to revisit it here."
                />
              )}
            </section>
          ) : null}

          {activeTab === 'activity' ? (
            <section className="activity-list">
              {conversation.activities.length ? (
                conversation.activities.map((activity) => (
                  <article key={activity.id} className={`activity-item activity-${activity.type}`.trim()}>
                    <p>{activity.content}</p>
                    <span>{activity.time}</span>
                  </article>
                ))
              ) : (
                <EmptyState
                  title="No activity yet"
                  description="Your timeline appears as you chat, ping, and save memories."
                />
              )}
            </section>
          ) : null}
        </div>

        {activeTab === 'messages' ? <ChatInput onSend={handleSendMessage} /> : null}

        <Tabs items={tabItems} activeTab={activeTab} onChange={setActiveTab} className="app-bottom-nav" />
      </section>
    </main>
  )
}

export default MainChatAppPage
