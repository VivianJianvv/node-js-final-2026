const { EntitySchema } = require("typeorm")

module.exports = new EntitySchema({
  name: "CreditPurchase",
  tableName: "credit_purchases",
  columns: {
    id: { type: "uuid", primary: true, generated: "uuid" },
    user_id: { type: "uuid", nullable: false },
    credit_package_id: { type: "uuid", nullable: false },
    credit_amount: { type: "integer", nullable: false },
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
    creditPackage: {
      type: "many-to-one",
      target: "CreditPackage",
      joinColumn: {
        name: "credit_package_id"
      },
    },
  },
})
