import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  // Better Auth user id (string form of the user document's _id).
  userId: { type: String, required: true, index: true },
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  pickupLocation: { type: String, required: true },
  pickupDate: { type: Date, required: true },
  pickupTime: { type: String, required: true },
  returnLocation: { type: String, required: true },
  returnDate: { type: Date, required: true },
  returnTime: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Serves the overlap check run before every new booking.
bookingSchema.index({ vehicleId: 1, pickupDate: 1, returnDate: 1 });

export default mongoose.model('Booking', bookingSchema);
