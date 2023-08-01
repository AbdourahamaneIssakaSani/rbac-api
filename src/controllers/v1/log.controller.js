const { mongooseV1 } = require("../../config/database/mongo");
const AppLogger = require("../../utils/app-logger");

exports.getLogs = async (req, res) => {
  try {
    const page = req.query.page * 1 || 1;
    const limit = req.query.limit * 1 || 10;
    const skip = (page - 1) * limit;

    const queryObj = {};

    if (req.query.level) {
      queryObj.level = req.query.level;
    }

    if (req.query.message) {
      queryObj.message = new RegExp(req.query.message, "i"); // case-insensitive search
    }

    const collection = mongooseV1.collection("app-logs");
    const logs = await collection
      .find(queryObj)
      .skip(skip)
      .limit(limit)
      .toArray();

    const totalLogs = await collection.countDocuments(queryObj);

    res.status(200).json({
      status: "success",
      results: logs.length,
      total: totalLogs,
      page: page,
      next: page + 1,
      data: logs,
    });
  } catch (err) {
    AppLogger.error(err);
    res.status(500).json({
      status: "error",
      message: "An error occurred while fetching logs",
    });
  }
};
