const { dataSource } = require("../db/data-source")
const appError = require("../utils/appError")

const isCoach = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(appError(401, "請先登入"))
    }

    const coachRepo = dataSource.getRepository("Coach")
    const coach = await coachRepo.findOneBy({ user_id: req.user.id })

    if (!coach) {
      return next(appError(401, "使用者尚未成為教練"))
    }

    req.coach = coach
    next()
  } catch (error) {
    console.error(error)
    next(error)
  }
}

module.exports = isCoach
