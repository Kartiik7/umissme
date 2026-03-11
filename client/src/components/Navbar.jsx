import { Link } from 'react-router-dom';
import styles from './Navbar.module.css';

function Navbar() {
  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.brand}>
        <span className={styles.heartIcon}>💕</span>
        <span>umissme</span>
      </Link>
      <div className={styles.links}>
        <Link to="/create" className={styles.link}>✨ Create</Link>
        <Link to="/join" className={styles.joinBtn}>
          Join Space 💌
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;
