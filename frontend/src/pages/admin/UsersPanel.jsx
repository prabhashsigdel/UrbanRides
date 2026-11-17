import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, Users } from "lucide-react";
import StateBlock from "../../components/StateBlock";
import { useAuth } from "../../auth/AuthContext";
import { authClient, authErrorMessage, hasAdminRole } from "../../auth/authClient";
import { api } from "../../lib/api";
import UserRow from "./UserRow";
import "./Users.css";

const MAX_USERS = 200;
const FILTERS = [
  { value: "all", label: "All", test: () => true },
  { value: "admins", label: "Admins", test: hasAdminRole },
  { value: "flagged", label: "Flagged", test: (u) => Boolean(u.flagReason) },
  { value: "banned", label: "Banned", test: (u) => Boolean(u.banned) },
];

export default function UsersPanel({ onChange }) {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [bookingCounts, setBookingCounts] = useState({});
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    setStatus("loading");
    const [list, counts] = await Promise.all([
      authClient.admin.listUsers({ query: { limit: MAX_USERS, sortBy: "createdAt", sortDirection: "desc" } }),
      // Counts are a nice-to-have; the list still works without them.
      api.get("/api/admin/users/booking-counts").then((r) => r.data).catch(() => ({})),
    ]);
    if (list.error) {
      setError(authErrorMessage(list.error, "We couldn’t load users."));
      setStatus("error");
      return;
    }
    setUsers(list.data?.users ?? []);
    setTotal(list.data?.total ?? 0);
    setBookingCounts(counts);
    setStatus("ready");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const { test } = FILTERS.find((f) => f.value === filter);
    return users.filter((u) => test(u) && (!q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)));
  }, [users, query, filter]);

  const updateUser = (updated) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    onChange?.();
  };

  if (status === "loading") return <p className="loading-text" aria-busy="true">Loading users…</p>;
  if (status === "error") {
    return (
      <StateBlock
        icon={RefreshCw}
        title="Users didn’t load"
        action={<button type="button" className="btn btn-secondary" onClick={load}>Try again</button>}
      >
        {error}
      </StateBlock>
    );
  }

  return (
    <section aria-label="Users">
      <div className="admin-toolbar">
        <label className="admin-search">
          <Search size={16} aria-hidden="true" />
          <span className="visually-hidden">Search users</span>
          <input className="input" type="search" placeholder="Search by name or email" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <div className="chip-group" role="group" aria-label="Show users">
          {FILTERS.map((f) => (
            <button key={f.value} type="button" className="chip" aria-pressed={filter === f.value} onClick={() => setFilter(f.value)}>
              {f.label}
              {f.value !== "all" && <span className="chip-count tabular">{users.filter(f.test).length}</span>}
            </button>
          ))}
        </div>
      </div>
      <p className="admin-count tabular users-total">
        {total > users.length ? `Showing the newest ${users.length} of ${total} users` : `${total} ${total === 1 ? "user" : "users"}`}
      </p>

      {shown.length === 0 ? (
        <StateBlock icon={Users} title={filter === "all" ? "No users match" : `No ${FILTERS.find((f) => f.value === filter).label.toLowerCase()} users`}>
          {query ? "Try a different name or email." : "Nobody fits this filter right now."}
        </StateBlock>
      ) : (
        <ul className="admin-rows">
          {shown.map((u) => (
            <UserRow key={u.id} user={u} bookings={bookingCounts[u.id] ?? 0} isSelf={u.id === me?.id} onUpdate={updateUser} />
          ))}
        </ul>
      )}
    </section>
  );
}
