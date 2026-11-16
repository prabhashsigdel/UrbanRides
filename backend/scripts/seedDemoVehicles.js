/**
 * Adds placeholder vehicles so the site has something to show.
 * Prices are illustrative, not real rates. Replace them before launch.
 *
 *   npm run seed:demo           add any demo vehicles that aren't already there
 *   npm run seed:demo -- --remove   delete the demo vehicles again (matched by exact model name)
 */
import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../Models/db.js";
import Vehicle from "../Models/Vehicle.js";

const DEMO_VEHICLES = [
  // Cars
  { type: "car", model: "Suzuki Alto 800", pricePerDay: 3500 },
  { type: "car", model: "Suzuki Wagon R", pricePerDay: 4000 },
  { type: "car", model: "Hyundai Grand i10", pricePerDay: 4500 },
  { type: "car", model: "Suzuki Swift", pricePerDay: 5000 },
  { type: "car", model: "Suzuki Dzire", pricePerDay: 5500 },
  { type: "car", model: "Hyundai i20", pricePerDay: 5500 },
  { type: "car", model: "Kia Sonet", pricePerDay: 7000 },
  { type: "car", model: "Hyundai Creta", pricePerDay: 8000 },
  { type: "car", model: "Kia Seltos", pricePerDay: 8500 },
  { type: "car", model: "Suzuki Ertiga (7 seats)", pricePerDay: 7500 },
  { type: "car", model: "Mahindra Scorpio", pricePerDay: 9000 },
  { type: "car", model: "Mahindra Bolero", pricePerDay: 8000 },
  { type: "car", model: "Toyota Hilux", pricePerDay: 12000 },
  { type: "car", model: "Toyota Land Cruiser Prado", pricePerDay: 18000 },
  { type: "car", model: "Tata Nexon EV", pricePerDay: 7500 },
  { type: "car", model: "BYD Atto 3", pricePerDay: 10000, available: false },
  // Bikes and scooters
  { type: "bike", model: "Honda Dio", pricePerDay: 1000 },
  { type: "bike", model: "TVS Ntorq 125", pricePerDay: 1100 },
  { type: "bike", model: "Yamaha Ray ZR", pricePerDay: 1000 },
  { type: "bike", model: "Suzuki Access 125", pricePerDay: 1100 },
  { type: "bike", model: "Honda Shine 125", pricePerDay: 1200 },
  { type: "bike", model: "Bajaj Pulsar 150", pricePerDay: 1500 },
  { type: "bike", model: "Bajaj Pulsar NS200", pricePerDay: 1800 },
  { type: "bike", model: "Yamaha FZ-S", pricePerDay: 1600 },
  { type: "bike", model: "Honda CB Hornet 160R", pricePerDay: 1700 },
  { type: "bike", model: "Hero Xpulse 200", pricePerDay: 2200 },
  { type: "bike", model: "KTM Duke 200", pricePerDay: 2500 },
  { type: "bike", model: "Royal Enfield Classic 350", pricePerDay: 3000 },
  { type: "bike", model: "Royal Enfield Hunter 350", pricePerDay: 2800 },
  { type: "bike", model: "Royal Enfield Himalayan 450", pricePerDay: 4000 },
  { type: "bike", model: "Yatri P1 (electric)", pricePerDay: 2000, available: false },
];

async function addDemoVehicles() {
  const existing = new Set((await Vehicle.find({}, "model")).map((v) => v.model));
  const toAdd = DEMO_VEHICLES.filter((v) => !existing.has(v.model)).map((v) => ({ available: true, ...v }));
  if (toAdd.length) await Vehicle.insertMany(toAdd);
  console.log(`Added ${toAdd.length} demo vehicles (${DEMO_VEHICLES.length - toAdd.length} were already there).`);
}

async function removeDemoVehicles() {
  const { deletedCount } = await Vehicle.deleteMany({ model: { $in: DEMO_VEHICLES.map((v) => v.model) } });
  console.log(`Removed ${deletedCount} demo vehicles.`);
}

try {
  await connectDB();
} catch (error) {
  console.error("Not connected to MongoDB. Check URI in backend/.env.", error.message);
  process.exit(1);
}
try {
  if (process.argv.includes("--remove")) await removeDemoVehicles();
  else await addDemoVehicles();
  console.log(`Vehicles in the fleet now: ${await Vehicle.countDocuments()}`);
} catch (error) {
  console.error("Seeding failed:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
