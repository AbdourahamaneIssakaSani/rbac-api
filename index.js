const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const cors = require("cors");
const hpp = require("hpp");
const path = require("path");
const globalErrorHandler = require("./src/middlewares/error.handler");
const HttpLogger = require("./src/utils/http-logger");
const AppLogger = require("./src/utils/app-logger");
const AppError = require("./src/utils/app-error");
const v1Routes = require("./src/routes/v1");
const { connectV1Database } = require("./src/config/database/mongo");
const rateLimiterGuard = require("./src/middlewares/rate.guard");

require("dotenv").config({
  path: `./src/config/envs/.env.${process.env.NODE_ENV}`,
});

process.on("uncaughtException", (err) => {
  AppLogger.error(
    err ? err.message : "Uncaught exception with no error object"
  );
  AppLogger.error(err ? err.stack : "No stack trace available");
  process.exit(1);
});

const app = express();

const PORT = process.env.PORT || 9000;

app.set("view engine", "pug");

app.set("views", path.join(__dirname, "src/views"));

app.enable("trust proxy");

app.use(HttpLogger);

// parse body json data with limit of 10kb
app.use(express.json({ limit: "10kb" }));
// parse data from urlencoded form
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
// set security HTTP headers
app.use(helmet());
app.use(cors());
// Data sanitization against NoSQL query injection
app.use(mongoSanitize());
app.use(xss());

if (process.env.NODE_ENV !== "development") {
  app.use(rateLimiterGuard);
}
// protect against parameter pollution
// add the parameters you want to whitelist (to be duplicated in the query string)
app.use(
  hpp({
    whitelist: [],
  })
);

app.use("/api/v1", v1Routes);

app.get("/", (req, res) => {
  res.send("ZPlatform Server is running");
});

// Middleware for 404 routes
app.all("*", (req, res, next) => {
  next(new AppError(`Can’t find ${req.originalUrl} on this server`));
});

// error handler
app.use(globalErrorHandler);

let server;

(async () => {
  await connectV1Database();

  server = app.listen(PORT, () => {
    AppLogger.info(`ZPlatform Server listening on port ${PORT} 🚀`);
  });
})();

process.on("unhandledRejection", (err) => {
  AppLogger.error(
    err ? err.message : "Unhandled rejection with no error object"
  );

  AppLogger.error(err ? err.stack : "No stack trace available");

  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});
