import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { CalendarCheck, ChevronDown, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import ThemeToggle from "./ThemeToggle";
import { gsap, prefersReducedMotion } from "../lib/motion";
import "./Navbar.css";

const LINKS = [
  { to: "/cars", label: "Cars" },
  { to: "/bikes", label: "Bikes" },
  { to: "/about-us", label: "About" },
  { to: "/contact-us", label: "Contact" },
];

function useDismiss(ref, isOpen, onClose) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onPointer = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onClose();
    };
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, isOpen, onClose]);
}

function AccountMenu({ onNavigate }) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);
  const close = () => setIsOpen(false);
  useDismiss(rootRef, isOpen, close);

  const label = user?.name || (isAdmin ? "Admin" : "Account");
  const initial = label.charAt(0).toUpperCase();

  const go = () => {
    close();
    onNavigate?.();
  };

  const handleLogout = async () => {
    go();
    await logout();
    navigate("/");
  };

  return (
    <div className="account" ref={rootRef}>
      <button
        type="button"
        className="account-trigger"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="account-avatar" aria-hidden="true">{initial}</span>
        <span className="account-name">{label}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      <div className="account-menu" role="menu" data-open={isOpen}>
        <Link role="menuitem" to="/my-orders" onClick={go}>
          <CalendarCheck size={18} aria-hidden="true" /> My bookings
        </Link>
        {isAdmin && (
          <Link role="menuitem" to="/admin" onClick={go}>
            <LayoutDashboard size={18} aria-hidden="true" /> Manage fleet
          </Link>
        )}
        <button role="menuitem" type="button" onClick={handleLogout}>
          <LogOut size={18} aria-hidden="true" /> Log out
        </button>
      </div>
    </div>
  );
}

export default function Navbar() {
  const { isAuthenticated } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => setIsMenuOpen(false), [location.pathname]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  const closeMenu = () => setIsMenuOpen(false);

  // One shared hover pill that glides between links instead of each link fading on its own.
  const linksRef = useRef(null);
  const highlightRef = useRef(null);
  const isHighlightVisible = useRef(false);

  const moveHighlight = (link) => {
    const pill = highlightRef.current;
    const list = linksRef.current;
    if (!pill || !list) return;
    const listBox = list.getBoundingClientRect();
    const box = link.getBoundingClientRect();
    const target = { x: box.left - listBox.left, width: box.width };
    const instant = prefersReducedMotion();

    if (!isHighlightVisible.current || instant) {
      // Appear in place: no slide in from the previous spot.
      gsap.set(pill, target);
      gsap.to(pill, { opacity: 1, scale: 1, duration: instant ? 0 : 0.2, ease: "power2.out", overwrite: "auto" });
    } else {
      gsap.to(pill, { ...target, opacity: 1, scale: 1, duration: 0.42, ease: "expo.out", overwrite: "auto" });
    }
    isHighlightVisible.current = true;
  };

  const hideHighlight = () => {
    if (!highlightRef.current) return;
    isHighlightVisible.current = false;
    gsap.to(highlightRef.current, { opacity: 0, scale: 0.96, duration: 0.25, ease: "power2.out", overwrite: "auto" });
  };

  return (
    <header className="nav" data-scrolled={isScrolled}>
      <nav className="nav-inner container" aria-label="Main">
        <Link to="/" className="wordmark" aria-label="UrbanRides home">
          Urban<span>Rides</span>
        </Link>

        <ul className="nav-links" ref={linksRef} onMouseLeave={hideHighlight}>
          <li className="nav-highlight" ref={highlightRef} aria-hidden="true" />
          {LINKS.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                className="nav-link"
                onMouseEnter={(e) => moveHighlight(e.currentTarget)}
                onFocus={(e) => moveHighlight(e.currentTarget)}
                onBlur={hideHighlight}
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="nav-actions">
          <ThemeToggle />
          {isAuthenticated ? (
            <AccountMenu />
          ) : (
            <>
              <Link to="/log-in" className="btn btn-ghost btn-sm">Log in</Link>
              <Link to="/sign-up" className="btn btn-primary btn-sm">Sign up</Link>
            </>
          )}
        </div>

        <ThemeToggle className="theme-toggle-mobile" />
        <button
          type="button"
          className="nav-toggle"
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      <div id="mobile-menu" className="mobile-menu" hidden={!isMenuOpen}>
        <ul>
          {LINKS.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} className="mobile-link" onClick={closeMenu}>
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="mobile-actions">
          {isAuthenticated ? (
            <AccountMenu onNavigate={closeMenu} />
          ) : (
            <>
              <Link to="/log-in" className="btn btn-secondary btn-block" onClick={closeMenu}>Log in</Link>
              <Link to="/sign-up" className="btn btn-primary btn-block" onClick={closeMenu}>Sign up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
