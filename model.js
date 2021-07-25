
/**
 * A simplistic schema, simply for testing purposes.
 */
const mongoose = require('mongoose')

const TestSchema = new mongoose.Schema({
  username: { type: String, required: true},
  password: { type: String, required: true },
  pass: { type: Boolean}
})

module.exports = mongoose.model("Test", TestSchema)
