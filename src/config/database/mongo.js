const mongoose = require("mongoose");
const AppLogger = require("../../utils/app-logger");

const mongooseV1 = mongoose.createConnection();

mongoose.set("strictQuery", false);

const connectV1Database = async () => {
  await mongooseV1
    .openUri(process.env.V1_MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => AppLogger.info("Connected to V1 MongoDB 🚀"));
};

module.exports = {
  mongooseV1,
  connectV1Database,
};
