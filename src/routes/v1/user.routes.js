const express = require("express");
const UserController = require("../../controllers/v1/user.controller");
const AuthGuard = require("../../middlewares/auth.guard");
const MediaGuard = require("../../middlewares/media.interceptor");
const UsersGuard = require("../../middlewares/users.guard");

const router = express.Router();

router
  .route("/verify-email")
  .post(AuthGuard.protect, UserController.sendVerifyEmail)
  .get(UserController.verifyEmail);

router
  .route("/me")
  .get(AuthGuard.protect, UserController.getMe, UserController.getUser)
  .delete(AuthGuard.protect, UserController.deleteMe)
  .patch(
    AuthGuard.protect,
    MediaGuard.uploadUserMedia,
    MediaGuard.resizeImage,
    UsersGuard.validateUpdateUser,
    UserController.updateMe
  );

router
  .route("/:id")
  .all(AuthGuard.protect, AuthGuard.hasHigherPrivilege)
  .patch(UsersGuard.validateAssingRoleOrBlock, UserController.updateMe)
  .delete(AuthGuard.hasPrivilege("root"), UserController.deleteMe);

router.get(
  "/",
  AuthGuard.protect,
  AuthGuard.restrictTo("admin"),
  UserController.getAll
);

module.exports = router;
