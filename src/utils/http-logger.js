const morgan = require("morgan");
const json = require("morgan-json");
const AppLogger = require("./app-logger");

// log format template for morgan
const format = json({
  method: ":method",
  url: ":url",
  status: ":status",
  contentLength: ":res[content-length]",
  responseTime: ":response-time",
});

/**
 * HTTP logger middleware
 * @description  Logs all HTTP requests and responses to the console and file transport in the logs directory.
 * @returns {function}  A middleware function that logs HTTP requests and responses using morgan
 */
const HttpLogger = morgan(format, {
  stream: {
    write: (message) => {
      const { method, url, status, contentLength, responseTime } =
        JSON.parse(message);
      let errorLevel;
      if (status >= 500) {
        errorLevel = "error";
      } else if (status >= 400) {
        errorLevel = "warn";
      } else {
        errorLevel = "info";
      }

      AppLogger.log({
        // FIXME: This is not working
        // level: function () {
        //   if (status >= 500) {
        //     return "error";
        //   } else if (status >= 400) {
        //     return "warn";
        //   } else {
        //     return "info";
        //   }
        // },
        level: `${errorLevel}`,
        label: "http",
        timestamp: new Date().toISOString(),
        message: `${method} ${url} ${status} ${contentLength} ${responseTime}ms`,
      });
    },
  },
});

module.exports = HttpLogger;
