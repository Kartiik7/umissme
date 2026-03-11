import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { saveSenderName } from '../services/session';
import styles from './PartnerSelectPage.module.css';

function PartnerSelectPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const space = state?.space;
  const [selected, setSelected] = useState('');

  if (!space) {
    navigate('/join', { replace: true });
    return null;
  }

  const handleContinue = () => {
    if (!selected) return;
    saveSenderName(selected);
    navigate(`/messages/${space._id}`, { state: { space } });
  };

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <div className={styles.emoji}>💕</div>
        <h2 className={styles.title}>Who are you?</h2>
        <p className={styles.subtitle}>
          Select your name to enter <strong>{space.spaceName}</strong>
        </p>

        <div className={styles.options}>
          <button
            className={`${styles.option} ${selected === space.partnerOneName ? styles.active : ''}`}
            onClick={() => setSelected(space.partnerOneName)}
            type="button"
          >
            <span className={styles.optionEmoji}>🫶</span>
            <span>{space.partnerOneName}</span>
          </button>

          <button
            className={`${styles.option} ${selected === space.partnerTwoName ? styles.active : ''}`}
            onClick={() => setSelected(space.partnerTwoName)}
            type="button"
          >
            <span className={styles.optionEmoji}>💗</span>
            <span>{space.partnerTwoName}</span>
          </button>
        </div>

        <button
          className={styles.continueBtn}
          onClick={handleContinue}
          disabled={!selected}
        >
          {selected ? `Continue as ${selected} →` : 'Select your name'}
        </button>
      </div>
    </main>
  );
}

export default PartnerSelectPage;
