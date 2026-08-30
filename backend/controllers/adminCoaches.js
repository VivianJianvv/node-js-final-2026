const { In } = require("typeorm")
const { dataSource } = require("../db/data-source")
const appError = require("../utils/appError")

const { isValidString, isValidPassword, isInteger } = require("../utils/validUtils")

const adminCoachesController = {
  async promoteToCoach(req, res, next) {
    try {
      const { userId } = req.params
      const { experience_years, description, profile_image_url } = req.body

      // 驗證欄位
      if (!isInteger(experience_years) || !isValidString(description)) {
        return next(appError(400, "欄位未填寫正確"))
      }

      // 檢查使用者是否存在
      const userRepo = dataSource.getRepository("User")
      const user = await userRepo.findOneBy({ id: userId })
      if(!user) {
        return next(appError(404, "使用者不存在"))
      }

      // 檢查是否已經是教練
      const coachRepo = dataSource.getRepository("Coach")
      const existingCoach = await coachRepo.findOneBy({ user_id: userId })
      if( existingCoach ) {
        return next(appError(409, "此使用者已是教練"))
      }

      // 更新使用者角色為教練
      user.role = "COACH"
      await userRepo.save(user)

      // 建立教練記錄
      const newCoach = await coachRepo.save({
        user_id: userId,
        experience_years,
        description: description.trim(),
        profile_image_url: profile_image_url?.trim() || null,
      })

      res.status(201).json({
        status: "success",
        data: {
          coach: {
            id: newCoach.id,
            user_id: newCoach.user_id,
            experience_years: newCoach.experience_years,
            description: newCoach.description,
          },
        },
      })
    } catch (error) {
      console.error(error)
      next(error)
    }
  },

  async getCoachProfile(req, res, next) {
    try {
      const coach = req.coach

      // 獲取教練的技能
      const skillLinkRepo = dataSource.getRepository("CoachLinkSkill")
      const skillLinks = await skillLinkRepo.find({
        where: { coach_id: coach.id },
      })

      const skillIds = skillLinks.map((link) => link.skill_id)

      res.json({
        status: "success",
        data: {
          experience_years: coach.experience_years,
          description: coach.description,
          profile_image_url: coach.profile_image_url,
          skill_ids: skillIds,
        },
      })
    } catch (error) {
      console.error(error)
      next(error)
    }
  },

  async updateCoachProfile(req, res, next) {
    try {
      const coach = req.coach
      const { experience_years, description, profile_image_url, skill_ids } = req.body

      // 驗證欄位
      if (experience_years !== undefined && !isInteger(experience_years)) {
        return next(appError(400, "欄位未填寫正確"))
      }

      if (description !== undefined && !isValidString(description)) {
        return next(appError(400, "欄位未填寫正確"))
      }

      // 驗證 profile_image_url 必須是 https 開頭
      if (profile_image_url && !profile_image_url.startsWith("https://")) {
        return next(appError(400, "圖片網址必須以 https:// 開頭"))
      }

      // 更新教練資料
      if (experience_years !== undefined) {
        coach.experience_years = experience_years
      }
      if (description !== undefined) {
        coach.description = description.trim()
      }
      if (profile_image_url !== undefined) {
        coach.profile_image_url = profile_image_url.trim()
      }

      const coachRepo = dataSource.getRepository("Coach")
      const updatedCoach = await coachRepo.save(coach)

      // 更新教練的技能
      if (Array.isArray(skill_ids)) {
        const skillLinkRepo = dataSource.getRepository("CoachLinkSkill")

        // 刪除舊的技能連結
        await skillLinkRepo.delete({ coach_id: coach.id })

        // 添加新的技能連結
        for (const skillId of skill_ids) {
          await skillLinkRepo.save({
            coach_id: coach.id,
            skill_id: skillId,
          })
        }
      }

      // 獲取更新後的技能 ID
      const skillLinkRepo = dataSource.getRepository("CoachLinkSkill")
      const skillLinks = await skillLinkRepo.find({
        where: { coach_id: coach.id },
      })
      const updatedSkillIds = skillLinks.map((link) => link.skill_id)

      res.json({
        status: "success",
        data: {
          experience_years: updatedCoach.experience_years,
          description: updatedCoach.description,
          profile_image_url: updatedCoach.profile_image_url,
          skill_ids: updatedSkillIds,
        },
      })
    } catch (error) {
      console.error(error)
      next(error)
    }
  },

  async getCoachRevenue(req, res, next) {
    try {
      const coach = req.coach
      const { month } = req.query
      const validMonths = [
        "january", "february", "march", "april", "may", "june",
        "july", "august", "september", "october", "november", "december",
      ]

      if (!month || typeof month !== "string" || !validMonths.includes(month.toLowerCase())) {
        return next(appError(400, "欄位未填寫正確"))
      }

      const courseRepo = dataSource.getRepository("Course")
      const courses = await courseRepo.find({ where: { coach_id: coach.id } })
      const courseIds = courses.map((course) => course.id)

      const bookingRepo = dataSource.getRepository("CourseBooking")
      const bookings = courseIds.length > 0
        ? await bookingRepo.find({ where: { course_id: In(courseIds) } })
        : []

      const targetMonthIndex = validMonths.indexOf(month.toLowerCase())
      const targetYear = new Date().getFullYear()

      const validBookings = bookings.filter((booking) => {
        if (booking.cancelled_at) return false
        const createdAt = new Date(booking.created_at)
        return createdAt.getFullYear() === targetYear && createdAt.getMonth() === targetMonthIndex
      })

      const totalCourseCount = validBookings.length
      const uniqueParticipants = new Set(validBookings.map((booking) => booking.user_id)).size

      const packageRepo = dataSource.getRepository("CreditPackage")
      const packages = await packageRepo.find()
      const totalPrice = packages.reduce((sum, pkg) => sum + Number(pkg.price || 0), 0)
      const totalCredits = packages.reduce((sum, pkg) => sum + Number(pkg.credit_amount || 0), 0)
      const perCreditAverage = totalCredits > 0 ? totalPrice / totalCredits : 0
      const revenue = Math.floor(totalCourseCount * perCreditAverage)

      res.json({
        status: "success",
        data: {
          total: {
            revenue,
            participants: uniqueParticipants,
            course_count: totalCourseCount,
          },
        },
      })
    } catch (error) {
      console.error(error)
      next(error)
    }
  },
}

module.exports = adminCoachesController
