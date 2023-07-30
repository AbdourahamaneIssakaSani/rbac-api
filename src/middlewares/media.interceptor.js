const multer = require("multer");
const sharp = require("sharp");
const AppError = require("../utils/app-error");
const asyncHandler = require("../utils/async.handler");

const uploadImage = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image")) {
      cb(new AppError("Not an image! Please upload an image.", 400), false);
    }
    cb(null, true);
  },
});

exports.uploadUserMedia = uploadImage.fields([
  { name: "picture", maxCount: 1 },
  { name: "document", maxCount: 1 },
]);

exports.resizeImage = asyncHandler(async (req, res, next) => {
  if (!req.files) return next();

  // process picture
  if (req.files.picture) {
    req.files.picture[0].filename = `user-${req.user.id}-${Date.now()}.jpeg`;
    await sharp(req.files.picture[0].buffer)
      .resize(500, 500)
      .toFormat("jpeg")
      .jpeg({ quality: 90 })
      .toFile(`uploads/img/users/${req.files.picture[0].filename}`);
  }

  // process document
  if (req.files.document) {
    req.body.accountStatus = "PENDING VERIFICATION";
    req.files.document[0].filename = `user-${
      req.user.id
    }-document-${Date.now()}.jpeg`;
    await sharp(req.files.document[0].buffer)
      .resize(500, 500)
      .toFormat("jpeg")
      .toFile(`uploads/img/documents/${req.files.document[0].filename}`);
  }

  next();
});
