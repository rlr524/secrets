require("dotenv").config();
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const encrypt = require("mongoose-encryption");

const usersSchema = new Schema(
  {
    email: String,
    password: String,
    active: Boolean
  },
  { timestamps: true }
);

usersSchema.plugin(encrypt, {
  secret: process.env.MONGOOSE_SECRET,
  encryptedFields: ["password"]
});

const User = mongoose.model("User", usersSchema);

module.exports = User;
