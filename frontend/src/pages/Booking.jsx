import { useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, SearchX } from "lucide-react";
import { useVehicles } from "../hooks/useVehicles";
import { VehiclePhoto } from "../components/VehicleCard";
import StateBlock from "../components/StateBlock";
import { api, errorMessage } from "../lib/api";
import { addDaysInput, formatDate, formatRs, rentalDays, todayInput, typeLabel } from "../lib/format";
import { EASE_OUT, gsap, prefersReducedMotion, useGSAP } from "../lib/motion";
import "./Booking.css";

const PHONE_PATTERN = /^\+?[\d\s-]{7,16}$/;

function initialForm(params) {
  const from = params.get("from") || "";
  return {
    pickupLocation: "",
    pickupDate: from,
    pickupTime: "10:00",
    sameReturn: true,
    returnLocation: "",
    returnDate: params.get("to") || (from ? addDaysInput(from, 1) : ""),
    returnTime: "10:00",
    phoneNumber: "",
  };
}

function validate(form) {
  const errors = {};
  if (!form.pickupLocation.trim()) errors.pickupLocation = "Enter where you’ll collect the vehicle.";
  if (!form.pickupDate) errors.pickupDate = "Choose a pickup date.";
  if (!form.returnDate) errors.returnDate = "Choose a return date.";
  else if (form.pickupDate && form.returnDate < form.pickupDate) errors.returnDate = "Return can’t be before pickup.";
  if (!form.sameReturn && !form.returnLocation.trim()) errors.returnLocation = "Enter where you’ll return it.";
  if (!PHONE_PATTERN.test(form.phoneNumber.trim())) errors.phoneNumber = "Enter a phone number we can call, e.g. 98XXXXXXXX.";
  return errors;
}

function Field({ id, label, error, hint, children }) {
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <span className="field-error" id={`${id}-error`}>{error}</span>
      ) : (
        hint && <span className="field-hint">{hint}</span>
      )}
    </div>
  );
}

