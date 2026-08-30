const adminCoachesController = require("../controllers/adminCoaches")
const isAuth = require("../middlewares/isAuth")
const isCoach = require("../middlewares/isCoach")

const router = require("express").Router()

// 升級使用者為教練 (public)
router.post("/:userId", adminCoachesController.promoteToCoach)

// 教練個人資料
router.get("/revenue", isAuth, isCoach, adminCoachesController.getCoachRevenue)
router.get("/", isAuth, isCoach, adminCoachesController.getCoachProfile)
router.put("/", isAuth, isCoach, adminCoachesController.updateCoachProfile)

module.exports = router



