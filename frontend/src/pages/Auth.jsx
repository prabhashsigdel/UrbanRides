import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../auth/AuthContext";
import { authClient, authErrorMessage, hasAdminRole, redirectErrorMessage } from "../auth/authClient";
import { EASE_OUT, gsap, prefersReducedMotion, useGSAP } from "../lib/motion";
import "./Auth.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

const COPY = {
  login: {
    title: "Log in",
    lede: "Welcome back. Log in to book and manage your rentals.",
    submit: "Log in",
    busy: "Logging in…",
    switchText: "New to UrbanRides?",
    switchLink: { to: "/sign-up", label: "Create an account" },
  },
  signup: {
    title: "Create your account",
    lede: "You’ll need an account to book a vehicle.",
    submit: "Sign up",
    busy: "Creating account…",
    switchText: "Already have an account?",
    switchLink: { to: "/log-in", label: "Log in" },
  },
};

function validate(mode, values) {
  const errors = {};
  if (mode === "signup" && !values.name.trim()) errors.name = "Enter your name.";
  if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = "Enter a valid email address.";
  if (mode === "signup" && values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (mode === "login" && !values.password) errors.password = "Enter your password.";
  return errors;
}

/** Shared login / signup page. */
export default function Auth({ mode }) {
  const copy = COPY[mode];
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh } = useAuth();
  const cardRef = useRef(null);
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const from = location.state?.from;
  const redirectError = redirectErrorMessage(new URLSearchParams(location.search).get("error"));

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(cardRef.current, { y: 20, opacity: 0, duration: 0.7, ease: EASE_OUT, clearProps: "transform,opacity" });
    },
    { dependencies: [mode], scope: cardRef, revertOnUpdate: true },
  );

  const update = (name) => (event) => {
    setValues((prev) => ({ ...prev, [name]: event.target.value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validate(mode, values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      document.getElementById(`auth-${Object.keys(found)[0]}`)?.focus();
      return;
    }
    setIsSubmitting(true);
    const email = values.email.trim().toLowerCase();
    // Signing up also signs you in, so both paths end with a session.
    const { data, error } =
      mode === "signup"
        ? await authClient.signUp.email({ name: values.name.trim(), email, password: values.password })
        : await authClient.signIn.email({ email, password: values.password });
    setIsSubmitting(false);

    if (error) {
      toast.error(authErrorMessage(error, mode === "signup" ? "We couldn’t create your account." : "Email or password is incorrect."));
      return;
    }
    await refresh();
    const name = data?.user?.name;
    toast.success(mode === "signup" ? "Account created. You’re logged in." : `Welcome${name ? `, ${name}` : ""}.`);
    navigate(from || (hasAdminRole(data?.user) ? "/admin" : "/"), { replace: true });
  };

  const handleGoogle = async () => {
    setIsRedirecting(true);
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: `${window.location.origin}${from || "/"}`,
      errorCallbackURL: `${window.location.origin}/log-in`,
    });
    // On success the browser is already leaving for Google.
    if (error) {
      setIsRedirecting(false);
      toast.error(authErrorMessage(error, "Google sign-in didn’t start. Please try again."));
    }
  };

  const fieldProps = (name) => ({
    id: `auth-${name}`,
    name,
    value: values[name],
    onChange: update(name),
    className: "input",
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `auth-${name}-error` : undefined,
  });

  return (
    <main className="page auth-page">
      <div className="auth-card" ref={cardRef}>
        <h1 className="page-title">{copy.title}</h1>
        <p className="page-lede">{copy.lede}</p>

        {redirectError && <p className="auth-alert" role="alert">{redirectError}</p>}

        <button
          type="button"
          className="btn btn-secondary btn-block auth-google"
          onClick={handleGoogle}
          disabled={isRedirecting || isSubmitting}
        >
          <GoogleMark />
          {isRedirecting ? "Opening Google…" : "Continue with Google"}
        </button>

        <p className="auth-divider"><span>or use your email</span></p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {mode === "signup" && (
            <div className="field">
              <label className="field-label" htmlFor="auth-name">Name</label>
              <input {...fieldProps("name")} autoComplete="name" autoFocus />
              {errors.name && <span className="field-error" id="auth-name-error">{errors.name}</span>}
            </div>
          )}
          <div className="field">
            <label className="field-label" htmlFor="auth-email">Email</label>
            <input {...fieldProps("email")} type="email" autoComplete="email" autoFocus={mode === "login"} />
            {errors.email && <span className="field-error" id="auth-email-error">{errors.email}</span>}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="auth-password">Password</label>
            <input
              {...fieldProps("password")}
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
            {errors.password ? (
              <span className="field-error" id="auth-password-error">{errors.password}</span>
            ) : (
              mode === "signup" && <span className="field-hint">At least {MIN_PASSWORD_LENGTH} characters.</span>
            )}
          </div>
          <button type="submit" className="btn btn-primary btn-block auth-submit" disabled={isSubmitting || isRedirecting}>
            {isSubmitting ? copy.busy : copy.submit}
          </button>
        </form>

        <p className="auth-switch">
          {copy.switchText}{" "}
          <Link to={copy.switchLink.to} state={location.state}>{copy.switchLink.label}</Link>
        </p>
      </div>
    </main>
  );
}
