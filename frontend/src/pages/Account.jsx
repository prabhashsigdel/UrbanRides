import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import StateBlock from "../components/StateBlock";
import { useAuth } from "../auth/AuthContext";
import { authClient, authErrorMessage } from "../auth/authClient";
import ProfileForm from "./account/ProfileForm";
import PasswordForm from "./account/PasswordForm";
import DeleteAccount from "./account/DeleteAccount";
import "./account/Account.css";

const PROVIDER_LABELS = { google: "Google", credential: "Email and password" };

export default function Account() {
  const { user } = useAuth();
  const { hash } = useLocation();
  const [providers, setProviders] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setStatus("loading");
    const { data, error: loadError } = await authClient.listAccounts();
    if (loadError) {
      setError(authErrorMessage(loadError, "We couldn’t load your sign-in methods."));
      setStatus("error");
      return;
    }
    setProviders((data ?? []).map((account) => account.providerId));
    setStatus("ready");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // The account menu links to #profile, #security and #delete.
  useEffect(() => {
    if (status !== "ready" || !hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [status, hash]);

  const hasPassword = providers.includes("credential");

  return (
    <main className="page">
      <div className="container account-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Account</h1>
            <p className="page-lede">{user?.email}</p>
          </div>
        </div>

        {status === "loading" && <p className="loading-text" aria-busy="true">Loading your account…</p>}
        {status === "error" && (
          <StateBlock
            icon={RefreshCw}
            title="Your account didn’t load"
            action={<button type="button" className="btn btn-secondary" onClick={load}>Try again</button>}
          >
            {error}
          </StateBlock>
        )}
        {status === "ready" && (
          <div className="account-sections">
            <ProfileForm />
            <section className="account-methods" aria-labelledby="methods-heading">
              <h2 id="methods-heading">How you sign in</h2>
              <ul>
                {providers.map((p) => <li key={p}>{PROVIDER_LABELS[p] ?? p}</li>)}
              </ul>
            </section>
            <PasswordForm hasPassword={hasPassword} onSaved={load} />
            <DeleteAccount hasPassword={hasPassword} />
          </div>
        )}
      </div>
    </main>
  );
}
