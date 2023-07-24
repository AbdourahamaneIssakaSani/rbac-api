const AppError = require("../utils/app-error");
const validate = require("validate.js");

exports.updateUser = (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password updates. Please use /updateMyPassword.",
        400
      )
    );
  }

  if (req.body.role) {
    return next(new AppError("This route is not for role updates.", 403));
  }

  if (req.body.accountStatus) {
    return next(
      new AppError("This routes if not for account verification", 403)
    );
  }

  if (req.file) {
    req.body.picture = req.file.filename;
  }
  next();
};

exports.validateSignup = (req, res, next) => {
  const constraints = {
    firstName: {
      presence: true,
      length: { minimum: 2 },
    },
    lastName: {
      presence: true,
      length: { minimum: 2 },
    },
    email: {
      presence: true,
      email: true,
    },
    password: {
      presence: true,
      length: { minimum: 6 },
    },
    passwordConfirm: {
      presence: true,
      equality: "password",
    },
  };

  const hasErrors = validate(req.body, constraints);

  if (!hasErrors) {
    return next();
  }

  const messages = [];
  hasErrors.firstName && messages.push(hasErrors.firstName[0]);
  hasErrors.lastName && messages.push(hasErrors.lastName[0]);
  hasErrors.email && messages.push(hasErrors.email[0]);
  hasErrors.password && messages.push(hasErrors.password[0]);
  hasErrors.passwordConfirm && messages.push(hasErrors.passwordConfirm[0]);

  const message = messages.join(". ");

  return next(new AppError(message, 400));
};
