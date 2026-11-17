import { Cog, Fuel, Gauge, Users, Zap } from "lucide-react";

export const TRANSMISSIONS = [
  { value: "manual", label: "Manual" },
  { value: "automatic", label: "Automatic" },
];

export const FUELS = [
  { value: "petrol", label: "Petrol" },
  { value: "diesel", label: "Diesel" },
  { value: "electric", label: "Electric" },
  { value: "hybrid", label: "Hybrid" },
];

const labelFor = (list, value) => list.find((item) => item.value === value)?.label;

/** "22 km/l", or "180 km per charge" for electric vehicles. */
export function mileageText(vehicle) {
  if (!vehicle.mileage) return null;
  return vehicle.fuel === "electric" ? `${vehicle.mileage} km per charge` : `${vehicle.mileage} km/l`;
}

/**
 * The specs an admin has filled in, ready to show. Missing ones are left out rather than guessed.
 * Each: { key, icon, value, label } where label names the spec and value is the short reading.
 */
export function vehicleSpecs(vehicle) {
  const specs = [];
  if (vehicle.seats) specs.push({ key: "seats", icon: Users, value: `${vehicle.seats} ${vehicle.seats === 1 ? "seat" : "seats"}`, label: "Seats" });
  if (vehicle.transmission) specs.push({ key: "transmission", icon: Cog, value: labelFor(TRANSMISSIONS, vehicle.transmission), label: "Gearbox" });
  if (vehicle.fuel) specs.push({ key: "fuel", icon: vehicle.fuel === "electric" ? Zap : Fuel, value: labelFor(FUELS, vehicle.fuel), label: "Fuel" });
  if (vehicle.mileage) specs.push({ key: "mileage", icon: Gauge, value: mileageText(vehicle), label: vehicle.fuel === "electric" ? "Range" : "Mileage" });
  return specs;
}

const inRange = (value, min, max) => Number.isInteger(Number(value)) && Number(value) >= min && Number(value) <= max;

/** Spec errors for the fleet form; blank is always fine. */
export function validateSpecs(form) {
  const errors = {};
  if (form.seats !== "" && !inRange(form.seats, 1, 15)) errors.seats = "Use a whole number from 1 to 15.";
  if (form.mileage !== "" && !inRange(form.mileage, 1, 1000)) errors.mileage = "Use a whole number from 1 to 1000.";
  return errors;
}
