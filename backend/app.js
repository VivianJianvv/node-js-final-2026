const express = require("express")
const cors = require("cors")
const config = require("./config/index")

const { dataSource } = require("./db/data-source")
const appError = require("./utils/appError")
const skill = require("./routes/skill")
const creditPackage = require("./routes/creditPackage")
const users = require("./routes/users")
const publicBrowse = require("./routes/publicBrowse")
const publicCourses = require("./routes/publicCourses")
const adminCoaches = require("./routes/adminCoaches")
const adminCourses = require("./routes/adminCourses")

const app = express()
app.use(cors())
app.use(express.json())

// M0 healthcheck（下一步實作）
app.get("/healthcheck", async (req, res, next) => {
  try {
    await dataSource.query("SELECT 1")
    res.status(200).send("OK")
  } catch(err) {
    res.status(503).send("Service Unavailable")
  }
})


app.use("/api/coaches/skill", skill)
app.use("/api/coaches", publicBrowse)
app.use("/api/courses", publicCourses)
app.use("/api/credit-package", creditPackage)
app.use("/api/users", users)
app.use("/api/admin/coaches/courses", adminCourses)
app.use("/api/admin/coaches", adminCoaches)


// 路由掛載（後續步驟逐一加入）
app.use((req, res, next) => {
    next(appError(400, "無此路由"))
    return
})

// 全域錯誤處理
app.use((err, req, res, next) => {
  const statusCode = err.status || 500
  res.status(statusCode).json({
    status: statusCode === 500 ? "error" : "failed",
    message: err.message || "伺服器錯誤",
  })
  return
})


// 啟動
dataSource.initialize().then(() => {
  app.listen( config.get("web.port"), () => {
    console.log(`Server running on port ${config.get("web.port")}`)
  })
}).catch((err) => {
  console.error("資料庫連線失敗", err)
  process.exit(1)
})