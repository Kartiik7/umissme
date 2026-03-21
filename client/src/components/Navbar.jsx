import { Link } from 'react-router-dom';
import Logo from './Logo';
import styles from './Navbar.module.css';
import { getSavedSpaceId, hasActiveSession } from '../services/session';

function Navbar() {
  const activeSession = hasActiveSession();
  const savedSpaceId = getSavedSpaceId();

  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.brand}>
        <Logo size="small" />
      </Link>
      <div className={styles.links}>
        <Link to="/" className={styles.link}>Home</Link>
        {activeSession && savedSpaceId ? (
          <Link to={`/messages/${savedSpaceId}`} className={styles.link}>Messages</Link>
        ) : (
          <Link to="/create" className={styles.link}>Create</Link>
        )}
        <Link to="/join" className={styles.joinBtn}>
          Join
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;
