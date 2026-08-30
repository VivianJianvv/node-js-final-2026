const jwt = require("jsonwebtoken")
const config = require("../config/index")
const appError = require("../utils/appError")

const isAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]
    if (!token) {
      return next(appError(401, "請先登入"))
    }

    const jwtSecret = config.get("secret.jwtSecret")
    const decoded = jwt.verify(token, jwtSecret)
    req.user = decoded
    next()
  } catch (error) {
    console.error("isAuth error:", error.message)
    next(appError(401, "請先登入"))
  }
}

module.exports = isAuth
