const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const User = mongoose.model(
  "User",
  new Schema({
    username: { required: true, type: String },
    email: { required: true, type: String },
    password: { required: true, type: String },
    role: { default: "basic", type: String },
    date: { type: Date, default: Date.now() },
  })
);

module.exports = User;
