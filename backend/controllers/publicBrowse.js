const { dataSource } = require("../db/data-source")
const appError = require("../utils/appError")

function parseQueryInteger(value, name) {
  if (value === undefined || value === null || value === "") {
    throw appError(400, "欄位未填寫正確")
  }

  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0 || (name === "page" && parsed < 1)) {
    throw appError(400, "欄位未填寫正確")
  }

  return parsed
}

function isValidUuid(value) {
  return typeof value === "string" && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value)
}

const publicBrowseController = {
  async getCoachList(req, res, next) {
    try {
      const per = parseQueryInteger(req.query.per, "per")
      const page = parseQueryInteger(req.query.page, "page")

      const coachRepo = dataSource.getRepository("Coach")
      const [coaches, total] = await coachRepo.findAndCount({
        relations: ["user"],
        take: per,
        skip: (page - 1) * per,
        order: { created_at: "DESC" },
      })

      const data = coaches.map((coach) => ({
        id: coach.id,
        user_id: coach.user_id,
        name: coach.user?.name || null,
      }))

      res.json({
        status: "success",
        data,
        pagination: {
          page,
          per,
          total,
        },
      })
    } catch (error) {
      if (error && error.status === 400) {
        return next(error)
      }
      next(error)
    }
  },

  async getCoachDetail(req, res, next) {
    try {
      const { coachId } = req.params

      if (!isValidUuid(coachId)) {
        return next(appError(400, "欄位未填寫正確"))
      }

      const coachRepo = dataSource.getRepository("Coach")
      const coach = await coachRepo.findOne({
        where: { id: coachId },
        relations: ["user"],
      })

      if (!coach) {
        return next(appError(404, "找不到該教練"))
      }

      const skillLinkRepo = dataSource.getRepository("CoachLinkSkill")
      const skillLinks = await skillLinkRepo.find({ where: { coach_id: coach.id } })
      const skillIds = skillLinks.map((link) => link.skill_id)

      let skills = []
      if (skillIds.length > 0) {
        const skillRepo = dataSource.getRepository("Skill")
        const skillRows = await skillRepo.findByIds(skillIds)
        skills = skillRows.map((skill) => skill.name)
      }

      res.json({
        status: "success",
        data: {
          user: {
            name: coach.user?.name || "",
            role: coach.user?.role || "COACH",
          },
          coach: {
            id: coach.id,
            user_id: coach.user_id,
            experience_years: coach.experience_years,
            description: coach.description,
            profile_image_url: coach.profile_image_url,
            created_at: coach.created_at,
            updated_at: coach.updated_at,
            skills,
          },
        },
      })
    } catch (error) {
      next(error)
    }
  },

  async getCoachCourses(req, res, next) {
    try {
      const { coachId } = req.params

      if (!isValidUuid(coachId)) {
        return next(appError(400, "欄位未填寫正確"))
      }

      const coachRepo = dataSource.getRepository("Coach")
      const coach = await coachRepo.findOne({
        where: { id: coachId },
        relations: ["user"],
      })

      if (!coach) {
        return next(appError(404, "找不到該教練"))
      }

      const courseRepo = dataSource.getRepository("Course")
      const courses = await courseRepo.find({
        where: { coach_id: coach.id },
        relations: ["skill"],
        order: { start_at: "ASC" },
      })

      const now = new Date()
      const data = courses
        .filter((course) => new Date(course.end_at) > now)
        .map((course) => ({
          id: course.id,
          name: course.name,
          description: course.description,
          start_at: course.start_at,
          end_at: course.end_at,
          max_participants: course.max_participants,
          coach_name: coach.user?.name || "",
          skill_name: course.skill?.name || "",
        }))

      res.json({
        status: "success",
        data,
      })
    } catch (error) {
      next(error)
    }
  },

  async getActiveCourses(req, res, next) {
    try {
      const courseRepo = dataSource.getRepository("Course")
      const courses = await courseRepo.find({
        relations: ["coach", "skill"],
        order: { start_at: "ASC" },
      })

      const coachRepo = dataSource.getRepository("Coach")
      const allCoaches = await coachRepo.find({ relations: ["user"] })
      const coachMap = new Map(allCoaches.map((coach) => [coach.id, coach.user?.name || ""]))

      const now = new Date()
      const data = courses
        .filter((course) => new Date(course.start_at) <= now && new Date(course.end_at) > now)
        .map((course) => ({
          id: course.id,
          name: course.name,
          description: course.description,
          start_at: course.start_at,
          end_at: course.end_at,
          max_participants: course.max_participants,
          coach_name: coachMap.get(course.coach_id) || "",
          skill_name: course.skill?.name || "",
        }))

      res.json({
        status: "success",
        data,
      })
    } catch (error) {
      next(error)
    }
  },

  async bookCourse(req, res, next) {
    try {
      const { courseId } = req.params
      const userId = req.user?.id

      if (!userId) {
        return next(appError(401, "請先登入"))
      }

      const courseRepo = dataSource.getRepository("Course")
      const course = await courseRepo.findOneBy({ id: courseId })
      if (!course) {
        return next(appError(400, "ID錯誤"))
      }

      const bookingRepo = dataSource.getRepository("CourseBooking")
      const existingBooking = await bookingRepo.findOne({
        where: {
          user_id: userId,
          course_id: courseId,
        },
      })
      if (existingBooking) {
        return next(appError(400, "已經報名過此課程"))
      }

      const purchaseRepo = dataSource.getRepository("CreditPurchase")
      const purchases = await purchaseRepo.find({ where: { user_id: userId } })
      const totalPurchased = purchases.reduce((sum, item) => sum + Number(item.credit_amount || 0), 0)
      const activeBookings = await bookingRepo.count({
        where: { user_id: userId, cancelled_at: null },
      })
      const creditRemain = totalPurchased - activeBookings
      if (creditRemain <= 0) {
        return next(appError(400, "已無可使用堂數"))
      }

      const validBookings = await bookingRepo.find({ where: { course_id: courseId, cancelled_at: null } })
      if (validBookings.length >= Number(course.max_participants)) {
        return next(appError(400, "已達最大參加人數，無法參加"))
      }

      await bookingRepo.save({
        user_id: userId,
        course_id: courseId,
        cancelled_at: null,
      })

      res.status(201).json({
        status: "success",
        data: null,
      })
    } catch (error) {
      next(error)
    }
  },

  async cancelCourseBooking(req, res, next) {
    try {
      const { courseId } = req.params
      const userId = req.user?.id

      if (!userId) {
        return next(appError(401, "請先登入"))
      }

      const bookingRepo = dataSource.getRepository("CourseBooking")
      const bookings = await bookingRepo.find({
        where: {
          user_id: userId,
          course_id: courseId,
        },
      })

      const booking = bookings.find((item) => item.cancelled_at === null)
      if (!booking) {
        return next(appError(400, "ID錯誤"))
      }

      booking.cancelled_at = new Date()
      await bookingRepo.save(booking)

      res.json({
        status: "success",
        data: null,
      })
    } catch (error) {
      next(error)
    }
  },
}

module.exports = publicBrowseController
