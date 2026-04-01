import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import EntryCardLayout from '../components/EntryCardLayout'
import { createSpace } from '../services/api'

function CreateSpacePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    spaceName: '',
    friendOneName: '',
    friendTwoName: '',
    accessCode: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onChange = (field) => (event) => {
    setForm((previous) => ({
      ...previous,
      [field]: event.target.value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const space = await createSpace({
        spaceName: form.spaceName.trim(),
        friendOneName: form.friendOneName.trim(),
        friendTwoName: form.friendTwoName.trim(),
        accessCode: form.accessCode.trim(),
      })

      navigate('/identity', {
        state: {
          mode: 'create',
          space,
        },
      })
    } catch (submitError) {
      setError(submitError.message || 'Could not create space. Please retry.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <EntryCardLayout
      title="Create your space"
      subtitle="Set up a private room for you and one person."
      footerText="Already have a code?"
      footerLink="/join"
      footerLinkText="Join here"
    >
      <form className="entry-form" onSubmit={handleSubmit}>
        {error ? <p className="inline-error">{error}</p> : null}

        <label htmlFor="spaceName">Space name</label>
        <input
          id="spaceName"
          type="text"
          placeholder="e.g. us"
          value={form.spaceName}
          onChange={onChange('spaceName')}
          required
        />
        <label htmlFor="friendOneName">Your name</label>
        <input
          id="friendOneName"
          type="text"
          placeholder="e.g. Kartik"
          value={form.friendOneName}
          onChange={onChange('friendOneName')}
          required
        />
        <label htmlFor="friendTwoName">Friend name</label>
        <input
          id="friendTwoName"
          type="text"
          placeholder="e.g. Abhi"
          value={form.friendTwoName}
          onChange={onChange('friendTwoName')}
          required
        />
        <label htmlFor="accessCode">6-digit access code</label>
        <input
          id="accessCode"
          type="text"
          placeholder="e.g. 123456"
          value={form.accessCode}
          onChange={onChange('accessCode')}
          minLength={6}
          maxLength={6}
          pattern="[0-9]{6}"
          required
        />
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Continue'}
        </Button>
      </form>
    </EntryCardLayout>
  )
}

export default CreateSpacePage
