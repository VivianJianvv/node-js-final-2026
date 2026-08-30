module.exports = {
  jwtSecret: process.env.JWT_SECRET || "default-secret-key-change-this-in-production",
  jwtExpiresDay: (process.env.JWT_EXPIRES_DAY || "30d").replace(/d$/, ""),
}