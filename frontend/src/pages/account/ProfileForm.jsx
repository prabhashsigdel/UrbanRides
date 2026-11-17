import { useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../../auth/AuthContext";
import { authClient, authErrorMessage } from "../../auth/authClient";

const MAX_NAME_LENGTH = 60;

/** Name is the only profile field people can change here. Changing email needs a verification email first. */
export default function ProfileForm() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const trimmed = name.trim();
  const isUnchanged = trimmed === (user?.name ?? "");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!trimmed) return setError("Enter your name.");
    if (trimmed.length > MAX_NAME_LENGTH) return setError(`Keep it under ${MAX_NAME_LENGTH} characters.`);

    setIsSaving(true);
    const { error: saveError } = await authClient.updateUser({ name: trimmed });
    setIsSaving(false);
    if (saveError) return toast.error(authErrorMessage(saveError, "Couldn’t save your name."));
    await refresh();
    setName(trimmed);
    toast.success("Profile saved.");
  };

  return (
    <form id="profile" className="panel account-section" onSubmit={handleSubmit} noValidate>
      <div>
        <h2>Profile</h2>
        <p className="account-note">This is the name we use on your bookings.</p>
      </div>
      <div className="field">
        <label className="field-label" htmlFor="account-name">Name</label>
        <input
          id="account-name"
          className="input"
          autoComplete="name"
          value={name}
          maxLength={MAX_NAME_LENGTH + 10}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "account-name-error" : undefined}
        />
        {error && <span className="field-error" id="account-name-error">{error}</span>}
      </div>
      <div className="field">
        <span className="field-label">Email</span>
        <p className="account-readonly">{user?.email}</p>
      </div>
      <div className="account-actions">
        <button type="submit" className="btn btn-primary" disabled={isSaving || isUnchanged}>
          {isSaving ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}
