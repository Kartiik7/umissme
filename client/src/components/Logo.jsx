import '../styles/logo.css';

function Logo({ size = 'small' }) {
  const cls = size === 'large' ? 'logo logo--lg' : 'logo logo--sm';

  return (
    <span className={cls} aria-label="Pinglet">
      <span className="logo__ping">Ping</span>
      <span className="logo__let">let</span>
    </span>
  );
}

export default Logo;
