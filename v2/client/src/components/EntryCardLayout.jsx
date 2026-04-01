import { Link } from 'react-router-dom'
import Card from './Card'

function EntryCardLayout({ title, subtitle, children, footerText, footerLink, footerLinkText }) {
  return (
    <main className="entry-screen">
      <Card className="entry-card">
        <Link className="brand-chip" to="/">
          Pinglet
        </Link>
        <h1 className="entry-title">{title}</h1>
        <p className="entry-subtitle">{subtitle}</p>
        {children}
        <p className="entry-footer-text">
          {footerText} <Link to={footerLink}>{footerLinkText}</Link>
        </p>
      </Card>
    </main>
  )
}

export default EntryCardLayout
