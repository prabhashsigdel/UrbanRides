import { useMemo } from "react";
import { CalendarClock, RefreshCw } from "lucide-react";
import StateBlock from "../../components/StateBlock";
import AreaChart from "../../components/charts/AreaChart";
import BarChart from "../../components/charts/BarChart";
import "./Overview.css";
import { formatRs, typeLabel } from "../../lib/format";

// Stats arrive as UTC calendar keys ("2026-11", "2026-11-17"), so they're labelled in UTC too.
const monthShort = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const monthLong = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const dayNumber = new Intl.DateTimeFormat("en-GB", { day: "numeric", timeZone: "UTC" });
const dayLong = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const monthName = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" });

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function takingsComparison(thisMonth, lastMonth, lastMonthKey) {
  const name = monthName.format(new Date(`${lastMonthKey}-01T00:00:00Z`));
  const diff = thisMonth - lastMonth;
  if (diff === 0) return `Same as ${name}`;
  return `${formatRs(Math.abs(diff))} ${diff > 0 ? "more" : "less"} than ${name}`;
}

function FleetRow({ label, count, total, tone }) {
  const share = total ? count / total : 0;
  return (
    <li className="fleet-split-row">
      <div className="fleet-split-label">
        <span>{label}</span>
        <strong className="tabular">{count}</strong>
      </div>
      <div className="fleet-split-track" aria-hidden="true">
        <div className="fleet-split-fill" data-tone={tone} style={{ "--share": share }} />
      </div>
    </li>
  );
}

export default function Overview({ stats, status, onRetry, onOpenTab }) {
  const revenue = useMemo(
    () =>
      (stats?.revenueByMonth ?? []).map(({ month, total }) => {
        const date = new Date(`${month}-01T00:00:00Z`);
        return { key: month, label: monthShort.format(date), tooltip: monthLong.format(date), value: total };
      }),
    [stats],
  );
  const bookings = useMemo(
    () =>
      (stats?.bookingsByDay ?? []).map(({ date, count }) => {
        const day = new Date(`${date}T00:00:00Z`);
        return { key: date, label: dayNumber.format(day), tooltip: dayLong.format(day), value: count };
      }),
    [stats],
  );

  if (status === "loading" && !stats) return <p className="loading-text" aria-busy="true">Loading the overview…</p>;
  if (!stats) {
    return (
      <StateBlock
        icon={RefreshCw}
        title="The overview didn’t load"
        action={<button type="button" className="btn btn-secondary" onClick={onRetry}>Try again</button>}
      >
        Check the backend is running, then try again.
      </StateBlock>
    );
  }

  const { fleet } = stats;
  const fleetTotal = fleet.onHire + fleet.available + fleet.unavailable;
  const lastMonthKey = stats.revenueByMonth.at(-2)?.month;
  const bookedFortnight = stats.bookingsByDay.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="overview">
      <dl className="overview-figures">
        <div className="figure figure-lead">
          <dt>Takings this month</dt>
          <dd className="tabular">{formatRs(stats.revenueThisMonth)}</dd>
          {lastMonthKey && <p>{takingsComparison(stats.revenueThisMonth, stats.revenueLastMonth, lastMonthKey)}</p>}
        </div>
        <div className="figure">
          <dt>On the road today</dt>
          <dd className="tabular">{fleet.onHire}</dd>
          <p>of {plural(fleetTotal, "vehicle", "vehicles")}</p>
        </div>
        <div className="figure">
          <dt>Upcoming bookings</dt>
          <dd className="tabular">{stats.upcomingBookings}</dd>
          <p>Picking up after today</p>
        </div>
        <div className="figure">
          <dt>Customers</dt>
          <dd className="tabular">{stats.users}</dd>
          <p>Accounts on the site</p>
        </div>
      </dl>

      <section className="admin-card overview-revenue" aria-labelledby="revenue-heading">
        <header className="admin-card-head">
          <div>
            <h2 id="revenue-heading">Takings by month</h2>
            <p>Booked days times the daily price, by pickup month.</p>
          </div>
        </header>
        <AreaChart data={revenue} formatValue={formatRs} emptyText="No bookings in the last six months yet." />
      </section>

      <section className="admin-card overview-fleet" aria-labelledby="fleet-heading">
        <header className="admin-card-head">
          <div>
            <h2 id="fleet-heading">Fleet today</h2>
            <p>{plural(fleetTotal, "vehicle", "vehicles")} in total</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpenTab("fleet")}>Manage</button>
        </header>
        <ul className="fleet-split">
          <FleetRow label="On hire" count={fleet.onHire} total={fleetTotal} tone="accent" />
          <FleetRow label="Free to book" count={fleet.available} total={fleetTotal} tone="accent" />
          <FleetRow label="Off the road" count={fleet.unavailable} total={fleetTotal} tone="muted" />
        </ul>
      </section>

      <section className="admin-card overview-bookings" aria-labelledby="bookings-heading">
        <header className="admin-card-head">
          <div>
            <h2 id="bookings-heading">New bookings</h2>
            <p>{plural(bookedFortnight, "booking", "bookings")} made in the last 14 days</p>
          </div>
        </header>
        <BarChart data={bookings} formatValue={(n) => plural(n, "booking", "bookings")} emptyText="No bookings made in the last 14 days." />
      </section>

      <section className="admin-card overview-pickups" aria-labelledby="pickups-heading">
        <header className="admin-card-head">
          <div>
            <h2 id="pickups-heading">Next pickups</h2>
            <p>Vehicles going out soonest</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onOpenTab("bookings")}>All bookings</button>
        </header>
        {stats.nextPickups.length === 0 ? (
          <p className="overview-none">
            <CalendarClock size={20} aria-hidden="true" />
            No pickups coming up.
          </p>
        ) : (
          <ol className="pickup-list">
            {stats.nextPickups.map((p) => (
              <li key={p._id}>
                <time className="pickup-date tabular" dateTime={p.pickupDate}>
                  <strong>{dayNumber.format(new Date(p.pickupDate))}</strong>
                  <span>{monthShort.format(new Date(p.pickupDate))}</span>
                </time>
                <div className="pickup-main">
                  <strong>{p.vehicle?.model ?? "Vehicle removed"}</strong>
                  <span>
                    {p.customer ?? "Deleted account"} · {p.pickupLocation}
                  </span>
                </div>
                <span className="pickup-time tabular">
                  {p.pickupTime}
                  {p.vehicle && <span>{typeLabel(p.vehicle.type)}</span>}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
