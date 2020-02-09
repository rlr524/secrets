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

const secret = "thisisasecretforthesecretsapp";

usersSchema.plugin(encrypt, {
  secret: secret,
  encryptedFields: ["password"]
});

const User = mongoose.model("User", usersSchema);

module.exports = User;
