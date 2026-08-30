const { DataSource } = require("typeorm")
const config = require("../config/index")

const User = require("../entities/User")
const Skill = require("../entities/Skill")
const CreditPackage = require("../entities/CreditPackage")
const Coach = require("../entities/Coach")
const CoachLinkSkill = require("../entities/CoachLinkSkill")
const Course = require("../entities/Course")
const CreditPurchase = require("../entities/CreditPurchase")
const CourseBooking = require("../entities/CourseBooking")

const dataSource = new DataSource({
  type: "postgres",
  host: config.get("db.host"),
  port: Number(config.get("db.port")),
  username: config.get("db.username"),
  password: config.get("db.password"),
  database: config.get("db.database"),
  synchronize: config.get("db.synchronize"),
  ssl: config.get("db.ssl"),
  entities: [
    User, Skill, CreditPackage, Coach, CoachLinkSkill, Course, CreditPurchase, CourseBooking
  ],
})

module.exports = { dataSource }