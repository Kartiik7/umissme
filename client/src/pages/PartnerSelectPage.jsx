import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { identifySpaceUser } from '../services/api';
import { getSavedSpaceSession, saveSenderName } from '../services/session';
import styles from './PartnerSelectPage.module.css';

function PartnerSelectPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const space = state?.space || getSavedSpaceSession();
  const options = [space?.friendOneName, space?.friendTwoName].filter(Boolean);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Select Identity - Pinglet';
  }, []);

  useEffect(() => {
    if (!space) {
      navigate('/join', { replace: true });
    }
  }, [space, navigate]);

  if (!space) {
    return null;
  }

  const handleContinue = async () => {
    if (!selected) return;

    setError('');
    setLoading(true);

    try {
      saveSenderName(selected);
      await identifySpaceUser(space._id, selected);
      navigate(`/messages/${space._id}`, { state: { space } });
    } catch (err) {
      setError(err.message || 'Unable to verify your access for this space');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <div className={styles.emoji}>@</div>
        <h2 className={styles.title}>Who are you?</h2>
        <p className={styles.subtitle}>
          Select your name to enter Pinglet space <strong>{space.spaceName}</strong>
        </p>
        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.options}>
          <select
            className={styles.option}
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Select your name</option>
            {options.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <button
          className={styles.continueBtn}
          onClick={handleContinue}
          disabled={!selected || loading}
        >
          {loading ? 'Entering...' : selected ? `Continue as ${selected} ->` : 'Select your name'}
        </button>
      </div>
    </main>
  );
}

export default PartnerSelectPage;