export default function Booking() {
  const { vehicleId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const pageRef = useRef(null);
  const { vehicles, status } = useVehicles();
  const [form, setForm] = useState(() => initialForm(params));
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const vehicle = useMemo(() => vehicles.find((v) => v._id === vehicleId), [vehicles, vehicleId]);
  const days = rentalDays(form.pickupDate, form.returnDate);
  const total = vehicle ? days * Number(vehicle.pricePerDay) : 0;

  useGSAP(
    () => {
      if (!vehicle || prefersReducedMotion()) return;
      gsap.from("[data-reveal]", { y: 16, opacity: 0, duration: 0.7, ease: EASE_OUT, stagger: 0.08, clearProps: "transform,opacity" });
    },
    { dependencies: [Boolean(vehicle)], scope: pageRef },
  );

  const update = (name, value) => {
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "pickupDate" && value && (!prev.returnDate || prev.returnDate < value)) {
        next.returnDate = addDaysInput(value, 1);
      }
      return next;
    });
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      document.getElementById(Object.keys(found)[0])?.focus();
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post("/api/bookings", {
        vehicleId,
        pickupLocation: form.pickupLocation.trim(),
        pickupDate: form.pickupDate,
        pickupTime: form.pickupTime,
        returnLocation: (form.sameReturn ? form.pickupLocation : form.returnLocation).trim(),
        returnDate: form.returnDate,
        returnTime: form.returnTime,
        phoneNumber: form.phoneNumber.trim(),
      });
      toast.success("Booking confirmed. We’ll call you to arrange pickup.");
      navigate("/my-orders");
    } catch (error) {
      toast.error(errorMessage(error, "Your booking didn’t go through. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading") {
    return (
      <main className="page container">
        <div className="booking-loading" aria-busy="true">Loading vehicle…</div>
      </main>
    );
  }

  if (!vehicle) {
    return (
      <main className="page container">
        <StateBlock
          icon={SearchX}
          title="We couldn’t find that vehicle"
          action={<Link to="/vehicles" className="btn btn-secondary">Browse vehicles</Link>}
        >
          It may have been removed from the fleet.
        </StateBlock>
      </main>
    );
  }

  const today = todayInput();
  const fieldProps = (name) => ({
    id: name,
    name,
    value: form[name],
    onChange: (e) => update(name, e.target.value),
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
    className: "input",
  });

  return (
    <main className="page" ref={pageRef}>
      <div className="container">
        <Link to={`/${vehicle.type === "bike" ? "bikes" : "cars"}`} className="back-link">
          <ArrowLeft size={18} aria-hidden="true" /> Back to {vehicle.type === "bike" ? "bikes" : "cars"}
        </Link>

        <div className="booking-layout">
          <form className="booking-form" onSubmit={handleSubmit} noValidate data-reveal>
            <h1 className="page-title">Book {vehicle.model}</h1>
            <p className="page-lede">Fill in your trip details. We’ll call you on this number to confirm pickup.</p>

            <section className="form-section" aria-labelledby="pickup-heading">
              <h2 id="pickup-heading">Pickup</h2>
              <Field id="pickupLocation" label="Location" error={errors.pickupLocation}>
                <input {...fieldProps("pickupLocation")} placeholder="e.g. Thamel, Kathmandu" autoComplete="street-address" />
              </Field>
              <div className="form-row">
                <Field id="pickupDate" label="Date" error={errors.pickupDate}>
                  <input {...fieldProps("pickupDate")} type="date" min={today} />
                </Field>
                <Field id="pickupTime" label="Time">
                  <input {...fieldProps("pickupTime")} type="time" />
                </Field>
              </div>
            </section>

            <section className="form-section" aria-labelledby="return-heading">
              <h2 id="return-heading">Return</h2>
              <label className="check">
                <input
                  type="checkbox"
                  checked={form.sameReturn}
                  onChange={(e) => update("sameReturn", e.target.checked)}
                />
                Return to the pickup location
              </label>
              {!form.sameReturn && (
                <Field id="returnLocation" label="Location" error={errors.returnLocation}>
                  <input {...fieldProps("returnLocation")} placeholder="e.g. Lakeside, Pokhara" />
                </Field>
              )}
              <div className="form-row">
                <Field id="returnDate" label="Date" error={errors.returnDate}>
                  <input {...fieldProps("returnDate")} type="date" min={form.pickupDate || today} />
                </Field>
                <Field id="returnTime" label="Time">
                  <input {...fieldProps("returnTime")} type="time" />
                </Field>
              </div>
            </section>

            <section className="form-section" aria-labelledby="contact-heading">
              <h2 id="contact-heading">Contact</h2>
              <Field id="phoneNumber" label="Phone number" error={errors.phoneNumber}>
                <input {...fieldProps("phoneNumber")} type="tel" inputMode="tel" autoComplete="tel" placeholder="98XXXXXXXX" />
              </Field>
            </section>

            <button type="submit" className="btn btn-primary btn-block booking-submit" disabled={isSubmitting}>
              {isSubmitting ? "Booking…" : days > 0 ? `Book for ${formatRs(total)}` : "Book now"}
            </button>
          </form>

          <aside className="booking-summary" aria-label="Booking summary" data-reveal>
            <div className="summary-card">
              <VehiclePhoto vehicle={vehicle} className="summary-photo" />
              <div className="summary-body">
                <div>
                  <h2>{vehicle.model}</h2>
                  <p className="summary-type">{typeLabel(vehicle.type)}</p>
                </div>
                <dl className="summary-lines tabular">
                  <div>
                    <dt>Price per day</dt>
                    <dd>{formatRs(vehicle.pricePerDay)}</dd>
                  </div>
                  <div>
                    <dt>Dates</dt>
                    <dd>
                      {days > 0
                        ? `${formatDate(form.pickupDate, { short: true })} – ${formatDate(form.returnDate, { short: true })}`
                        : "Not chosen yet"}
                    </dd>
                  </div>
                  <div>
                    <dt>Days</dt>
                    <dd>{days > 0 ? days : "—"}</dd>
                  </div>
                  <div className="summary-total">
                    <dt>Estimated total</dt>
                    <dd>{days > 0 ? formatRs(total) : "—"}</dd>
                  </div>
                </dl>
                <p className="summary-note">Worked out from the daily price. A same-day return counts as one day.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
