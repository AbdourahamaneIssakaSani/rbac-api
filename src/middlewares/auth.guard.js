const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const AppError = require("../utils/app-error");
const asyncHandler = require("../utils/async.handler");
const User = require("../models/v1/user.model");
const Joi = require("joi");
const { JoiRequestBodyValidator } = require("../utils/joiValidator");

/**
 * Protects routes by checking for the presence of a valid JWT token in the request headers.
 * If a token is present, it is verified and the user associated with the token is added to the request object.
 * If no token is present, or if the token is invalid, an error is returned.
 */
exports.protect = asyncHandler(async (req, res, next) => {
  let accessToken;

  if (
    req.header("Authorization") &&
    req.header("Authorization").startsWith("Bearer")
  ) {
    accessToken = req.header("Authorization").split(" ")[1];
  }

  if (!accessToken) {
    return next(new AppError("Please log in to get access", 401));
  }

  const decoded = await promisify(jwt.verify)(
    accessToken,
    process.env.JWT_ACCESS_SECRET
  );

  //   make sure the validated token belongs to the user
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(new AppError("Token does not belong to this user", 401));
  }

  //   check if the password didn’t change after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError("Password changed recently, login again", 401));
  }
  req.user = currentUser;
  next();
});

/**
 * Verifies if the user has access rights to a route.
 * Access middleware
 * @param {...string} roles list of roles for a route
 * @returns {function} middleware function that checks if the user's role is in the list of allowed roles
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }
  };
};

/**
 * Checks if the user has the required privilege level to access a route.
 * @param {string} requiredLevel the required privilege level
 * @returns {function} middleware function that checks if the user's privilege level is greater than or equal to the required level
 */
exports.hasPrivilege = (requiredLevel) => {
  const levelPrivileges = {
    user: 1,
    admin: 2,
    root: 3,
  };

  return (req, res, next) => {
    if (levelPrivileges[req.user.role] >= levelPrivileges[requiredLevel]) {
      return next();
    } else {
      return next(
        AppError("You do not have permission to perform this action", 403)
      );
    }
  };
};

// check if the current user has higher privileges than the user being updated
exports.hasHigherPrivilege = asyncHandler(async (req, res, next) => {
  const levelPrivileges = {
    user: 1,
    admin: 2,
    root: 3,
  };

  const user = await User.findById(req.params.id);
  if (levelPrivileges[req.user.role] > levelPrivileges[user.role]) {
    return next();
  }
  return next(
    AppError("You do not have permission to perform this action", 403)
  );
});

/**
 * @function validateUserSignup
 * @description Joi validation middleware for user signup data. Validates firstName, lastName, email, password, and passwordConfirm fields.
 * @returns {object} Middleware to validate the request body using Joi
 */
exports.validateUserSignup = JoiRequestBodyValidator(
  Joi.object({
    firstName: Joi.string().min(2).required(),
    lastName: Joi.string().min(2).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    passwordConfirm: Joi.any().valid(Joi.ref("password")).required().messages({
      "any.only": '"passwordConfirm" must match "password"',
    }),
  }).messages({
    "object.unknown": "{#label} is not allowed",
    "string.min": '"{#label}" must be at least {#limit} characters',
    "any.required": '"{#label}" is required',
    "string.email": '"{#label}" must be a valid email',
  })
);

/**
 * @function validateLogin
 * @description Joi validation middleware for user login data. Validates email and password fields.
 * @returns {object} Middleware to validate the request body using Joi
 */
exports.validateUserLogin = JoiRequestBodyValidator(
  Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }).unknown(false)
);

/**
 * @function validateUpdatePassword
 * @description Joi validation middleware for updating the user's password. Validates currentPassword, newPassword, and newPasswordConfirm fields.
 * @returns {object} Middleware to validate the request body using Joi
 */
exports.validateUpdatePassword = JoiRequestBodyValidator(
  Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required(),
    newPasswordConfirm: Joi.any()
      .valid(Joi.ref("newPassword"))
      .required()
      .messages({
        "any.only": "newPasswordConfirm must match newPassword",
      }),
  }).unknown(false)
);

/**
 * @function validateForgotPassword
 * @description Joi validation middleware for password recovery. Validates the email field to send a recovery link to the user.
 * @returns {object} Middleware to validate the request body using Joi
 */
exports.validatePasswordLessOrForgotPassword = JoiRequestBodyValidator(
  Joi.object({
    email: Joi.string().email().required(),
  }).unknown(false)
);

/**
 * @function validateResetPassword
 * @description Joi validation middleware for resetting the user's password. Validates code, password, and passwordConfirm fields.
 * @returns {object} Middleware to validate the request body using Joi
 */
exports.validateResetPassword = JoiRequestBodyValidator(
  Joi.object({
    code: Joi.number().required(),
    password: Joi.string().min(6).required(),
    passwordConfirm: Joi.any().valid(Joi.ref("password")).required().messages({
      "any.only": '"passwordConfirm" must match "password"',
    }),
  }).unknown(false)
);

/**
 * @function validateRefreshToken
 * @description Joi validation middleware for refreshing the user's access token. Validates the refreshToken field.
 * @returns {object} Middleware to validate the request body using Joi
 */
exports.validateRefreshToken = JoiRequestBodyValidator(
  Joi.object({
    refreshToken: Joi.string().required(),
  }).unknown(false)
);

/**
 * @function validate2FALogin
 * @description Joi validation middleware for two-factor authentication. Validates the id and code fields.
 * @returns {object} Middleware to validate the request body using Joi
 */
exports.validate2FALogin = JoiRequestBodyValidator(
  Joi.object({
    id: Joi.string().required(),
    code: Joi.string().required(),
  }).unknown(false)
);
