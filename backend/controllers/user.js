const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { dataSource } = require("../db/data-source")
const appError = require("../utils/appError")
const config = require("../config/index")

const { isValidString, isValidPassword } = require("../utils/validUtils")

const userController = {
  async signup(req, res, next) {
    try {
      const { name, email, password } = req.body

      // 驗證欄位
      if (!isValidString(name) || !isValidString(email) || !isValidString(password)) {
        return next(appError(400, "欄位未填寫正確"))
      }

      // 驗證密碼規則
      if (!isValidPassword(password)) {
        return next(appError(400, "密碼不符合規則"))
      }

      // 檢查 email 唯一性
      const userRepo = dataSource.getRepository("User")
      const existingUser = await userRepo.findOneBy({ email: email.trim() })
      if (existingUser) {
        return next(appError(409, "Email 已註冊"))
      }

      // 加密密碼
      const hashedPassword = await bcrypt.hash(password, 10)

      // 建立使用者
      const newUser = await userRepo.save({
        name: name.trim(),
        email: email.trim(),
        password: hashedPassword,
        role: "USER",
      })

      res.status(201).json({
        status: "success",
        data: {
          user: {
            id: newUser.id,
            name: newUser.name,
          },
        },
      })
    } catch (error) {
      console.error(error)
      next(error)
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body

      // 驗證欄位
      if (!isValidString(email) || !isValidString(password)) {
        return next(appError(400, "欄位未填寫正確"))
      }

      // 查找使用者
      const userRepo = dataSource.getRepository("User")
      const user = await userRepo.findOneBy({ email: email.trim() })
      if (!user) {
        return next(appError(401, "帳號或密碼錯誤"))
      }

      // 驗證密碼
      const isPasswordValid = await bcrypt.compare(password, user.password)
      if (!isPasswordValid) {
        return next(appError(401, "帳號或密碼錯誤"))
      }

      // 生成 JWT
      try {
        const jwtSecret = config.get("secret.jwtSecret")
        const jwtExpiresDay = config.get("secret.jwtExpiresDay")
        const expiresIn = `${jwtExpiresDay}d`
        
        const token = jwt.sign(
          {
            id: user.id,
            role: user.role,
          },
          jwtSecret,
          { expiresIn }
        )

        res.json({
          status: "success",
          data: {
            token,
            user: {
              id: user.id,
              name: user.name,
            },
          },
        })
      } catch (jwtError) {
        console.error("JWT Error:", jwtError)
        return next(appError(500, "Token 生成失敗"))
      }
    } catch (error) {
      console.error("Login error:", error)
      next(error)
    }
  },

  async getProfile(req, res, next) {
    try {
      const userId = req.user.id

      const userRepo = dataSource.getRepository("User")
      const user = await userRepo.findOneBy({ id: userId })
      if (!user) {
        return next(appError(404, "使用者不存在"))
      }

      res.json({
        status: "success",
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
        },
      })
    } catch (error) {
      console.error(error)
      next(error)
    }
  },

  async updateProfile(req, res, next) {
    try {
      const userId = req.user.id
      const { name } = req.body

      // 驗證欄位
      if (!isValidString(name)) {
        return next(appError(400, "欄位未填寫正確"))
      }

      const userRepo = dataSource.getRepository("User")
      const user = await userRepo.findOneBy({ id: userId })
      if (!user) {
        return next(appError(404, "使用者不存在"))
      }

      // 更新名稱
      user.name = name.trim()
      const updatedUser = await userRepo.save(user)

      res.json({
        status: "success",
        data: {
          user: {
            id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
          },
        },
      })
    } catch (error) {
      console.error(error)
      next(error)
    }
  },

  async updatePassword(req, res, next) {
    try {
      const userId = req.user.id
      const { password, new_password } = req.body

      // 驗證欄位
      if (!isValidString(password) || !isValidString(new_password)) {
        return next(appError(400, "欄位未填寫正確"))
      }

      // 驗證新密碼規則
      if (!isValidPassword(new_password)) {
        return next(appError(400, "新密碼不符合規則"))
      }

      const userRepo = dataSource.getRepository("User")
      const user = await userRepo.findOneBy({ id: userId })
      if (!user) {
        return next(appError(404, "使用者不存在"))
      }

      // 驗證舊密碼
      const isOldPasswordValid = await bcrypt.compare(password, user.password)
      if (!isOldPasswordValid) {
        return next(appError(401, "舊密碼錯誤"))
      }

      // 加密新密碼
      const hashedPassword = await bcrypt.hash(new_password, 10)
      user.password = hashedPassword
      const updatedUser = await userRepo.save(user)

      res.json({
        status: "success",
        data: {
          user: {
            id: updatedUser.id,
            name: updatedUser.name,
          },
        },
      })
    } catch (error) {
      console.error(error)
      next(error)
    }
  },

  async getCreditPackageHistory(req, res, next) {
    try {
      const userId = req.user.id
      const purchaseRepo = dataSource.getRepository("CreditPurchase")
      const purchases = await purchaseRepo.find({
        where: { user_id: userId },
        relations: ["creditPackage"],
        order: { created_at: "DESC" },
      })

      const data = purchases.map((purchase) => ({
        name: purchase.creditPackage?.name || "",
        purchased_credits: Number(purchase.credit_amount),
        price_paid: Number(purchase.creditPackage?.price || 0),
        purchase_at: purchase.created_at,
      }))

      res.json({
        status: "success",
        data,
      })
    } catch (error) {
      console.error(error)
      next(error)
    }
  },

  async getUserCourses(req, res, next) {
    try {
      const userId = req.user.id
      const purchaseRepo = dataSource.getRepository("CreditPurchase")
      const bookingRepo = dataSource.getRepository("CourseBooking")
      const courseRepo = dataSource.getRepository("Course")

      const purchases = await purchaseRepo.find({ where: { user_id: userId } })
      const totalPurchased = purchases.reduce((sum, item) => sum + Number(item.credit_amount || 0), 0)

      let bookings = await bookingRepo.find({
        where: { user_id: userId },
        relations: ["course", "course.coach", "course.coach.user"],
        order: { created_at: "ASC" },
      })

      bookings = bookings.sort((a, b) => {
        const aTime = new Date(a.course?.start_at || 0).getTime()
        const bTime = new Date(b.course?.start_at || 0).getTime()
        return aTime - bTime
      })

      const activeBookings = bookings.filter((booking) => !booking.cancelled_at).length

      const courseBooking = bookings.map((booking) => ({
        course_id: booking.course_id,
        name: booking.course?.name || "",
        start_at: booking.course?.start_at,
        end_at: booking.course?.end_at,
        meeting_url: booking.course?.meeting_url,
        coach_name: booking.course?.coach?.user?.name || "",
        cancelled_at: booking.cancelled_at,
      }))

      res.json({
        status: "success",
        data: {
          credit_remain: totalPurchased - activeBookings,
          credit_usage: activeBookings,
          course_booking: courseBooking,
        },
      })
    } catch (error) {
      console.error(error)
      next(error)
    }
  },
}

module.exports = userController
