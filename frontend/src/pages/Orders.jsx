import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { CalendarX2, MapPin, Phone, RefreshCw } from "lucide-react";
import StateBlock from "../components/StateBlock";
import { VehiclePhoto } from "../components/VehicleCard";
import { api, errorMessage } from "../lib/api";
import { formatDate, formatRs, rentalDays, toInputDate, todayInput } from "../lib/format";
import { EASE_OUT, gsap, prefersReducedMotion, useGSAP } from "../lib/motion";
import "./Orders.css";

function BookingRow({ booking, onCancel }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const vehicle = booking.vehicleId;
  const from = toInputDate(booking.pickupDate);
  const to = toInputDate(booking.returnDate);
  const days = rentalDays(from, to);
  const total = vehicle ? days * Number(vehicle.pricePerDay) : null;
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
    <li className="booking-row">
      {vehicle ? <VehiclePhoto vehicle={vehicle} className="booking-thumb" /> : <div className="booking-thumb vehicle-photo" />}
      <div className="booking-main">
        <h3>{vehicle?.model ?? "Vehicle removed from fleet"}</h3>
        <p className="booking-dates tabular">
          {formatDate(booking.pickupDate, { short: true })}, {booking.pickupTime}
          <span aria-hidden="true"> → </span>
          <span className="visually-hidden"> to </span>
          {formatDate(booking.returnDate)}, {booking.returnTime}
        </p>
        <ul className="booking-facts">
          <li>
            <MapPin size={16} aria-hidden="true" />
            {sameLocation ? booking.pickupLocation : `${booking.pickupLocation} → ${booking.returnLocation}`}
          </li>
          <li className="tabular">
            <Phone size={16} aria-hidden="true" />
            {booking.phoneNumber}
          </li>
        </ul>
      </div>
      <div className="booking-side">
        {total !== null && (
          <p className="booking-total tabular">
            <strong>{formatRs(total)}</strong>
            <span>{days} {days === 1 ? "day" : "days"}</span>
          </p>
        )}
        {isConfirming ? (
          <div className="confirm-cancel" role="group" aria-label="Confirm cancellation">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsConfirming(false)} disabled={isCancelling}>
              Keep
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={handleCancel} disabled={isCancelling}>
              {isCancelling ? "Cancelling…" : "Yes, cancel"}
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsConfirming(true)}>
            Cancel booking
          </button>
        )}
      </div>
    </li>
  );
}

export default function Orders() {
  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const listRef = useRef(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const { data } = await api.get("/api/bookings");
      setBookings(Array.isArray(data) ? data : []);
      setStatus("ready");
    } catch (err) {
      setError(errorMessage(err, "We couldn’t load your bookings."));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useGSAP(
    () => {
      if (status !== "ready" || prefersReducedMotion()) return;
      gsap.from(".booking-row", { y: 14, opacity: 0, duration: 0.6, ease: EASE_OUT, stagger: 0.05, clearProps: "transform,opacity" });
    },
    { dependencies: [status], scope: listRef },
  );

  const { upcoming, past } = useMemo(() => {
    const today = todayInput();
    const sorted = [...bookings].sort((a, b) => new Date(a.pickupDate) - new Date(b.pickupDate));
    return {
      upcoming: sorted.filter((b) => toInputDate(b.returnDate) >= today),
      past: sorted.filter((b) => toInputDate(b.returnDate) < today).reverse(),
    };
  }, [bookings]);

  const cancelBooking = async (id) => {
    try {
      await api.delete(`/api/bookings/${id}`);
      setBookings((prev) => prev.filter((b) => b._id !== id));
      toast.success("Booking cancelled.");
      return true;
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't cancel this booking. Please try again."));
      return false;
    }
  };

  return (
    <main className="page">
      <div className="container orders" ref={listRef}>
        <div className="page-header">
          <h1 className="page-title">My bookings</h1>
          <Link to="/vehicles" className="btn btn-secondary btn-sm">Book another vehicle</Link>
        </div>

        {status === "loading" && <p className="loading-text" aria-busy="true">Loading your bookings…</p>}

        {status === "error" && (
          <StateBlock
            icon={RefreshCw}
            title="Bookings didn’t load"
            action={<button type="button" className="btn btn-secondary" onClick={load}>Try again</button>}
          >
            {error}
          </StateBlock>
        )}

        {status === "ready" && bookings.length === 0 && (
          <StateBlock
            icon={CalendarX2}
            title="No bookings yet"
            action={<Link to="/vehicles" className="btn btn-primary">Find a vehicle</Link>}
          >
            When you book a car or bike, it shows up here.
          </StateBlock>
        )}

        {status === "ready" && upcoming.length > 0 && (
          <section aria-labelledby="upcoming-heading" className="orders-group">
            <h2 id="upcoming-heading">Upcoming</h2>
            <ul className="booking-list">
              {upcoming.map((b) => <BookingRow key={b._id} booking={b} onCancel={cancelBooking} />)}
            </ul>
          </section>
        )}

        {status === "ready" && past.length > 0 && (
          <section aria-labelledby="past-heading" className="orders-group">
            <h2 id="past-heading">Past</h2>
            <ul className="booking-list">
              {past.map((b) => <BookingRow key={b._id} booking={b} onCancel={cancelBooking} />)}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
