import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { joinSpace } from '../services/api';
import { saveSenderName, saveSpaceSession } from '../services/session';
import styles from './FormPage.module.css';

function JoinSpacePage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [form, setForm] = useState({ spaceName: '', accessCode: '', userName: '' });
  const [error, setError] = useState(state?.error || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Join Space - Pinglet';
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValue =
      name === 'accessCode'
        ? value.replace(/\D/g, '').slice(0, 6)
        : value;

    setForm((prev) => ({ ...prev, [name]: nextValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!/^\d{6}$/.test(form.accessCode)) {
      setError('Access code must be exactly 6 digits.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        spaceName: form.spaceName.trim().replace(/\s+/g, ' '),
        accessCode: form.accessCode.trim(),
      };
      const space = await joinSpace(payload);
      saveSpaceSession(space);
      saveSenderName(form.userName.trim());
      navigate('/select-identity', { state: { space } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.container}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.cardEmoji}>#</div>
        <h2>Join Space</h2>
        <p className={styles.subtitle}>Enter your Pinglet space name and 6-digit access code.</p>
        {error && <p className={styles.error}>{error}</p>}

        <label>Space Name</label>
        <input
          type="text"
          name="spaceName"
          placeholder="e.g. weekend-plans"
          value={form.spaceName}
          onChange={handleChange}
          required
          minLength={2}
          maxLength={60}
        />

        <label>Access Code (6 digits)</label>
        <input
          type="password"
          name="accessCode"
          placeholder="e.g. 123456"
          value={form.accessCode}
          onChange={handleChange}
          required
          minLength={6}
          maxLength={6}
          inputMode="numeric"
          pattern="[0-9]{6}"
          title="Access code must be exactly 6 digits"
        />

        <label>Your Name</label>
        <input
          type="text"
          name="userName"
          placeholder="Enter your name in this space"
          value={form.userName}
          onChange={handleChange}
          required
          minLength={1}
          maxLength={50}
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Joining...' : 'Join Space'}
        </button>
      </form>
    </main>
  );
}

export default JoinSpacePage;
