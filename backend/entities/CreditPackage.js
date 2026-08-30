const { EntitySchema } = require("typeorm")

module.exports = new EntitySchema({
  name: "CreditPackage",
  tableName: "credit_packages",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    name: { type: "varchar", length: 50, nullable: false, unique: true },
    credit_amount: { type: "integer", nullable: false },
    price: { type: "integer", nullable: false },
    created_at: { type: "timestamp", createDate: true },
  },
})