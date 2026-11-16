/** Centered empty / error message with an optional action. */
export default function StateBlock({ icon: Icon, title, children, action }) {
  return (
    <div className="state-block" role="status">
      {Icon && <Icon size={32} strokeWidth={1.5} aria-hidden="true" />}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
