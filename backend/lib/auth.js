import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { admin } from 'better-auth/plugins';

const MIN_PASSWORD_LENGTH = 8;
const MIN_SECRET_LENGTH = 32;
const DEFAULT_ORIGINS = 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173';

/** Frontend origins allowed to use the API and receive auth cookies. */
export function clientOrigins() {
  return (process.env.CLIENT_ORIGINS || DEFAULT_ORIGINS).split(',').map((o) => o.trim()).filter(Boolean);
}

/** Google sign-in is switched on only when both credentials are present in the environment. */
function googleProvider() {
  const { GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret } = process.env;
  return clientId && clientSecret ? { google: { clientId, clientSecret } } : {};
}

/**
 * Builds the Better Auth instance on an existing MongoDB connection.
 * Pass `client` to run multi-step writes in transactions (needs a replica set, which Atlas has).
 *
 * @param {{ db: import('mongodb').Db, client?: import('mongodb').MongoClient }} connection
 */
export function createAuth({ db, client }) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret === 'change-me' || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`BETTER_AUTH_SECRET must be a random string of at least ${MIN_SECRET_LENGTH} characters. See backend/.env.example.`);
  }
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && (!process.env.BETTER_AUTH_URL || !process.env.CLIENT_ORIGINS)) {
    throw new Error('Set BETTER_AUTH_URL and CLIENT_ORIGINS in production, so cookies are Secure and localhost isn\'t trusted.');
  }

  return betterAuth({
    appName: 'UrbanRides',
    baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
    secret,
    database: mongodbAdapter(db, client ? { client } : { transaction: false }),
    trustedOrigins: clientOrigins(),
    emailAndPassword: { enabled: true, minPasswordLength: MIN_PASSWORD_LENGTH },
    socialProviders: googleProvider(),
    // Google links into an existing password account only once that account's email is verified
    // (Better Auth's requireLocalEmailVerified default), so nobody can pre-register someone else's email.
    account: { accountLinking: { enabled: true, trustedProviders: ['google'] } },
    rateLimit: { enabled: process.env.NODE_ENV !== 'test' },
    // Adds user.role ("user" by default). Roles can't be set through sign-up.
    plugins: [admin()],
  });
}
