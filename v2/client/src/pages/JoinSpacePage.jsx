import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import EntryCardLayout from '../components/EntryCardLayout'
import { joinSpace } from '../services/api'

function JoinSpacePage() {
  const navigate = useNavigate()
  const [spaceName, setSpaceName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const space = await joinSpace({
        spaceName: spaceName.trim(),
        accessCode: inviteCode.trim(),
      })

      navigate('/identity', {
        state: {
          mode: 'join',
          space,
        },
      })
    } catch (submitError) {
      setError(submitError.message || 'Could not join space. Please retry.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <EntryCardLayout
      title="Join a space"
      subtitle="Enter your invite code to connect instantly."
      footerText="Need to create one instead?"
      footerLink="/create"
      footerLinkText="Create here"
    >
      <form className="entry-form" onSubmit={handleSubmit}>
        {error ? <p className="inline-error">{error}</p> : null}

        <label htmlFor="spaceName">Space name</label>
        <input
          id="spaceName"
          type="text"
          placeholder="e.g. us"
          value={spaceName}
          onChange={(event) => setSpaceName(event.target.value)}
          required
        />
        <label htmlFor="inviteCode">Invite code</label>
        <input
          id="inviteCode"
          type="text"
          placeholder="123456"
          value={inviteCode}
          onChange={(event) => setInviteCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          minLength={6}
          maxLength={6}
          pattern="[0-9]{6}"
          required
        />
        <Button type="submit" disabled={loading}>
          {loading ? 'Joining...' : 'Continue'}
        </Button>
      </form>
    </EntryCardLayout>
  )
}

export default JoinSpacePage
