import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { CalendarX2, Flag, MapPin, Phone, RefreshCw } from "lucide-react";
import StateBlock from "../../components/StateBlock";
import { api, errorMessage } from "../../lib/api";
import { formatDate, formatRs, rentalDays, toInputDate, todayInput } from "../../lib/format";

const FILTERS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
  { value: "all", label: "All" },
];

function BookingRow({ booking, onCancel }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const vehicle = booking.vehicleId;
  const from = toInputDate(booking.pickupDate);
  const to = toInputDate(booking.returnDate);
  const days = rentalDays(from, to);
  const sameLocation = booking.pickupLocation === booking.returnLocation;

  const handleCancel = async () => {
    setIsCancelling(true);
    const ok = await onCancel(booking._id);
    if (!ok) {
      setIsCancelling(false);
      setIsConfirming(false);
    }
  };

  return (
    <li className="admin-row admin-booking">
      <div className="admin-row-main">
        <strong>{vehicle?.model ?? "Vehicle removed from fleet"}</strong>
        <span className="tabular">
          {formatDate(booking.pickupDate, { short: true })}, {booking.pickupTime} → {formatDate(booking.returnDate)}, {booking.returnTime}
        </span>
        <span className="admin-row-facts">
          <span><MapPin size={14} aria-hidden="true" />{sameLocation ? booking.pickupLocation : `${booking.pickupLocation} → ${booking.returnLocation}`}</span>
          <span className="tabular"><Phone size={14} aria-hidden="true" />{booking.phoneNumber}</span>
        </span>
      </div>
      <div className="admin-row-who">
        <strong>{booking.customer?.name ?? "Deleted account"}</strong>
        {booking.customer?.email && <span>{booking.customer.email}</span>}
        {booking.customer?.flagReason && (
          <span className="booking-flag" title={booking.customer.flagReason}>
            <Flag size={13} aria-hidden="true" /> Flagged: {booking.customer.flagReason}
          </span>
        )}
      </div>
      <div className="admin-row-total tabular">
        {vehicle && <strong>{formatRs(days * Number(vehicle.pricePerDay))}</strong>}
        <span>{days} {days === 1 ? "day" : "days"}</span>
      </div>
      <div className="admin-row-actions">
        {isConfirming ? (
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsConfirming(false)} disabled={isCancelling}>
              Keep
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={handleCancel} disabled={isCancelling}>
              {isCancelling ? "Cancelling…" : "Yes, cancel"}
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsConfirming(true)}>
            Cancel
          </button>
        )}
      </div>
    </li>
  );
}

export default function BookingsPanel({ onChange }) {
  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("upcoming");

  const load = useCallback(async (signal) => {
    setStatus("loading");
    try {
      const { data } = await api.get("/api/admin/bookings", { signal });
      setBookings(Array.isArray(data) ? data : []);
      setStatus("ready");
    } catch (err) {
      if (signal?.aborted) return;
      setError(errorMessage(err, "We couldn’t load bookings."));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const shown = useMemo(() => {
    const today = todayInput();
    const isPast = (b) => toInputDate(b.returnDate) < today;
    if (filter === "upcoming") {
      return bookings.filter((b) => !isPast(b)).sort((a, b) => new Date(a.pickupDate) - new Date(b.pickupDate));
    }
    if (filter === "past") return bookings.filter(isPast);
    return bookings;
  }, [bookings, filter]);

  const cancelBooking = async (id) => {
    try {
      await api.delete(`/api/admin/bookings/${id}`);
      setBookings((prev) => prev.filter((b) => b._id !== id));
      toast.success("Booking cancelled.");
      onChange?.();
      return true;
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't cancel this booking. Please try again."));
      return false;
    }
  };

  if (status === "loading") return <p className="loading-text" aria-busy="true">Loading bookings…</p>;
  if (status === "error") {
    return (
      <StateBlock
        icon={RefreshCw}
        title="Bookings didn’t load"
        action={<button type="button" className="btn btn-secondary" onClick={() => load()}>Try again</button>}
      >
        {error}
      </StateBlock>
    );
  }

  return (
    <section aria-label="All bookings">
      <div className="admin-toolbar">
        <div className="chip-group" role="group" aria-label="Show bookings">
          {FILTERS.map((f) => (
            <button key={f.value} type="button" className="chip" aria-pressed={filter === f.value} onClick={() => setFilter(f.value)}>
              {f.label}
            </button>
          ))}
        </div>
        <span className="admin-count tabular">{shown.length} {shown.length === 1 ? "booking" : "bookings"}</span>
      </div>

      {shown.length === 0 ? (
        <StateBlock icon={CalendarX2} title={filter === "past" ? "No past bookings" : "No bookings to show"}>
          New bookings appear here as soon as customers make them.
        </StateBlock>
      ) : (
        <ul className="admin-rows">
          {shown.map((b) => <BookingRow key={b._id} booking={b} onCancel={cancelBooking} />)}
        </ul>
      )}
    </section>
  );
}
