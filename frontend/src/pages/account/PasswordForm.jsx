import { useState } from "react";
import { toast } from "react-toastify";
import { authClient, authErrorMessage } from "../../auth/authClient";
import { api, errorMessage } from "../../lib/api";
import PasswordField from "./PasswordField";

const MIN_PASSWORD_LENGTH = 8;
const EMPTY = { currentPassword: "", newPassword: "", confirm: "" };

function validate(values, hasPassword) {
  const errors = {};
  if (hasPassword && !values.currentPassword) errors.currentPassword = "Enter your current password.";
  if (values.newPassword.length < MIN_PASSWORD_LENGTH) errors.newPassword = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  else if (values.confirm !== values.newPassword) errors.confirm = "The passwords don’t match.";
  return errors;
}

/** Sets a first password for a Google-only account, or changes an existing one. */
export default function PasswordForm({ hasPassword, onSaved }) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const set = (name) => (value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const savePassword = async () => {
    if (hasPassword) {
      const { error } = await authClient.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        revokeOtherSessions: true,
      });
      if (error) throw new Error(authErrorMessage(error, "Couldn’t change your password."));
      return "Password changed. Other devices have been signed out.";
    }
    try {
      await api.post("/api/account/password", { newPassword: values.newPassword });
    } catch (err) {
      throw new Error(errorMessage(err, "Couldn’t set your password."));
    }
    return "Password set. You can now log in with your email too.";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validate(values, hasPassword);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setIsSaving(true);
    try {
      toast.success(await savePassword());
      setValues(EMPTY);
      onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form id="security" className="panel account-section" onSubmit={handleSubmit} noValidate>
      <div>
        <h2>{hasPassword ? "Change password" : "Set a password"}</h2>
        <p className="account-note">
          {hasPassword
            ? "Changing it signs you out everywhere else."
            : "You sign in with Google. Add a password to also log in with your email."}
        </p>
      </div>
      {hasPassword && (
        <PasswordField
          id="account-current"
          label="Current password"
          autoComplete="current-password"
          value={values.currentPassword}
          onChange={set("currentPassword")}
          error={errors.currentPassword}
        />
      )}
      <PasswordField
        id="account-new"
        label="New password"
        autoComplete="new-password"
        value={values.newPassword}
        onChange={set("newPassword")}
        error={errors.newPassword}
        hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
      />
      <PasswordField
        id="account-confirm"
        label="Confirm new password"
        autoComplete="new-password"
        value={values.confirm}
        onChange={set("confirm")}
        error={errors.confirm}
      />
      <div className="account-actions">
        <button type="submit" className="btn btn-primary" disabled={isSaving}>
          {isSaving ? "Saving…" : hasPassword ? "Change password" : "Set password"}
        </button>
      </div>
    </form>
  );
}
