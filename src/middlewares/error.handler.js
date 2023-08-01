const AppError = require("../utils/app-error");
const AppLogger = require("../utils/app-logger");
const MongooseAppError = require("../utils/mongoose-error");

/**
 * Sends error to developers with all details, and used for developement stage.
 * @param {Error} err - Error object
 * @param {Response} res - ExpressJS response object
 */
function sendDevelopmentError(err, res) {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
}

/**
 * Sends limited messages of an error to the end user.
 * @param {AppError} err - AppError object
 * @param {Response} res - ExpressJS response object
 */
function sendProductionError(err, res) {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    // if not operational, log it on console and send generic message.
    AppLogger.error("Error", err);
    res.status(500).json({
      status: "error",
      message: "Something went wrong!",
    });
  }
}

/**
 * Handles error for invalid jwt token.
 * @param {Error} err - Error object thrown when invalid token is encountered
 * @returns {AppError} - Custom error object containing message and status code
 */
function handleJWTError(err) {
  return new AppError("Invalid token", 401);
}

/**
 * Handles error for expired jwt token.
 * @param {Error} err - Error object thrown when expired token is encountered
 * @returns {AppError} - Custom error object containing message and status code
 */
function handleJWTExpiredError(err) {
  return new AppError("Token expired, login again", 401);
}

/**
 * Error handling middleware at the application level.
 *
 * @param {Error} err - The error object that occurred in the application
 * @param {Request} req - The request object that contains information about the incoming request
 * @param {Response} res - The response object that will be used to send a response back to the client
 * @param {function} next - A function that can be called to pass control to the next middleware function in the chain
 *
 * This middleware handles all errors that occur in the application and sends appropriate
 * responses to the client depending on the environment (development or production).
 * In development mode, all error details are sent to the developer.
 * In production mode, limited error details are sent to the client.
 */
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  if (process.env.NODE_ENV === "development") {
    sendDevelopmentError(err, res);
  } else if (process.env.NODE_ENV == "production") {
    let error = Object.create(err, Object.getOwnPropertyDescriptors(err));

    if (error.name === "ValidationError")
      error = MongooseAppError.handleValidationError(error);

    if (error.name === "CastError")
      error = MongooseAppError.handleCastError(error);

    if (error.code === 11000)
      error = MongooseAppError.handleDuplicateField(error);

    if (error.name === "JsonWebTokenError") error = handleJWTError(error);

    if (error.name === "TokenExpiredError")
      error = handleJWTExpiredError(error);

    sendProductionError(error, res);

    // res.status(500).json({
    //   status: "error",
    //   err,
    //   error,
    // });
  }
};
