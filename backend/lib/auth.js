import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { admin } from 'better-auth/plugins';
import { APIError } from 'better-auth/api';

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

const hasAdminRole = (user) => String(user?.role ?? '').split(',').map((r) => r.trim()).includes('admin');

/**
 * Self-service account deletion. Better Auth asks for the password, or for a sign-in within the last day
 * when the account has no password. The last admin can't delete themselves, or nobody could run the site.
 */
function deleteUserOptions(db) {
  return {
    enabled: true,
    beforeDelete: async (user) => {
      if (!hasAdminRole(user)) return;
      const admins = await db.collection('user').countDocuments({ role: { $regex: '(^|,)\\s*admin\\s*(,|$)' } });
      if (admins <= 1) {
        throw new APIError('BAD_REQUEST', {
          message: "You're the only admin. Make someone else an admin before deleting your account.",
          code: 'LAST_ADMIN',
        });
      }
    },
    // Bookings live outside Better Auth, so they're removed here once the account is gone.
    afterDelete: async (user) => {
      await db.collection('bookings').deleteMany({ userId: user.id });
    },
  };
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
    user: {
      deleteUser: deleteUserOptions(db),
      // Admin-only notes about a customer (see Routes/AdminRouter.js). input: false keeps them out of
      // sign-up and update-user, so nobody can set or clear a flag on themselves.
      additionalFields: {
        flagReason: { type: 'string', required: false, input: false },
        flaggedAt: { type: 'date', required: false, input: false },
      },
    },
    // Google links into an existing password account only once that account's email is verified
    // (Better Auth's requireLocalEmailVerified default), so nobody can pre-register someone else's email.
    account: { accountLinking: { enabled: true, trustedProviders: ['google'] } },
    rateLimit: { enabled: process.env.NODE_ENV !== 'test' },
    // Adds user.role ("user" by default). Roles can't be set through sign-up.
    plugins: [admin()],
  });
}
