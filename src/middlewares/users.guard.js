const AppError = require("../utils/app-error");
const validate = require("validate.js");
const { JoiRequestBodyValidator } = require("../utils/joiValidator");
const Joi = require("joi");

exports.validateUpdateUser = JoiRequestBodyValidator(
  Joi.object({
    firstName: Joi.string().min(2),
    lastName: Joi.string().min(2),
    active: Joi.boolean(),
    maritalStatus: Joi.string().valid(
      "Single",
      "Married",
      "Divorced",
      "Widowed"
    ),
    age: Joi.number().min(0),
    picture: Joi.string(),
  }).messages({
    "object.unknown": "{#label} is not allowed",
    "string.min": '"{#label}" must be at least {#limit} characters',
    "any.required": '"{#label}" is required',
    "string.email": '"{#label}" must be a valid email',
  })
);

exports.validateAssingRole = JoiRequestBodyValidator(
  Joi.object({
    role: Joi.string().valid("user", "auditor", "admin", "root").required(),
  }).unknown(false)
);

exports.validateChangeEmail = JoiRequestBodyValidator(
  Joi.object({
    email: Joi.string().email().required(),
  }).unknown(false)
);
