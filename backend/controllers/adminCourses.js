const { dataSource } = require("../db/data-source")
const appError = require("../utils/appError")

const { isValidString, isInteger } = require("../utils/validUtils")

const adminCoursesController = {
  async createCourse(req, res, next) {
    try {
      const coach = req.coach
      const { skill_id, name, description, start_at, end_at, max_participants, meeting_url } = req.body

      // 驗證必填欄位
      if (
        !isValidString(name) ||
        !isValidString(skill_id) ||
        !isValidString(start_at) ||
        !isValidString(end_at) ||
        !isInteger(max_participants) ||
        !isValidString(meeting_url)
      ) {
        return next(appError(400, "欄位未填寫正確"))
      }

      if (description !== undefined && !isValidString(description)) {
        return next(appError(400, "欄位未填寫正確"))
      }

      // 驗證 meeting_url 必須是 https 開頭
      if (!meeting_url.startsWith("https://")) {
        return next(appError(400, "會議連結必須以 https:// 開頭"))
      }

      // 建立課程
      const courseRepo = dataSource.getRepository("Course")
      const newCourse = await courseRepo.save({
        coach_id: coach.id,
        skill_id: skill_id.trim(),
        name: name.trim(),
        description: description !== undefined ? description.trim() : null,
        start_at,
        end_at,
        max_participants,
        meeting_url: meeting_url.trim(),
      })

      res.status(201).json({
        status: "success",
        data: {
          course: {
            id: newCourse.id,
            name: newCourse.name,
            description: newCourse.description,
          },
        },
      })
    } catch (error) {
      console.error(error)
      next(error)
    }
  },

  async getCourse(req, res, next) {
    try {
      const { courseId } = req.params
      const coach = req.coach

      const courseRepo = dataSource.getRepository("Course")
      const course = await courseRepo.findOneBy({ id: courseId })

      if (!course) {
        return next(appError(404, "課程不存在"))
      }

      // 檢查是否是課主（owner-scoped）
      if (course.coach_id !== coach.id) {
        return next(appError(403, "只能查詢自己的課程"))
      }

      res.json({
        status: "success",
        data: {
          id: course.id,
          name: course.name,
          skill_id: course.skill_id,
          description: course.description,
          start_at: course.start_at,
          end_at: course.end_at,
          max_participants: course.max_participants,
          meeting_url: course.meeting_url,
        },
      })
    } catch (error) {
      console.error(error)
      next(error)
    }
  },

  async updateCourse(req, res, next) {
    try {
      const { courseId } = req.params
      const coach = req.coach
      const { skill_id, name, description, start_at, end_at, max_participants, meeting_url } = req.body

      const courseRepo = dataSource.getRepository("Course")
      const course = await courseRepo.findOneBy({ id: courseId })

      if (!course) {
        return next(appError(404, "課程不存在"))
      }

      // 檢查是否是課主（owner-scoped）
      if (course.coach_id !== coach.id) {
        return next(appError(403, "只能更新自己的課程"))
      }

      // 驗證欄位（如果提供的話）
      if (skill_id !== undefined && !isValidString(skill_id)) {
        return next(appError(400, "欄位未填寫正確"))
      }
      if (name !== undefined && !isValidString(name)) {
        return next(appError(400, "欄位未填寫正確"))
      }
      if (description !== undefined && !isValidString(description)) {
        return next(appError(400, "欄位未填寫正確"))
      }
      if (start_at !== undefined && !isValidString(start_at)) {
        return next(appError(400, "欄位未填寫正確"))
      }
      if (end_at !== undefined && !isValidString(end_at)) {
        return next(appError(400, "欄位未填寫正確"))
      }
      if (max_participants !== undefined && !isInteger(max_participants)) {
        return next(appError(400, "欄位未填寫正確"))
      }
      if (meeting_url !== undefined && !meeting_url.startsWith("https://")) {
        return next(appError(400, "會議連結必須以 https:// 開頭"))
      }

      // 更新課程
      if (skill_id !== undefined) course.skill_id = skill_id.trim()
      if (name !== undefined) course.name = name.trim()
      if (description !== undefined) course.description = description.trim()
      if (start_at !== undefined) course.start_at = start_at
      if (end_at !== undefined) course.end_at = end_at
      if (max_participants !== undefined) course.max_participants = max_participants
      if (meeting_url !== undefined) course.meeting_url = meeting_url.trim()

      const updatedCourse = await courseRepo.save(course)

      res.json({
        status: "success",
        data: {
          id: updatedCourse.id,
          name: updatedCourse.name,
          skill_id: updatedCourse.skill_id,
          description: updatedCourse.description,
          start_at: updatedCourse.start_at,
          end_at: updatedCourse.end_at,
          max_participants: updatedCourse.max_participants,
          meeting_url: updatedCourse.meeting_url,
        },
      })
    } catch (error) {
      console.error(error)
      next(error)
    }
  },

  async getCoursesList(req, res, next) {
    try {
      const coach = req.coach

      const courseRepo = dataSource.getRepository("Course")
      const courses = await courseRepo.find({
        where: { coach_id: coach.id },
        order: { created_at: "ASC" },
      })

      // 計算每堂課的狀態和報名人數
      const now = new Date()
      const bookingRepo = dataSource.getRepository("CourseBooking")

      const coursesWithStatus = await Promise.all(
        courses.map(async (course) => {
          // 計算狀態
          let status = "尚未開始"
          if (new Date(course.end_at) <= now) {
            status = "已結束"
          } else if (new Date(course.start_at) <= now) {
            status = "進行中"
          }

          // 計算報名人數（不含已取消的）
          const bookings = await bookingRepo.find({
            where: { course_id: course.id },
          })
          const participants = bookings.filter((b) => !b.cancelled_at).length

          return {
            id: course.id,
            name: course.name,
            skill_id: course.skill_id,
            description: course.description,
            start_at: course.start_at,
            end_at: course.end_at,
            max_participants: course.max_participants,
            meeting_url: course.meeting_url,
            status,
            participants,
          }
        })
      )

      res.json({
        status: "success",
        data: coursesWithStatus,
      })
    } catch (error) {
      console.error(error)
      next(error)
    }
  },
}

module.exports = adminCoursesController
