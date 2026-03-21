import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSpace } from '../services/api';
import { saveSpaceSession } from '../services/session';
import styles from './FormPage.module.css';

function CreateSpacePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    spaceName: '',
    friendOneName: '',
    friendTwoName: '',
    accessCode: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Create Space - Pinglet';
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
      const space = await createSpace({
        ...form,
        spaceName: form.spaceName.trim().replace(/\s+/g, ' '),
      });
      saveSpaceSession(space);
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
        <div className={styles.cardEmoji}>+</div>
        <h2>Create Space</h2>
        <p className={styles.subtitle}>Create your private Pinglet space for two friends. Use a 6-digit access code.</p>
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

        <label>Friend One Name</label>
        <input
          type="text"
          name="friendOneName"
          placeholder="e.g. Alex"
          value={form.friendOneName}
          onChange={handleChange}
          required
          maxLength={50}
        />

        <label>Friend Two Name</label>
        <input
          type="text"
          name="friendTwoName"
          placeholder="e.g. Sam"
          value={form.friendTwoName}
          onChange={handleChange}
          required
          maxLength={50}
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

        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Space'}
        </button>
      </form>
    </main>
  );
}

export default CreateSpacePage;
