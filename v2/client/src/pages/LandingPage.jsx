import { Link } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'

function LandingPage() {
  return (
    <main className="landing-screen">
      <section className="landing-hero">
        <p className="overline">Private for two</p>
        <h1>Pinglet</h1>
        <p className="landing-tagline">Your private space to chat, ping, and share memories</p>
        <p className="landing-description">
          Built for close connections: simple messaging, instant pings, shared memories,
          and a timeline that keeps every moment in one place.
        </p>
        <div className="hero-actions">
          <Link to="/create">
            <Button>Create Space</Button>
          </Link>
          <Link to="/join">
            <Button variant="ghost">Join Space</Button>
          </Link>
        </div>
      </section>

      <section className="landing-section">
        <h2>Features</h2>
        <div className="feature-grid">
          <Card className="feature-card">
            <p className="feature-icon" role="img" aria-label="messages">
              💬
            </p>
            <h3>Messages</h3>
            <p>Natural chat flow with read states, timestamps, and smooth conversation UI.</p>
          </Card>
          <Card className="feature-card">
            <p className="feature-icon" role="img" aria-label="ping">
              👋
            </p>
            <h3>Ping</h3>
            <p>Send one-tap pings when words are too much and presence is enough.</p>
          </Card>
          <Card className="feature-card">
            <p className="feature-icon" role="img" aria-label="memories">
              📸
            </p>
            <h3>Memories</h3>
            <p>Save moments together and revisit the small stories that matter.</p>
          </Card>
        </div>
      </section>

      <section className="landing-section how-it-works">
        <h2>How it works</h2>
        <div className="steps-grid">
          <Card className="step-card">
            <span>1</span>
            <p>Create your private space</p>
          </Card>
          <Card className="step-card">
            <span>2</span>
            <p>Invite your person with a code</p>
          </Card>
          <Card className="step-card">
            <span>3</span>
            <p>Chat, ping, and build memories</p>
          </Card>
        </div>
      </section>
    </main>
  )
}

export default LandingPage
