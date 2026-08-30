const userController = require("../controllers/user")
const isAuth = require("../middlewares/isAuth")

const router = require("express").Router()

router.post("/signup", userController.signup)
router.post("/login", userController.login)
router.get("/profile", isAuth, userController.getProfile)
router.put("/profile", isAuth, userController.updateProfile)
router.put("/password", isAuth, userController.updatePassword)
router.get("/credit-package", isAuth, userController.getCreditPackageHistory)
router.get("/courses", isAuth, userController.getUserCourses)

module.exports = router
