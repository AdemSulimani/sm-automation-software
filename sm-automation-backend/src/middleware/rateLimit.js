const buckets = new Map();

/**
 * Rate limiter shumë i thjeshtë në memory: max kërkesa për windowMs për key (userId ose IP).
 */
function createRateLimiter({ windowMs, max, keyPrefix }) {
  return (req, res, next) => {
    const now = Date.now();
    const keyBase = req.userId ? String(req.userId) : req.ip;
    const key = `${keyPrefix || 'global'}:${keyBase}`;
    const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > bucket.resetAt) {
      bucket.count = 0;
      bucket.resetAt = now + windowMs;
    }

    bucket.count += 1;
    buckets.set(key, bucket);

    if (bucket.count > max) {
      res.status(429).json({
        success: false,
        message: 'Shumë kërkesa. Ju lutemi provoni përsëri më vonë.',
      });
      return;
    }

    next();
  };
}

module.exports = {
  createRateLimiter,
};

