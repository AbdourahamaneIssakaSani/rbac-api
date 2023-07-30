const crypto = require("crypto");
const User = require("../../models/v1/user.model");
const asyncHandler = require("../../utils/async.handler");
const EmailServices = require("../../utils/email.service");
const Factory = require("../../utils/factory");
const AppError = require("../../utils/app-error");

/**
 * Gets id of the user from the token and passes it to params
 * @param {*} req
 */
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.getUser = Factory.get(User);

exports.getAll = Factory.getAll(User);

exports.updateMe = Factory.update(User);

exports.deleteMe = Factory.delete(User);

exports.sendVerifyEmail = async (req) => {
  const user = await User.findById(req.user.id);
  const verifyEmailToken = user.createEmailVerficationToken();
  user.emailVerified = false;
  await user.save({ validateBeforeSave: false });

  // create verification email url
  const verifyEmailUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/users/verify-email/${verifyEmailToken}`;

  // send email
  await EmailServices.sendWithNodeMailer({
    email: user.email,
    subject: "Verify your email",
    message: `Hi ${user.firstName}. We are glad you want to verify your email. Click the link below to verify your email address and complete your profile setup.\n\n${verifyEmailUrl}`,
  });
};

exports.verifyEmail = asyncHandler(async (req, res, next) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    verifyEmailToken: hashedToken,
  });

  if (!user) {
    return next(new AppError("Verfication failed, request again!", 400));
  }

  user.verifyEmailToken = undefined;
  user.emailVerified = true;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: "success",
    message: "Email verified successfully",
  });
});
