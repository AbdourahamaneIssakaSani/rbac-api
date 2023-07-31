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
    select: false,
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
    select: false,
  },
  passwordResetToken: {
    type: String,
    select: false,
  },
  passwordResetTokenExpires: {
    type: Date,
    select: false,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  verifyEmailToken: {
    type: String,
    select: false,
  },
  twoFactorSecret: {
    type: String,
    select: false,
  },
  hasTwoFactorAuth: {
    type: Boolean,
    default: false,
  },
  refreshToken: {
    type: String,
    default: null,
    select: false,
  },
});

// Middlewares
// DOCUMENT MIDDLEWAREs

/**
 * Hashes the password before save()
 */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await argon.hash(this.password);
  this.passwordConfirm = undefined;
  // catches the time of creating/changing the password
  this.passwordChangedAt = Date.now();
  next();
});

/**
 * Hash the refresh token before save()
 */
userSchema.pre("save", async function (next) {
  if (!this.isModified("refreshToken") || !this.refreshToken) return next();
  this.refreshToken = await argon.hash(this.refreshToken);
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
 * @param {String} candidatePassword password provided by user
 * @returns {Boolean} true if password is correct, false otherwise
 */
userSchema.methods.verifyPassword = async function (candidatePassword) {
  return argon.verify(this.password, candidatePassword);
};

/**
 * Checks if the password has changed after the jwt token has been issued
 * @param {Number} JWTTimestamp timestamp of when the jwt token was issued
 * @returns {Boolean} true if password has changed, false otherwise
 */
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  return JWTTimestamp < parseInt(this.passwordChangedAt);
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
  const token = jwt.sign({ id: this._id }, process.env.JWT_LOGIN_SECRET, {
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

/**
 * Verifies the refresh token provided with the hash stored.
 */

userSchema.methods.verifyRefreshToken = async function (refreshToken) {
  return argon.verify(this.refreshToken, refreshToken);
};

const User = mongooseV1.model("Users", userSchema);

module.exports = User;
