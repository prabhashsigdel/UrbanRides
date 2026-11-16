import { fromNodeHeaders } from 'better-auth/node';

/** Loads the signed-in user from the session cookie into req.user, or answers 401. */
export const requireAuth = (auth) => async (req, res, next) => {
  try {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session) {
      return res.status(401).json({ message: 'Log in to continue.', success: false });
    }
    req.user = session.user;
    next();
  } catch (error) {
    next(error);
  }
};

const isAdmin = (user) => String(user?.role ?? '').split(',').map((r) => r.trim()).includes('admin');

/** Use after requireAuth. Answers 403 unless the signed-in user has the admin role. */
export const requireAdmin = (req, res, next) => {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ message: 'Access denied: Admins only', success: false });
  }
  next();
};
