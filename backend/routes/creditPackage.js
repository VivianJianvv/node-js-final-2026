const creditPackageController = require("../controllers/creditPackage")
const isAuth = require("../middlewares/isAuth")

const router = require("express").Router()

router.get("/", creditPackageController.getCreditPackages)
router.post("/", creditPackageController.postCreditPackage)
router.post("/:packageId", isAuth, creditPackageController.purchaseCreditPackage)
router.delete("/:packageId", creditPackageController.deleteCreditPackage)

module.exports = router
