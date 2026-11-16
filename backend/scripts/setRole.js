/**
 * Gives an existing account the admin role, or takes it away again.
 * The person has to sign up on the site first.
 *
 *   npm run make-admin -- someone@example.com
 *   npm run make-admin -- someone@example.com --remove
 */
import "dotenv/config";
import mongoose from "mongoose";
import connectDB from "../Models/db.js";

const email = process.argv[2]?.trim().toLowerCase();
const role = process.argv.includes("--remove") ? "user" : "admin";

if (!email || email.startsWith("--")) {
  console.error("Usage: npm run make-admin -- someone@example.com [--remove]");
  process.exit(1);
}

try {
  await connectDB();
} catch (error) {
  console.error("Not connected to MongoDB. Check URI in backend/.env.", error.message);
  process.exit(1);
}
try {
  // Better Auth keeps accounts in the "user" collection.
  const { matchedCount } = await mongoose.connection.db.collection("user").updateOne({ email }, { $set: { role } });
  if (matchedCount === 0) {
    console.error(`No account with the email ${email}. Sign up on the site first.`);
    process.exitCode = 1;
  } else {
    console.log(`${email} is now ${role === "admin" ? "an admin" : "a regular user"}. Reload the site to see the change.`);
  }
} catch (error) {
  console.error("Updating the role failed:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
