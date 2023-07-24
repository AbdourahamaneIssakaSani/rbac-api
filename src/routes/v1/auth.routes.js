const express = require("express");
const AuthController = require("../../controllers/v1/auth.controller");
const AuthGuard = require("../../middlewares/auth.guard");
const { validateSignup } = require("../../middlewares/users.guard");
const router = express.Router();

router.post("/signup", validateSignup, AuthController.signup);
router.post("/login", AuthController.login);
router.get("/logout", AuthGuard.protect, AuthController.logout);
router.post("/forgot-pwd", AuthController.forgotPassword);

router.post("/login/passwordless", AuthController.passwordLessLogin);

router.get("/login/2fa", AuthGuard.protect, AuthController.setTwoFactorLogin);
router.post("/login/2fa", AuthController.twoFactorLogin);
router.get("/login/:token", AuthController.verifyPasswordLessLogin);
router.patch("/reset-pwd/:token", AuthController.resetPassword);

router.patch("/update-pwd", AuthGuard.protect, AuthController.updatePassword);

module.exports = router;
