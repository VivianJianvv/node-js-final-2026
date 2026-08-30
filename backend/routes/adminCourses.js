const adminCoursesController = require("../controllers/adminCourses")
const isAuth = require("../middlewares/isAuth")
const isCoach = require("../middlewares/isCoach")

const router = require("express").Router()

// 創建課程
router.post("/", isAuth, isCoach, adminCoursesController.createCourse)

// 課程列表
router.get("/", isAuth, isCoach, adminCoursesController.getCoursesList)

// 單一課程查詢與更新（需要在最後，以免被其他路由搶先匹配）
router.get("/:courseId", isAuth, isCoach, adminCoursesController.getCourse)
router.put("/:courseId", isAuth, isCoach, adminCoursesController.updateCourse)

module.exports = router
