const { dataSource } = require("../db/data-source")
const appError = require("../utils/appError")

const { isValidString, isInteger } = require("../utils/validUtils")

const creditPackageController = {
  async getCreditPackages(req, res, next) {
    const packages = await dataSource.getRepository("CreditPackage").find({
      select: { id: true, name: true, credit_amount: true, price: true },
      order: { created_at: "ASC" },
    })
    res.json({
        status: "success",
        data: packages
    })
    return
  },

  async postCreditPackage(req, res, next) {
    const { name, credit_amount, price } = req.body
    
    if( !isValidString(name) || !isInteger(credit_amount) || !isInteger(price) ) {
      next( appError(400, "欄位未填寫正確") )
      return
    }

    const packageRepo = dataSource.getRepository("CreditPackage")
    const findPackage = await packageRepo.findOneBy({ name: name.trim() })
    if( findPackage ) {
      next( appError(409, "資料重複") )
      return
    }

    const newPackage = await packageRepo.save({ name: name.trim(), credit_amount, price })
    res.json({
        status: "success",
        data: newPackage
    })
  },

  async purchaseCreditPackage(req, res, next) {
    try {
      const { packageId } = req.params
      const userId = req.user?.id

      if (!userId) {
        return next(appError(401, "請先登入"))
      }

      const packageRepo = dataSource.getRepository("CreditPackage")
      const packageItem = await packageRepo.findOneBy({ id: packageId })
      if (!packageItem) {
        return next(appError(400, "ID錯誤"))
      }

      const purchaseRepo = dataSource.getRepository("CreditPurchase")
      await purchaseRepo.save({
        user_id: userId,
        credit_package_id: packageItem.id,
        credit_amount: packageItem.credit_amount,
      })

      res.status(200).json({
        status: "success",
        data: null,
      })
    } catch (error) {
      console.error(error)
      next(error)
    }
  },

  async deleteCreditPackage(req, res, next) {
    try {
      const { packageId } = req.params
      const result = await dataSource.getRepository("CreditPackage").delete(packageId)

      if( result.affected === 0 ) {
        next( appError(400, "ID錯誤") )
        return
      }
      res.json({
        status: "success"
      })
      return
    } catch (error) {
      console.error(error)
      next(error)
    }
  },
}

module.exports = creditPackageController
