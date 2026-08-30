const isValidString = (value) => {
  return typeof value === "string" && value.trim() !== ""
}

const isInteger = (value) => {
  return typeof value === "number" && Number.isInteger(value)
}

const isValidPassword = (value) => {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,16}$/.test(value)
}

module.exports = { isValidString, isInteger, isValidPassword }