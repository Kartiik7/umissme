import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSpace } from '../services/api';
import { saveSpaceSession } from '../services/session';
import styles from './FormPage.module.css';

function CreateSpacePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    spaceName: '',
    partnerOneName: '',
    partnerTwoName: '',
    accessCode: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const space = await createSpace(form);
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
        <div className={styles.cardEmoji}>✨</div>
        <h2>Create Your Space</h2>
        <p className={styles.subtitle}>A cozy corner for you two 💕</p>
        {error && <p className={styles.error}>{error}</p>}

        <label>🌟 Space Name</label>
        <input
          type="text"
          name="spaceName"
          placeholder="e.g. kartik-anya"
          value={form.spaceName}
          onChange={handleChange}
          required
          minLength={2}
          maxLength={60}
        />

        <label>👤 Partner One</label>
        <input
          type="text"
          name="partnerOneName"
          placeholder="e.g. Kartik"
          value={form.partnerOneName}
          onChange={handleChange}
          required
          maxLength={50}
        />

        <label>👤 Partner Two</label>
        <input
          type="text"
          name="partnerTwoName"
          placeholder="e.g. Anya"
          value={form.partnerTwoName}
          onChange={handleChange}
          required
          maxLength={50}
        />

        <label>🔐 Secret Code</label>
        <input
          type="password"
          name="accessCode"
          placeholder="Something only you two know"
          value={form.accessCode}
          onChange={handleChange}
          required
          minLength={4}
        />

        <button type="submit" disabled={loading}>
          {loading ? '✨ Creating...' : '🚀 Create Space'}
        </button>
      </form>
    </main>
  );
}

export default CreateSpacePage;
