const express = require("express");
const AuthGuard = require("../../middlewares/auth.guard");
const LogController = require("../../controllers/v1/log.controller");
const router = express.Router();

router.get(
  "/",
  AuthGuard.protect,
  AuthGuard.hasPrivilege("auditor"),
  LogController.getLogs
);

module.exports = router;
