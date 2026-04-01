import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import EntryCardLayout from '../components/EntryCardLayout'
import { identifySpaceUser } from '../services/api'

const identities = ['Me', 'You', 'Sunshine', 'Moon']

function IdentitySelectionPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [selectedIdentity, setSelectedIdentity] = useState('')
  const [customIdentity, setCustomIdentity] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const payload = useMemo(() => {
    return location.state || {}
  }, [location.state])

  const space = payload.space || null

  const identityOptions = useMemo(() => {
    if (space?.friendOneName && space?.friendTwoName) {
      return [space.friendOneName, space.friendTwoName]
    }

    return identities
  }, [space])

  useEffect(() => {
    if (!selectedIdentity && identityOptions.length) {
      setSelectedIdentity(identityOptions[0])
    }
  }, [identityOptions, selectedIdentity])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const selectedName = (customIdentity.trim() || selectedIdentity || identityOptions[0] || '').trim()

    if (!selectedName) {
      setError('Please choose your identity to continue.')
      return
    }

    if (!space?._id) {
      setError('Please create or join a space first.')
      return
    }

    setLoading(true)
    setError('')

    try {
      await identifySpaceUser(space._id, selectedName)
      localStorage.setItem('pinglet_identity', selectedName)
      localStorage.setItem('pinglet_space', JSON.stringify(space))

      navigate('/app', {
        state: {
          ...payload,
          identity: selectedName,
        },
      })
    } catch (submitError) {
      setError(submitError.message || 'Could not verify identity. Please retry.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <EntryCardLayout
      title="Choose your identity"
      subtitle="This is how your messages will appear inside Pinglet."
      footerText="Want to change invite details?"
      footerLink={payload.mode === 'join' ? '/join' : '/create'}
      footerLinkText="Go back"
    >
      <form className="entry-form" onSubmit={handleSubmit}>
        {error ? <p className="inline-error">{error}</p> : null}

        <label>Pick one</label>
        <div className="identity-options">
          {identityOptions.map((identity) => (
            <button
              key={identity}
              type="button"
              className={`identity-pill ${selectedIdentity === identity ? 'active' : ''}`.trim()}
              onClick={() => setSelectedIdentity(identity)}
            >
              {identity}
            </button>
          ))}
        </div>

        <label htmlFor="customIdentity">Or set custom name (must match space member)</label>
        <input
          id="customIdentity"
          type="text"
          placeholder="Your name"
          value={customIdentity}
          onChange={(event) => setCustomIdentity(event.target.value)}
        />

        <Button type="submit" disabled={loading}>
          {loading ? 'Entering...' : 'Enter Pinglet'}
        </Button>
      </form>
    </EntryCardLayout>
  )
}

export default IdentitySelectionPage
