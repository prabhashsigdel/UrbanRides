import express from 'express';
import mongoose from 'mongoose';
import Booking from '../Models/Booking.js';
import { requireAdmin, requireAuth } from '../Middlewares/Auth.js';
import { adminStats } from '../lib/adminStats.js';

// Users, roles and bans go through Better Auth's admin endpoints (/api/auth/admin/*).
// This router covers what Better Auth doesn't know about: bookings and fleet numbers.

const MAX_BOOKINGS = 500;
const MAX_FLAG_REASON = 300;

const users = () => mongoose.connection.db.collection('user');

/** Name, email and any admin flag for each Better Auth user id, read from its "user" collection. */
async function customersById(userIds) {
  const ids = [...new Set(userIds)].filter((id) => mongoose.isValidObjectId(id)).map((id) => new mongoose.Types.ObjectId(id));
  const found = await users().find({ _id: { $in: ids } }, { projection: { name: 1, email: 1, flagReason: 1 } }).toArray();
  return new Map(found.map((u) => [String(u._id), { name: u.name, email: u.email, flagReason: u.flagReason ?? null }]));
}

export default function adminRouter(auth) {
  const router = express.Router();
  router.use(requireAuth(auth), requireAdmin);

  router.get('/bookings', async (req, res) => {
    try {
      const bookings = await Booking.find()
        .sort({ pickupDate: -1 })
        .limit(MAX_BOOKINGS)
        .populate('vehicleId')
        .lean();
      const customers = await customersById(bookings.map((b) => b.userId));
      res.status(200).json(bookings.map((b) => ({ ...b, customer: customers.get(b.userId) ?? null })));
    } catch (error) {
      console.error('Error loading all bookings:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.delete('/bookings/:id', async (req, res) => {
    try {
      const booking = mongoose.isValidObjectId(req.params.id) ? await Booking.findByIdAndDelete(req.params.id) : null;
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      res.status(200).json({ message: 'Booking cancelled' });
    } catch (error) {
      console.error('Error cancelling booking:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // How many bookings each customer has, for the Users tab: { [userId]: count }.
  router.get('/users/booking-counts', async (req, res) => {
    try {
      const counts = await Booking.aggregate([{ $group: { _id: '$userId', count: { $sum: 1 } } }]);
      res.status(200).json(Object.fromEntries(counts.map((c) => [c._id, c.count])));
    } catch (error) {
      console.error('Error counting bookings per user:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  // Flags are private notes for admins (late returns, damage, no-shows). They don't block anything;
  // banning does that. The note shows next to the customer in Users and Bookings.
  router.put('/users/:id/flag', async (req, res) => {
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    if (!reason) return res.status(400).json({ message: 'Say why you’re flagging this account.' });
    if (reason.length > MAX_FLAG_REASON) return res.status(400).json({ message: `Keep the reason under ${MAX_FLAG_REASON} characters.` });
    if (req.params.id === req.user.id) return res.status(400).json({ message: "You can't flag your own account." });
    try {
      const result = mongoose.isValidObjectId(req.params.id)
        ? await users().updateOne({ _id: new mongoose.Types.ObjectId(req.params.id) }, { $set: { flagReason: reason, flaggedAt: new Date() } })
        : { matchedCount: 0 };
      if (result.matchedCount === 0) return res.status(404).json({ message: 'User not found' });
      res.status(200).json({ flagReason: reason });
    } catch (error) {
      console.error('Error flagging user:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.delete('/users/:id/flag', async (req, res) => {
    try {
      const result = mongoose.isValidObjectId(req.params.id)
        ? await users().updateOne({ _id: new mongoose.Types.ObjectId(req.params.id) }, { $unset: { flagReason: '', flaggedAt: '' } })
        : { matchedCount: 0 };
      if (result.matchedCount === 0) return res.status(404).json({ message: 'User not found' });
      res.status(200).json({ message: 'Flag removed' });
    } catch (error) {
      console.error('Error removing flag:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.get('/stats', async (req, res) => {
    try {
      res.status(200).json(await adminStats());
    } catch (error) {
      console.error('Error loading stats:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  return router;
}
