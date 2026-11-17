/** Labelled password input with its error or hint underneath. Shared by the account forms. */
export default function PasswordField({ id, label, value, onChange, error, hint, autoComplete }) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        className="input"
        type="password"
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error ? <span className="field-error" id={`${id}-error`}>{error}</span> : hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}
