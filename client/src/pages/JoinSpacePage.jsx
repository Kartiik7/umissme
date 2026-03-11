import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinSpace } from '../services/api';
import { saveSpaceSession } from '../services/session';
import styles from './FormPage.module.css';

function JoinSpacePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ spaceName: '', accessCode: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const space = await joinSpace(form);
      saveSpaceSession(space);
      navigate('/select-partner', { state: { space } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.container}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.cardEmoji}>💌</div>
        <h2>Join Your Space</h2>
        <p className={styles.subtitle}>Enter the space your partner created 🥰</p>
        {error && <p className={styles.error}>{error}</p>}

        <label>🌟 Space Name</label>
        <input
          type="text"
          name="spaceName"
          placeholder="e.g. kartik-anya"
          value={form.spaceName}
          onChange={handleChange}
          required
        />

        <label>🔐 Secret Code</label>
        <input
          type="password"
          name="accessCode"
          placeholder="The secret only you two share"
          value={form.accessCode}
          onChange={handleChange}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? '💫 Entering...' : '💖 Enter Space'}
        </button>
      </form>
    </main>
  );
}

export default JoinSpacePage;
