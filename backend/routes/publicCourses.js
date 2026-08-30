const express = require("express")
const controller = require("../controllers/publicBrowse")
const isAuth = require("../middlewares/isAuth")

const router = express.Router()

router.get("/", controller.getActiveCourses)
router.post("/:courseId", isAuth, controller.bookCourse)
router.delete("/:courseId", isAuth, controller.cancelCourseBooking)

module.exports = router
