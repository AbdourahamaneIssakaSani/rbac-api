const asyncHandler = require("./async.handler");

/**
 * Factory class to handle CRUD operations for MongoDB using mongoose models.
 */
class Factory {
  /**
   * Creates a new document in the database.
   *
   * @param {mongoose.Model} Model - The Mongoose model to use for the operation.
   * @returns {function} A function that handles the request and response for creating a document.
   */
  static create(Model) {
    return asyncHandler(async (req, res, next) => {
      const doc = await Model.create(req.body);
      res.status(201).json({
        status: "success",
        data: doc,
      });
    });
  }

  /**
   * Retrieves a single document from the database.
   *
   * @param {mongoose.Model} Model - The Mongoose model to use for the operation.
   * @returns {function} A function that handles the request and response for retrieving a document.
   */
  static get(Model) {
    return asyncHandler(async (req, res, next) => {
      const queryResults = Model.findById(req.params.id);

      if (req.query.fields) {
        const fields = req.query.fields.split(",").join(" ");
        queryResults.select(fields);
      }

      const doc = await queryResults;

      res.status(200).json({
        status: "success",
        data: doc,
      });
    });
  }

  /**
   * Retrieves all documents from the database.
   *
   * @param {mongoose.Model} Model - The Mongoose model to use for the operation.
   * @returns {function} A function that handles the request and response for retrieving all documents.
   */
  static getAll(Model) {
    return asyncHandler(async (req, res, next) => {
      let query = { ...req.query };

      const excludedFields = ["page", "sort", "limit", "fields"];

      excludedFields.forEach((field) => delete query[field]);

      // add $ sign to gt, gte, lt, lte mongo operators
      let queryString = JSON.stringify(query);

      queryString = queryString.replace(
        /\b(gt|gte|lt|lte)\b/g,
        (match) => `$${match}`
      );
      query = JSON.parse(queryString);

      let queryResults = Model.find(query);

      if (req.query.sort) {
        const sortBy = req.query.sort.split(",").join(" ");
        queryResults = queryResults.sort(sortBy);
      }
      if (req.query.fields) {
        const fields = req.query.fields.split(",").join(" ");
        queryResults.select(fields);
      }

      const page = req.query.page * 1 || 1;
      const limit = req.query.limit * 1 || 10;
      const skip = (page - 1) * limit;

      queryResults = queryResults.skip(skip).limit(limit);

      const docs = await queryResults;

      res.status(200).json({
        status: "success",
        results: docs.length,
        page: page,
        data: docs,
      });
    });
  }

  /**
   * Updates a single document in the database.
   *
   * @param {mongoose.Model} Model - The Mongoose model to use for the operation.
   * @returns {function} A function that handles the request and response for updating a document.
   */
  static update(Model) {
    return asyncHandler(async (req, res, next) => {
      const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });

      res.status(200).json({
        status: "success",
        data: doc,
      });
    });
  }

  /**
   * Deletes a single document from the database.
   *
   * @param {mongoose.Model} Model - The Mongoose model to use for the operation.
   * @returns {function} A function that handles the request and response for deleting a document.
   */
  static delete(Model) {
    return asyncHandler(async (req, res, next) => {
      const doc = await Model.findByIdAndDelete(req.params.id);

      res.status(204).json({
        status: "success",
        data: null,
      });
    });
  }
}

module.exports = Factory;
