const express = require("express")
const controller = require("../controllers/publicBrowse")

const router = express.Router()

router.get("/", controller.getCoachList)
router.get("/:coachId", controller.getCoachDetail)
router.get("/:coachId/courses", controller.getCoachCourses)

module.exports = router
