import express from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { requireAuth } from '../Middlewares/Auth.js';

/**
 * Account routes Better Auth only offers on the server. Changing an existing password needs no route
 * here: the frontend calls Better Auth's /change-password itself.
 */
export default function accountRouter(auth) {
  const router = express.Router();
  router.use(requireAuth(auth));

  // Adds a password to an account that signs in with Google only, so it can also use email + password.
  router.post('/password', async (req, res, next) => {
    const { newPassword } = req.body ?? {};
    if (typeof newPassword !== 'string' || !newPassword) {
      return res.status(400).json({ message: 'Enter a new password.' });
    }
    try {
      await auth.api.setPassword({ body: { newPassword }, headers: fromNodeHeaders(req.headers) });
      res.status(200).json({ message: 'Password set' });
    } catch (error) {
      // Better Auth's own errors (too short, already set) carry a status and a readable message.
      if (error?.statusCode && error.statusCode < 500) {
        return res.status(error.statusCode).json({ message: error.body?.message ?? error.message, code: error.body?.code });
      }
      next(error);
    }
  });

  return router;
}
