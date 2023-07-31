const { createLogger, format, transports } = require("winston");
const { combine, timestamp, json, errors } = format;
require("winston-mongodb");

require("dotenv").config({
  path: `./src/config/envs/.env.${process.env.NODE_ENV}`,
});

const fileTransportOptions = {
  level: "error",
  filename: "./logs/app.log",
  handleExceptions: true,
  json: true,
  maxsize: 5242880, // 5MB
  maxFiles: 5, // 5 files max of 5MB each
  colorize: false,
};

const databaseTransportOptions = {
  level: "error", // only save errors in the database
  db: process.env.V1_MONGO_URI,
  options: {
    useUnifiedTopology: true,
    useNewUrlParser: true,
  },
  collection: "app-logs",
  format: combine(errors({ stack: true }), timestamp(), json()),
};

// Common transports
const appTransports = [
  new transports.Console({
    level: "debug",
    handleExceptions: true,
    colorize: true,
    format: format.combine(
      format.colorize(),
      format.timestamp(),
      format.printf((info) => {
        if (!info.label) {
          info.label = "console";
        }
        return `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`;
      })
    ),
  }),
  new transports.File(fileTransportOptions),
];

// If not in test environment, add MongoDB transport
if (process.env.NODE_ENV !== "test") {
  appTransports.push(new transports.MongoDB(databaseTransportOptions));
}

/**
 * Application logger middleware
 * @description  Logs all application events to the console, file transport in the logs directory and database.
 * @returns {object}  Application logger
 */
const AppLogger = createLogger({
  transports: appTransports,
  exitOnError: false,
});

module.exports = AppLogger;
