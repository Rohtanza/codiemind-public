const redis = require('./redis');

const refreshTokenService = {
  async validate(claims) {
    const key = `refresh:${claims.sub}:${claims.jti}`;
    const stored = await redis.get(key);
    if (stored === null) {
      return { valid: false };
    }
    return { valid: true, userId: claims.sub };
  },
};

module.exports = refreshTokenService;
