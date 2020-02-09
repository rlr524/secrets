const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const usersSchema = new Schema(
  {
    email: String,
    password: String,
    active: Boolean
  },
  { timestamps: true }
);

const User = mongoose.model("User", usersSchema);

module.exports = User;
