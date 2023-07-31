const express = require("express");
const AuthController = require("../../controllers/v1/auth.controller");
const AuthGuard = require("../../middlewares/auth.guard");
const router = express.Router();

router.post("/signup", AuthGuard.validateUserSignup, AuthController.signup);
router.post("/login", AuthGuard.validateUserLogin, AuthController.login);
router.get("/logout", AuthGuard.protect, AuthController.logout);
router.post(
  "/forgot-pwd",
  AuthGuard.validatePasswordLessOrForgotPassword,
  AuthController.forgotPassword
);
router.post(
  "/refresh-token",
  AuthGuard.validateRefreshToken,
  AuthController.refreshToken
);
router.post(
  "/login/passwordless",
  AuthGuard.validatePasswordLessOrForgotPassword,
  AuthController.passwordLessLogin
);

router.get("/login/2fa", AuthGuard.protect, AuthController.setTwoFactorLogin);
router.post(
  "/login/2fa",
  AuthGuard.validate2FALogin,
  AuthController.twoFactorLogin
);
router.get("/login/:token", AuthController.verifyPasswordLessLogin);
router.patch("/reset-pwd/:token", AuthController.resetPassword);

router.patch(
  "/update-pwd",
  AuthGuard.protect,
  AuthGuard.validateUpdatePassword,
  AuthController.updatePassword
);

module.exports = router;
