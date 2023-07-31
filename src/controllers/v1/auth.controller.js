const User = require("../../models/v1/user.model");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const QRCode = require("qrcode");
const speakeasy = require("speakeasy");
const asyncHandler = require("../../utils/async.handler");
const AppError = require("../../utils/app-error");
const EmailServices = require("../../utils/email.service");
const { sendVerifyEmail } = require("./user.controller");
const { promisify } = require("util");

/**
 * Get access token and refresh token for a user.
 * @param {*} user - The user document.
 * @returns {Promise<{accessToken: string, refreshToken: string}>} - The access token and refresh token.
 */
async function getTokens(payload) {
  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  });

  return { accessToken, refreshToken };
}

/**
 * Sends access token for signup and login.
 * @param {User} user user object
 * @param {Number} statusCode http status code to send
 * @param {Response} res response object
 */
const sendTokens = async (user, statusCode, res) => {
  const payload = { id: user._id };
  const tokens = await getTokens(payload);
  // Assuming getTokens returns an object with properties 'accessToken' and 'refreshToken'
  const { accessToken, refreshToken } = tokens;

  user.refreshToken = refreshToken;
  // user.password = undefined;

  user.markModified("refreshToken");
  await user.save({ validateBeforeSave: false });
  user.refreshToken = undefined;

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ), // 90 days
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  res.cookie("accessToken", accessToken, cookieOptions);
  res.cookie("refreshToken", refreshToken, cookieOptions);

  res.status(statusCode).json({
    status: "success",
    data: { user },
  });
};

/**
 * Creates a new user account.
 */
exports.signup = asyncHandler(async (req, res, next) => {
  const newUser = await User.create({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  req.user = await User.findById(newUser._id).select("+refreshToken");

  await sendVerifyEmail(req);

  await sendTokens(req.user, 201, res);
});

/**
 * Login a user with email and password.
 */
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please provide email/password", 400));
  }

  // Get the user with the password for verification
  const userWithPassword = await User.findOne({ email }).select("+password");

  if (!userWithPassword || !(await userWithPassword.verifyPassword(password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  if (userWithPassword.hasTwoFactorAuth) {
    return res.status(200).json({
      status: "success",
      message: "Provide the 2FA token to continue",
      data: { id: userWithPassword._id },
    });
  } else {
    // Get the user without the password for sending with tokens
    const userWithoutPassword = await User.findOne({ email });
    await sendTokens(userWithoutPassword, 200, res);
  }
});

/**
 * Sends 2FA link to user email.
 */
exports.passwordLessLogin = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return next(new AppError("User not found!", 404));
  }

  const loginToken = user.createLoginToken();

  const loginUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/auth/login/${loginToken}`;

  await EmailServices.sendWithNodeMailer({
    email: user.email,
    subject: "Login to your account",
    message: `Click on the link to login: ${loginUrl}`,
  });

  res.status(200).json({
    status: "success",
    message: "Login link sent to email!",
  });
});

/**
 * Verify a user with 2FA link.
 */
exports.verifyPasswordLessLogin = asyncHandler(async (req, res, next) => {
  const { token } = req.params;

  if (!token) {
    return next(new AppError("Invalid token", 400));
  }

  const decoded = jwt.verify(token, process.env.JWT_LOGIN_SECRET);

  const user = await User.findById(decoded.id);

  if (!user) {
    return next(
      new AppError("User belonging to this token no longer exists.", 401)
    );
  }

  await sendTokens(user, 200, res);
});

/**
 * Setup 2FA for a user.
 */
exports.setTwoFactorLogin = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  const secret = speakeasy.generateSecret({
    length: 20,
    name: `RBAC API (${user.email})`,
    issuer: "RBAC API",
  });

  user.twoFactorSecret = secret.base32;
  user.hasTwoFactorAuth = true;
  await user.save({ validateBeforeSave: false });

  QRCode.toDataURL(secret.otpauth_url, function (err, data_url) {
    res.render("qrcode", { url: data_url });
  });
});

/**
 * Login a user with 2FA code.
 */
exports.twoFactorLogin = asyncHandler(async (req, res, next) => {
  const { code, id } = req.body;

  const user = await User.findById(id).select("+twoFactorSecret");

  const secret = user.twoFactorSecret;

  const verified = speakeasy.totp.verify({
    secret: secret,
    encoding: "base32",
    token: code,
  });

  if (verified) {
    // get user without 2fa secret
    const userWithoutSecret = await User.findById(id);
    await sendTokens(userWithoutSecret, 200, res);
  } else {
    return next(new AppError("Invalid 2FA token.", 401));
  }
});

/**
 * Logout a user.
 */
exports.logout = asyncHandler(async (req, res, next) => {
  res.cookie("accessToken", "loggedout", {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true,
  });
  res.status(200).json({
    status: "success",
  });
});

/**
 * Treats a case when the user forgets the password
 */
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError("User with that email does not exist", 404));
  }
  const resetToken = user.createResetPasswordToken();
  const resetUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/auth/reset-pwd/${resetToken}`;

  await user.save({ validateBeforeSave: false });

  await EmailServices.sendWithNodeMailer({
    email: user.email,
    subject: "Your password reset URL",
    message: `Forgot your password ? Click on this link ${resetUrl}`,
  });

  res.status(200).json({
    status: "success",
    message: "A password reset link has been sent to your email!",
  });
});

/**
 * Reset password of a user
 */
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetTokenExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError("Token expired or invalid", 400));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetTokenExpires = undefined;

  await user.save();

  res.status(200).json({
    status: "success",
    message: "Password has been reset successfully",
  });
});

/**
 * Updates password of a user
 */
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select("+password");

  if (!user || !(await user.verifyPassword(req.body.currentPassword))) {
    return next(
      new AppError("Your current password is wrong. Reset it or try again", 401)
    );
  }

  user.password = req.body.newPassword;
  user.passwordConfirm = req.body.newPasswordConfirm;

  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: "success",
    message: "Password has been changed successfully",
  });
});

/**
 * Refreshes the access token of a user.
 */
exports.refreshToken = asyncHandler(async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return next(new AppError("No refresh token", 400));
  }

  const decoded = await promisify(jwt.verify)(
    refreshToken,
    process.env.JWT_REFRESH_SECRET
  );

  const user = await User.findById(decoded.id).select("+refreshToken");

  if (!user) {
    return next(new AppError("User does not exist", 404));
  }

  if (!(await user.verifyRefreshToken(refreshToken))) {
    return next(new AppError("Invalid refresh token", 401));
  }
  sendTokens(user, 200, res);
});
