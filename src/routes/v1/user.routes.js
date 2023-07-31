const express = require("express");
const UserController = require("../../controllers/v1/user.controller");
const AuthGuard = require("../../middlewares/auth.guard");
const MediaGuard = require("../../middlewares/media.interceptor");
const UsersGuard = require("../../middlewares/users.guard");

const router = express.Router();

router.post("/verify-email", AuthGuard.protect, UserController.sendVerifyEmail);
router.get("/verify-email/:token", UserController.verifyEmail);

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

router.patch("/me/change-email", AuthGuard.protect, UserController.updateEmail);

router
  .route("/:id")
  .all(AuthGuard.protect, AuthGuard.hasHigherPrivilege)
  .get(UserController.getUser)
  .patch(UsersGuard.validateAssingRoleOrBlock, UserController.updateMe)
  .delete(AuthGuard.hasPrivilege("root"), UserController.deleteMe);

router.get(
  "/",
  AuthGuard.protect,
  // AuthGuard.restrictTo("admin", "root"),
  UserController.getAll
);

module.exports = router;
