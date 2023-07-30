const argon = require("argon2");
const crypto = require("crypto");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const { mongooseV1 } = require("../../config/database/mongo");

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, "First name required!"],
  },
  lastName: {
    type: String,
    required: [true, "Last name required!"],
  },
  email: {
    type: String,
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, "Email not valid"],
  },
  picture: {
    type: String,
    default:
      "http://images.fineartamerica.com/images-medium-large/alien-face-.jpg",
  },
  role: {
    type: String,
    enum: ["user", "auditor", "admin", "root"],
    default: "user",
  },
  active: {
    type: Boolean,
    default: true,
  },
  blocked: {
    type: Boolean,
    default: false,
  },
  maritalStatus: {
    type: String,
    enum: ["Single", "Married", "Divorced", "Widowed"],
  },
  age: {
    type: Number,
    min: [0, "Age must be greater than 0"],
  },
  gender: {
    type: String,
  },
  dateOfBirth: {
    type: Date,
    validate: {
      validator: function (date) {
        return new Date().getFullYear() - date.getFullYear() > 18;
      },
    },
  },
  nationality: {
    type: String,
  },
  password: {
    type: String,
    required: {
      is: function () {
        return !this.googleId;
      },
      message: "Password is required",
    },
    minlength: 8,
  },
  passwordConfirm: {
    type: String,
    required: {
      is: function () {
        return !this.googleId;
      },
      message: "Password confirmation is required",
    },
    validate: {
      validator: function (pwdConfirm) {
        return pwdConfirm === this.password;
      },
      message: "Password confirmation must match password",
    },
  },
  passwordChangedAt: {
    type: Date,
    default: Date.now(),
  },
  passwordResetToken: {
    type: String,
  },
  passwordResetTokenExpires: {
    type: Date,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  verifyEmailToken: {
    type: String,
  },
  twoFactorSecret: {
    type: String,
  },
  hasTwoFactorAuth: {
    type: Boolean,
    default: false,
  },
});

// Middlewares
// DOCUMENT MIDDLEWAREs

/**
 * Hashes the password before save()
 */
userSchema.pre("save", async function (next) {
  // if the password is not new, skip this middleware
  if (!this.isModified("password")) return next();

  this.password = await argon.hash(this.password);
  //   no need to save this
  this.passwordConfirm = undefined;
  next();
});

/**
 * Catches the time of changing the password
 */
userSchema.pre("save", async function (next) {
  // if the password is modified and not the first time of the user
  if (!this.isModified("password")) return next();
  this.passwordChangedAt = Date.now();

  next();
});

/**
 * Hides the inactive users
 */
userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

// INSTANCE METHOD

/**
 * Verifies the password provided with the hash stored.
 * @param {String} candiatePassword password provided by user
 * @returns {Boolean}
 */
userSchema.methods.verifyPassword = async function (candiatePassword) {
  return argon.verify(this.password, candiatePassword);
};

/**
 * Checks if the password has changed after the jwt token has been issued
 * @param {Number} JWTTimestamp
 * @returns {Boolean}
 */
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  return JWTTimestamp < parseInt(this.passwordChangedAt.getTime() / 1000);
};

/**
 * Generates an email verification token.
 */
userSchema.methods.createEmailVerficationToken = function () {
  const verifyEmailToken = crypto.randomBytes(28).toString("hex");

  // hash it and save to db
  this.verifyEmailToken = crypto
    .createHash("sha256")
    .update(verifyEmailToken)
    .digest("hex");

  return verifyEmailToken;
};

/**
 * Generates a login token.
 */
userSchema.methods.createLoginToken = function () {
  const token = jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: "10m",
  });

  return token;
};

/**
 * Generates a reset password token.
 */
userSchema.methods.createResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  // hash it and save to db
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetTokenExpires = Date.now() + 60 * 1000 * 10; // date now + 10min

  return resetToken;
};

const User = mongooseV1.model("Users", userSchema);

module.exports = User;
