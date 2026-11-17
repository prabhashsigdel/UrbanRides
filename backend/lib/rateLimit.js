/**
 * In-memory limiter keyed by the signed-in user, for one-server deployments.
 * Use after requireAuth. Answers 429 once a user makes `max` requests within `windowMs`.
 */
export function rateLimitPerUser({ windowMs, max, message }) {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.user.id;
    const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);

    if (recent.length >= max) {
      const retryAfter = Math.ceil((recent[0] + windowMs - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ message });
    }

    hits.set(key, [...recent, now]);
    // Drop users whose window has passed, so the map doesn't grow forever.
    for (const [user, times] of hits) {
      if (now - times[times.length - 1] >= windowMs) hits.delete(user);
    }
    next();
  };
}
