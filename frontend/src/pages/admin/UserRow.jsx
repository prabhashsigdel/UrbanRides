import { useState } from "react";
import { toast } from "react-toastify";
import { Ban, Flag, FlagOff, LogOut, ShieldCheck, ShieldOff, Undo2 } from "lucide-react";
import { authClient, authErrorMessage, hasAdminRole } from "../../auth/authClient";
import { api, errorMessage } from "../../lib/api";
import { formatDate } from "../../lib/format";
import RowMenu from "./RowMenu";

const DAY_SECONDS = 24 * 60 * 60;
const BAN_LENGTHS = [
  { value: "", label: "Until I lift it" },
  { value: String(DAY_SECONDS), label: "1 day" },
  { value: String(7 * DAY_SECONDS), label: "7 days" },
  { value: String(30 * DAY_SECONDS), label: "30 days" },
];
const MAX_REASON = 300;

/** Inline form for the reason behind a flag or a ban. */
function ReasonForm({ kind, initialReason, onCancel, onSubmit }) {
  const [reason, setReason] = useState(initialReason ?? "");
  const [length, setLength] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const isBan = kind === "ban";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    const ok = await onSubmit(reason.trim(), length ? Number(length) : undefined);
    if (!ok) setIsSaving(false);
  };

  return (
    <form className="user-reason" onSubmit={handleSubmit}>
      <div className="field">
        <label className="field-label" htmlFor={`${kind}-reason`}>
          {isBan ? "Reason for the ban (optional)" : "What happened?"}
        </label>
        <textarea
          id={`${kind}-reason`}
          className="input"
          rows={2}
          maxLength={MAX_REASON}
          required={!isBan}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={isBan ? "e.g. Repeated damage to vehicles" : "e.g. Returned the scooter two days late"}
          autoFocus
        />
        <span className="field-hint">
          {isBan ? "They’re signed out at once and can’t log in." : "Only admins see this. It doesn’t stop them booking."}
        </span>
      </div>
      {isBan && (
        <div className="field">
          <label className="field-label" htmlFor="ban-length">How long</label>
          <select id="ban-length" className="input" value={length} onChange={(e) => setLength(e.target.value)}>
            {BAN_LENGTHS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </div>
      )}
      <div className="user-reason-actions">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={isSaving}>Cancel</button>
        <button type="submit" className={`btn btn-sm ${isBan ? "btn-danger" : "btn-primary"}`} disabled={isSaving || (!isBan && !reason.trim())}>
          {isSaving ? "Saving…" : isBan ? "Ban account" : "Save flag"}
        </button>
      </div>
    </form>
  );
}

export default function UserRow({ user, bookings, isSelf, onUpdate }) {
  const [form, setForm] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const isAdmin = hasAdminRole(user);

  /** Runs one action, shows the outcome, and merges `changes` into the row on success. */
  const run = async (request, successMessage, changes) => {
    setIsBusy(true);
    try {
      const result = await request();
      if (result?.error) throw new Error(authErrorMessage(result.error, "That didn’t work. Please try again."));
      toast.success(successMessage);
      onUpdate({ ...user, ...changes(result?.data) });
      setForm(null);
      return true;
    } catch (err) {
      toast.error(err.isAxiosError ? errorMessage(err) : err.message);
      return false;
    } finally {
      setIsBusy(false);
    }
  };

  const toggleAdmin = () =>
    run(
      () => authClient.admin.setRole({ userId: user.id, role: isAdmin ? "user" : "admin" }),
      isAdmin ? `${user.name} is no longer an admin.` : `${user.name} is now an admin.`,
      () => ({ role: isAdmin ? "user" : "admin" }),
    );

  const saveFlag = (reason) =>
    run(() => api.put(`/api/admin/users/${user.id}/flag`, { reason }), `${user.name} is flagged.`, () => ({ flagReason: reason, flaggedAt: new Date().toISOString() }));

  const clearFlag = () =>
    run(() => api.delete(`/api/admin/users/${user.id}/flag`), "Flag removed.", () => ({ flagReason: null, flaggedAt: null }));

  const ban = (reason, seconds) =>
    run(
      () => authClient.admin.banUser({ userId: user.id, banReason: reason || undefined, banExpiresIn: seconds }),
      `${user.name} is banned and signed out.`,
      (data) => ({ banned: true, banReason: data?.user?.banReason ?? reason, banExpires: data?.user?.banExpires ?? null }),
    );

  const unban = () =>
    run(() => authClient.admin.unbanUser({ userId: user.id }), `${user.name} can log in again.`, () => ({ banned: false, banReason: null, banExpires: null }));

  const signOutEverywhere = () =>
    run(() => authClient.admin.revokeUserSessions({ userId: user.id }), `${user.name} is signed out on every device.`, () => ({}));

  const items = [
    isAdmin
      ? { label: "Remove admin", icon: ShieldOff, onSelect: toggleAdmin }
      : { label: "Make admin", icon: ShieldCheck, onSelect: toggleAdmin },
    user.flagReason
      ? { label: "Edit flag", icon: Flag, onSelect: () => setForm("flag") }
      : { label: "Flag for a past problem", icon: Flag, onSelect: () => setForm("flag") },
    ...(user.flagReason ? [{ label: "Remove flag", icon: FlagOff, onSelect: clearFlag }] : []),
    { label: "Sign out everywhere", icon: LogOut, onSelect: signOutEverywhere },
    user.banned
      ? { label: "Lift ban", icon: Undo2, onSelect: unban }
      : { label: "Ban account", icon: Ban, onSelect: () => setForm("ban"), tone: "danger" },
  ];

  return (
    <li className="user-row" data-banned={Boolean(user.banned)} data-open={form !== null}>
      <div className="user-row-main">
        <div className="admin-row-main">
          <strong>
            {user.name}
            {isSelf && <span className="admin-you"> (you)</span>}
          </strong>
          <span>{user.email}</span>
        </div>
        <div className="user-row-meta tabular">
          <span>{bookings} {bookings === 1 ? "booking" : "bookings"}</span>
          <span>Joined {formatDate(user.createdAt)}</span>
        </div>
        <div className="admin-badges">
          {isAdmin && <span className="badge" data-tone="accent">Admin</span>}
          {user.flagReason && <span className="badge" data-tone="warning">Flagged</span>}
          {user.banned && <span className="badge" data-tone="danger">Banned</span>}
        </div>
        <div className="admin-row-actions">
          {!isSelf && <RowMenu label={`Actions for ${user.name}`} items={items} disabled={isBusy} />}
        </div>
      </div>

      {(user.flagReason || user.banned) && form === null && (
        <ul className="user-notes">
          {user.flagReason && (
            <li data-tone="warning">
              <Flag size={14} aria-hidden="true" />
              <span>
                {user.flagReason}
                {user.flaggedAt && <em> · flagged {formatDate(user.flaggedAt)}</em>}
              </span>
            </li>
          )}
          {user.banned && (
            <li data-tone="danger">
              <Ban size={14} aria-hidden="true" />
              <span>
                {user.banReason || "Banned"}
                <em> · {user.banExpires ? `until ${formatDate(user.banExpires)}` : "until lifted"}</em>
              </span>
            </li>
          )}
        </ul>
      )}

      {form && (
        <ReasonForm
          kind={form}
          initialReason={form === "flag" ? user.flagReason : ""}
          onCancel={() => setForm(null)}
          onSubmit={form === "flag" ? saveFlag : ban}
        />
      )}
    </li>
  );
}
