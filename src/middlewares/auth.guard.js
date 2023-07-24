const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const AppError = require("../utils/app-error");
const asyncHandler = require("../utils/async.handler");
const User = require("../models/v1/user.model");

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
    process.env.JWT_SECRET
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
 *
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
      next();
    } else {
      res.status(403).send("Access denied. Insufficient privileges.");
    }
  };
};
