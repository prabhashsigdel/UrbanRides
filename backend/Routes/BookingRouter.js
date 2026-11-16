import express from 'express';
import mongoose from 'mongoose';
import { body, validationResult } from 'express-validator';
import Booking from '../Models/Booking.js';
import Vehicle from '../Models/Vehicle.js';
import { requireAuth } from '../Middlewares/Auth.js';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const PHONE_PATTERN = /^\+?[\d\s-]{7,16}$/;

const bookingValidation = [
  body('vehicleId').custom((id) => mongoose.isValidObjectId(id)).withMessage('Choose a vehicle to book'),
  body('pickupLocation').isString().trim().notEmpty().withMessage('Pickup location is required'),
  body('returnLocation').isString().trim().notEmpty().withMessage('Return location is required'),
  body('pickupDate').isISO8601().withMessage('Pickup date is invalid'),
  body('returnDate')
    .isISO8601().withMessage('Return date is invalid')
    .custom((value, { req }) => new Date(value) >= new Date(req.body.pickupDate))
    .withMessage("Return can't be before pickup"),
  body('pickupTime').matches(TIME_PATTERN).withMessage('Pickup time is invalid'),
  body('returnTime').matches(TIME_PATTERN).withMessage('Return time is invalid'),
  body('phoneNumber').isString().trim().matches(PHONE_PATTERN).withMessage('Phone number is invalid'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

export default function bookingRouter(auth) {
  const router = express.Router();
  router.use(requireAuth(auth));

  router.post('/', bookingValidation, async (req, res) => {
    try {
      const vehicle = await Vehicle.findById(req.body.vehicleId);
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }
      if (vehicle.available === false) {
        return res.status(409).json({ message: "This vehicle isn't available right now" });
      }

      const booking = await Booking.create({
        userId: req.user.id,
        vehicleId: vehicle._id,
        pickupLocation: req.body.pickupLocation,
        pickupDate: req.body.pickupDate,
        pickupTime: req.body.pickupTime,
        returnLocation: req.body.returnLocation,
        returnDate: req.body.returnDate,
        returnTime: req.body.returnTime,
        phoneNumber: req.body.phoneNumber,
      });
      res.status(201).json(booking);
    } catch (error) {
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: error.message });
      }
      console.error('Error creating booking:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.get('/', async (req, res) => {
    try {
      const bookings = await Booking.find({ userId: req.user.id }).populate('vehicleId');
      res.status(200).json(bookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      // Matching on userId too means other people's bookings look the same as missing ones.
      const booking = mongoose.isValidObjectId(req.params.id)
        ? await Booking.findOneAndDelete({ _id: req.params.id, userId: req.user.id })
        : null;

      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      res.status(200).json({ message: 'Booking deleted successfully' });
    } catch (error) {
      console.error('Error deleting booking:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  return router;
}
