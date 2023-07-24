const User = require("../../models/v1/user.model");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const QRCode = require("qrcode");
const speakeasy = require("speakeasy");
const asyncHandler = require("../../utils/async.handler");
const AppError = require("../../utils/app-error");
const EmailServices = require("../../utils/email.service");
const { oAuth2Client, oauth2, authUrl } = require("../../utils/google");
const { sendVerifyEmail } = require("./user.controller");

/**
 * Sign jwt token
 * @param {Object} payload jwt payload object
 * @returns {String} jwt token
 */
const signJWTToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

/**
 * Sends access token for signup and login.
 * @param {User} user user object
 * @param {Number} statusCode http status code to send
 * @param {Response} res response object
 */
const sendToken = (user, statusCode, res) => {
  const payload = { id: user._id };
  const accessToken = signJWTToken(payload);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ), // 90 days
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  res.cookie("accessToken", accessToken, cookieOptions);

  // removes the password value before responding
  user.password = undefined;

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

  req.user = newUser;
  await sendVerifyEmail(req);

  sendToken(newUser, 201, res);
});

/**
 * Login a user with email and password.
 */
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please provide email/password", 400));
  }

  const user = await User.findOne({ email });

  if (!user || !(await user.verifyPassword(password))) {
    return next(new AppError("Incorrect email or password", 401));
  }

  if (user.hasTwoFactorAuth) {
    return res.status(200).json({
      status: "success",
      message: "Provide the 2FA token to continue",
      data: { id: user._id },
    });
  } else {
    sendToken(user, 200, res);
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
  // Get the token from the URL
  const { token } = req.params;

  // Decode the token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // Find the user based on the id in the token
  const user = await User.findById(decoded.id);

  if (!user) {
    return next(
      new AppError("User belonging to this token no longer exists.", 401)
    );
  }

  // Send a new JWT to the user for their session
  sendToken(user, 200, res);
});

/**
 * Setup 2FA for a user.
 */
exports.setTwoFactorLogin = asyncHandler(async (req, res, next) => {
  // Generate a secret key.
  const user = await User.findById(req.user.id);
  // Save this secret for the user in the database.
  const secret = speakeasy.generateSecret({
    length: 20,
    name: `ZPlatform (${user.email})`,
    issuer: "ZPlatform",
  });

  user.twoFactorSecret = secret.base32;
  user.hasTwoFactorAuth = true;
  await user.save({ validateBeforeSave: false });

  // Get the data URL of the authenticator URL
  QRCode.toDataURL(secret.otpauth_url, function (err, data_url) {
    res.render("qrcode", { url: data_url });
  });
});

/**
 * Login a user with 2FA code.
 */
exports.twoFactorLogin = asyncHandler(async (req, res, next) => {
  const { code, id } = req.body;

  const user = await User.findById(id);

  const secret = user.twoFactorSecret;

  const verified = speakeasy.totp.verify({
    secret: secret,
    encoding: "base32",
    token: code,
  });

  if (verified) {
    sendToken(user, 200, res);
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

  // res.status(200).json({
  //   resetToken,
  //   resetUrl,
  // });

  res.status(200).json({
    status: "success",
    message: "A password reset link has been sent to your email!",
  });
});

/**
 * Reset password of a user
 */
exports.resetPassword = asyncHandler(async (req, res, next) => {
  // create hash and get user who has it
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
  const user = await User.findById(req.body.id);

  if (!user || !(await user.verifyPassword(req.body.currentPassword))) {
    return next(
      new AppError("Your current password is wrong. Reset it or try again", 401)
    );
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  await user.save();

  res.status(200).json({
    status: "success",
    message: "Password has been changed successfully",
  });
});

/**
 * Redirects the user to the Google login page.
 * @param {import("express").Request} req The Express request object.
 * @param {import("express").Response} res The Express response object.
 */
exports.googleLogin = (req, res) => {
  // Save the returnTo parameter in the session
  req.returnTo = req.query.returnTo;

  res.redirect(authUrl);
};

/**
 * Handles the Google login callback and creates a session for the user.
 * @param {import("express").Request} req The Express request object.
 * @param {import("express").Response} res The Express response object.
 */
exports.googleLoginCallback = async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({
      message: "No code",
    });
  }

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: "Internal server error",
    });
  }

  // get profile info
  try {
    const { data } = await oauth2.userinfo.get();

    const user = await User.findOneAndUpdate(
      { email: data.email },
      {
        $set: {
          firstName: data.given_name,
          lastName: data.family_name,
          email: data.email,
          googleId: data.id,
        },
      },
      { new: true, upsert: true, runValidators: true }
    );

    const token = generateToken(user.id);

    // sessionStore.set(req.session.id, req.session, (err) => {
    //   if (err) {
    //     // next(err); TODO: handle error from sessionStore
    //     console.err(err);
    //   }
    // });

    res.cookie("accessToken", token, {
      httpOnly: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    const returnUrl = req.returnTo || process.env.FRONTEND_URL;

    res.redirect(returnUrl);
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};
