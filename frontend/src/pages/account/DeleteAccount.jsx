import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../../auth/AuthContext";
import { authClient, authErrorMessage } from "../../auth/authClient";
import PasswordField from "./PasswordField";

/** Better Auth codes for a refused deletion, in the words a person needs to fix it. */
function deleteErrorMessage(error) {
  if (error?.code === "SESSION_EXPIRED") return "For your security, log out and back in, then try again.";
  if (error?.code === "INVALID_PASSWORD") return "That password isn’t right.";
  return authErrorMessage(error, "Couldn’t delete your account. Please try again.");
}

/**
 * Two steps: open the confirmation, then confirm with the password (or, for Google-only accounts,
 * a recent sign-in, which Better Auth checks).
 */
export default function DeleteAccount({ hasPassword }) {
  const { isAdmin, refresh } = useAuth();
  const navigate = useNavigate();
  const [isConfirming, setIsConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const cancel = () => {
    setIsConfirming(false);
    setPassword("");
    setError("");
  };

  const handleDelete = async (event) => {
    event.preventDefault();
    if (hasPassword && !password) return setError("Enter your password to confirm.");

    setIsDeleting(true);
    const { error: deleteError } = await authClient.deleteUser(hasPassword ? { password } : {});
    if (deleteError) {
      setIsDeleting(false);
      return setError(deleteErrorMessage(deleteError));
    }
    await refresh();
    toast.success("Your account has been deleted.");
    navigate("/", { replace: true });
  };

  return (
    <section id="delete" className="panel account-section account-danger" aria-labelledby="delete-heading">
      <div>
        <h2 id="delete-heading">Delete account</h2>
        <p className="account-note">
          {isAdmin
            ? "Removes your account and admin access for good. The fleet and other people’s bookings stay."
            : "Removes your account and all your bookings for good. This can’t be undone."}
        </p>
      </div>

      {isConfirming ? (
        <form className="account-confirm" onSubmit={handleDelete} noValidate>
          {hasPassword ? (
            <PasswordField
              id="account-delete-password"
              label="Your password"
              autoComplete="current-password"
              value={password}
              onChange={(value) => {
                setPassword(value);
                setError("");
              }}
              error={error}
            />
          ) : (
            <>
              <p className="account-note">You’ll be signed out straight away.</p>
              {error && <p className="field-error" role="alert">{error}</p>}
            </>
          )}
          <div className="account-actions">
            <button type="button" className="btn btn-ghost" onClick={cancel} disabled={isDeleting}>
              Keep my account
            </button>
            <button type="submit" className="btn btn-danger" disabled={isDeleting}>
              {isDeleting ? "Deleting…" : "Delete for good"}
            </button>
          </div>
        </form>
      ) : (
        <div className="account-actions">
          <button type="button" className="btn btn-danger" onClick={() => setIsConfirming(true)}>
            Delete my account
          </button>
        </div>
      )}
    </section>
  );
}
