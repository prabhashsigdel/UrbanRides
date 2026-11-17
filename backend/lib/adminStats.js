import mongoose from 'mongoose';
import Booking from '../Models/Booking.js';
import Vehicle from '../Models/Vehicle.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const CHART_DAYS = 14;
const CHART_MONTHS = 6;
const NEXT_PICKUPS = 5;

// Booking dates are stored at midnight UTC, so every bucket here is a UTC calendar day or month.
const dayKey = (date) => date.toISOString().slice(0, 10);
const monthKey = (date) => date.toISOString().slice(0, 7);

function startOfTodayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Rental days, matching the frontend: a same-day rental counts as one day. */
function rentalDays(booking) {
  const days = Math.round((new Date(booking.returnDate) - new Date(booking.pickupDate)) / DAY_MS);
  return Math.max(days, 1);
}

/** Estimated takings for a booking: days times the vehicle's current daily price. */
const bookingValue = (booking) => rentalDays(booking) * Number(booking.vehicleId?.pricePerDay ?? 0);

function revenueByMonth(bookings, today) {
  const months = Array.from({ length: CHART_MONTHS }, (_, i) =>
    monthKey(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - (CHART_MONTHS - 1 - i), 1))));
  const totals = new Map(months.map((m) => [m, 0]));
  for (const b of bookings) {
    const key = monthKey(new Date(b.pickupDate));
    if (totals.has(key)) totals.set(key, totals.get(key) + bookingValue(b));
  }
  return months.map((month) => ({ month, total: totals.get(month) }));
}

function bookingsByDay(bookings, today) {
  const days = Array.from({ length: CHART_DAYS }, (_, i) => dayKey(new Date(today - (CHART_DAYS - 1 - i) * DAY_MS)));
  const counts = new Map(days.map((d) => [d, 0]));
  for (const b of bookings) {
    const key = dayKey(new Date(b.createdAt));
    if (counts.has(key)) counts.set(key, counts.get(key) + 1);
  }
  return days.map((date) => ({ date, count: counts.get(date) }));
}

async function nextPickups(today) {
  const upcoming = await Booking.find({ pickupDate: { $gte: today } })
    .sort({ pickupDate: 1, pickupTime: 1 })
    .limit(NEXT_PICKUPS)
    .populate('vehicleId', 'model type')
    .lean();
  const ids = upcoming.map((b) => b.userId).filter((id) => mongoose.isValidObjectId(id)).map((id) => new mongoose.Types.ObjectId(id));
  const users = await mongoose.connection.db.collection('user').find({ _id: { $in: ids } }, { projection: { name: 1 } }).toArray();
  const names = new Map(users.map((u) => [String(u._id), u.name]));
  return upcoming.map((b) => ({
    _id: b._id,
    pickupDate: b.pickupDate,
    pickupTime: b.pickupTime,
    pickupLocation: b.pickupLocation,
    vehicle: b.vehicleId ? { model: b.vehicleId.model, type: b.vehicleId.type } : null,
    customer: names.get(b.userId) ?? null,
  }));
}

/** Everything the admin overview shows, in one round trip. */
export async function adminStats() {
  const today = startOfTodayUtc();
  const chartStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - (CHART_MONTHS - 1), 1));
  const daysStart = new Date(today - (CHART_DAYS - 1) * DAY_MS);

  const [vehicles, users, recent, onHireIds, upcomingBookings, pickups] = await Promise.all([
    Vehicle.find({}, { available: 1 }).lean(),
    mongoose.connection.db.collection('user').countDocuments(),
    Booking.find({ $or: [{ pickupDate: { $gte: chartStart } }, { createdAt: { $gte: daysStart } }] })
      .populate('vehicleId', 'pricePerDay')
      .lean(),
    Booking.distinct('vehicleId', { pickupDate: { $lte: today }, returnDate: { $gte: today } }),
    Booking.countDocuments({ pickupDate: { $gt: today } }),
    nextPickups(today),
  ]);

  const onHire = new Set(onHireIds.map(String));
  const fleet = { onHire: 0, available: 0, unavailable: 0 };
  for (const v of vehicles) {
    if (onHire.has(String(v._id))) fleet.onHire += 1;
    else if (v.available === false) fleet.unavailable += 1;
    else fleet.available += 1;
  }

  const months = revenueByMonth(recent, today);
  return {
    users,
    upcomingBookings,
    fleet,
    revenueThisMonth: months[months.length - 1].total,
    revenueLastMonth: months[months.length - 2].total,
    revenueByMonth: months,
    bookingsByDay: bookingsByDay(recent, today),
    nextPickups: pickups,
  };
}
