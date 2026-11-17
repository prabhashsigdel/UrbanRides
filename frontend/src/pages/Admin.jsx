import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarCheck, CarFront, LayoutDashboard, Plus, Users } from "lucide-react";
import { api } from "../lib/api";
import { EASE_OUT, gsap, prefersReducedMotion, useGSAP } from "../lib/motion";
import Overview from "./admin/Overview";
import FleetPanel from "./admin/FleetPanel";
import BookingsPanel from "./admin/BookingsPanel";
import UsersPanel from "./admin/UsersPanel";
import "./Admin.css";

const todayLabel = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" });

const SECTIONS = [
  { value: "overview", label: "Overview", icon: LayoutDashboard, lede: () => todayLabel.format(new Date()) },
  { value: "bookings", label: "Bookings", icon: CalendarCheck, Panel: BookingsPanel, lede: () => "Every customer booking. Cancel one if plans change." },
  { value: "fleet", label: "Fleet", icon: CarFront, Panel: FleetPanel, lede: () => "Add vehicles, set daily prices and take them off the road." },
  { value: "users", label: "Users", icon: Users, Panel: UsersPanel, lede: () => "Give admin access, or ban an account." },
];

/** Overview numbers. Reloaded whenever a panel changes bookings, vehicles or users. */
function useStats() {
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState("loading");
  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const { data } = await api.get("/api/admin/stats");
      setStats(data);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  return { stats, status, reload: load };
}

/** Sidebar on wide screens, a scrolling row of pills on narrow ones. The marker glides to the active item. */
function SectionNav({ active, onSelect }) {
  const navRef = useRef(null);
  const markerRef = useRef(null);
  const hasPlaced = useRef(false);

  useLayoutEffect(() => {
    const item = navRef.current?.querySelector(`[data-section="${active}"]`);
    const marker = markerRef.current;
    if (!item || !marker) return;
    const target = { x: item.offsetLeft, y: item.offsetTop, width: item.offsetWidth, height: item.offsetHeight };
    if (!hasPlaced.current || prefersReducedMotion()) {
      gsap.set(marker, target);
      hasPlaced.current = true;
    } else {
      gsap.to(marker, { ...target, duration: 0.45, ease: "power3.out", overwrite: true });
    }
    item.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [active]);

  const handleKey = (event) => {
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const index = (SECTIONS.findIndex((s) => s.value === active) + step + SECTIONS.length) % SECTIONS.length;
    onSelect(SECTIONS[index].value);
    navRef.current?.querySelector(`[data-section="${SECTIONS[index].value}"]`)?.focus();
  };

  return (
    <nav className="admin-nav" aria-label="Admin sections">
      <div className="admin-nav-list" ref={navRef} role="tablist" aria-orientation="vertical" onKeyDown={handleKey}>
        <span className="admin-nav-marker" ref={markerRef} aria-hidden="true" />
        {SECTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="tab"
            id={`admin-tab-${value}`}
            data-section={value}
            aria-selected={value === active}
            aria-controls="admin-panel"
            tabIndex={value === active ? 0 : -1}
            onClick={() => onSelect(value)}
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}

export default function Admin() {
  const [searchParams, setSearchParams] = useSearchParams();
  const active = SECTIONS.find((s) => s.value === searchParams.get("tab")) ?? SECTIONS[0];
  const { stats, status, reload } = useStats();
  const { Panel } = active;
  const panelRef = useRef(null);

  const selectSection = useCallback(
    (value) => setSearchParams(value === SECTIONS[0].value ? {} : { tab: value }, { replace: true }),
    [setSearchParams],
  );

  // Each section rises in once when it opens; overview cards follow one after another.
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from(".admin-head, .overview > *, .admin-panel-body > :not(.overview)", {
        y: 14,
        opacity: 0,
        duration: 0.6,
        ease: EASE_OUT,
        stagger: 0.05,
        clearProps: "transform,opacity",
      });
    },
    { dependencies: [active.value, active.value === "overview" && Boolean(stats)], scope: panelRef },
  );

  return (
    <main className="page admin-page">
      <div className="container admin-shell">
        <SectionNav active={active.value} onSelect={selectSection} />

        <div className="admin-main" ref={panelRef}>
          <header className="admin-head">
            <div>
              <h1 className="page-title">{active.label}</h1>
              <p className="page-lede">{active.lede()}</p>
            </div>
            {active.value === "overview" && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => selectSection("fleet")}>
                <Plus size={16} aria-hidden="true" /> Add a vehicle
              </button>
            )}
          </header>

          <div id="admin-panel" role="tabpanel" aria-labelledby={`admin-tab-${active.value}`} className="admin-panel-body">
            {Panel ? (
              <Panel onChange={reload} />
            ) : (
              <Overview stats={stats} status={status} onRetry={reload} onOpenTab={selectSection} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
