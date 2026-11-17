import mongoose from 'mongoose';
import Vehicle from '../Models/Vehicle.js';
import { deleteUpload } from '../lib/uploads.js';

/** Copies only the fields an admin may set, so request bodies can't write anything else. */
function vehicleFields(body, file) {
  const fields = {};
  if (body.type !== undefined) fields.type = body.type;
  if (body.model !== undefined) fields.model = String(body.model).trim();
  if (body.pricePerDay !== undefined) fields.pricePerDay = Number(body.pricePerDay);
  if (body.available !== undefined) fields.available = body.available === true || body.available === 'true';
  if (file) fields.image = file.filename;
  // Specs are optional: a blank value clears the field instead of saving 0 or "".
  for (const key of ['seats', 'mileage']) {
    if (body[key] !== undefined) fields[key] = body[key] === '' || body[key] === null ? undefined : Number(body[key]);
  }
  for (const key of ['transmission', 'fuel']) {
    if (body[key] !== undefined) fields[key] = body[key] || undefined;
  }
  return fields;
}

const isValidId = (id) => mongoose.isValidObjectId(id);

//toget all the vehicles
export const getAllVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find();
    res.status(200).json(vehicles);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ message: "Error fetching vehicles" });
  }
};

//to create a new vehicle
export const createVehicle = async (req, res) => {
  try {
    const vehicle = new Vehicle({ image: '', ...vehicleFields(req.body, req.file) });
    await vehicle.save();
    res.status(201).json(vehicle);
  } catch (error) {
    await deleteUpload(req.file?.filename);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    console.error('Error adding vehicle:', error);
    res.status(500).json({ message: "Error adding vehicle" });
  }
};

//to update vehicle
export const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = isValidId(id) ? await Vehicle.findById(id) : null;
    if (!vehicle) {
      await deleteUpload(req.file?.filename);
      return res.status(404).json({ message: "Vehicle not found" });
    }

    const previousImage = vehicle.image;
    vehicle.set(vehicleFields(req.body, req.file));
    await vehicle.save();
    // The new photo is saved, so the one it replaced is no longer referenced.
    if (req.file && previousImage !== vehicle.image) await deleteUpload(previousImage);

    res.status(200).json(vehicle);
  } catch (error) {
    await deleteUpload(req.file?.filename);
    if (error.name === 'ValidationError' || error.name === 'CastError') {
      return res.status(400).json({ message: error.message });
    }
    console.error('Error updating vehicle:', error);
    res.status(500).json({ message: "Error updating vehicle" });
  }
};

//to delete vehicle
export const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedVehicle = isValidId(id) ? await Vehicle.findByIdAndDelete(id) : null;

    if (!deletedVehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    await deleteUpload(deletedVehicle.image);
    res.status(200).json({ message: "Vehicle deleted successfully" });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({ message: "Error deleting vehicle" });
  }
};
