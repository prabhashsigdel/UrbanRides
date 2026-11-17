import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema({
  type: { type: String, enum: ['bike', 'car'], required: true },
  model: { type: String, required: true },
  pricePerDay: { type: Number, required: true },
  available: { type: Boolean, default: true },
  image: { type: String },
  // Specs the admin fills in. All optional: cards show only what's been entered, never a guess.
  seats: { type: Number, min: 1, max: 15 },
  transmission: { type: String, enum: ['manual', 'automatic'] },
  fuel: { type: String, enum: ['petrol', 'diesel', 'electric', 'hybrid'] },
  // km per litre, or km per full charge for electric vehicles.
  mileage: { type: Number, min: 1, max: 1000 },
});

export default mongoose.model('Vehicle', vehicleSchema);
