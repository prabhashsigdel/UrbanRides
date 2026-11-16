const rupees = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** "Rs 3,500" */
export function formatRs(amount) {
  const value = Number(amount);
  return Number.isFinite(value) ? `Rs ${rupees.format(value)}` : "Rs —";
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const shortDateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

export function formatDate(value, { short = false } = {}) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return (short ? shortDateFormat : dateFormat).format(date);
}

/** yyyy-mm-dd for <input type="date">, in local time. */
export function toInputDate(date) {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export function todayInput() {
  return toInputDate(new Date());
}

export function addDaysInput(dateInput, days) {
  const d = new Date(`${dateInput}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toInputDate(d);
}

/** Whole rental days between two yyyy-mm-dd dates; a same-day rental counts as 1. */
export function rentalDays(from, to) {
  if (!from || !to) return 0;
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const diff = Math.round((end - start) / 86_400_000);
  if (Number.isNaN(diff) || diff < 0) return 0;
  return Math.max(diff, 1);
}

export const VEHICLE_TYPES = [
  { value: "car", label: "Cars", singular: "Car" },
  { value: "bike", label: "Bikes", singular: "Bike" },
];

export function typeLabel(type) {
  return VEHICLE_TYPES.find((t) => t.value === type)?.singular ?? "Vehicle";
}
