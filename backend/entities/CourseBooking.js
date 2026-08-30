const { EntitySchema } = require("typeorm")

module.exports = new EntitySchema({
  name: "CourseBooking",
  tableName: "course_bookings",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    user_id: { type: "uuid", nullable: false },
    course_id: { type: "uuid", nullable: false },
    cancelled_at: { type: "timestamp", nullable: true },
    created_at: { type: "timestamp", createDate: true },
  },
  relations: {
    user: {
      type: "many-to-one",
      target: "User",
      joinColumn: {
        name: "user_id"
      },
    },
    course: {
      type: "many-to-one",
      target: "Course",
      joinColumn: {
        name: "course_id"
      },
    },
  },
})
