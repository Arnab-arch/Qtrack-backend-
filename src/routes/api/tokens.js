import express from "express";
import {
  getMyTokens,
  updateTokenStatus,
} from "../../controllers/tokenController.js";

import {
  Authmiddleware,
  Authroles,
} from "../../middleware/authMiddleware.js";

const router = express.Router();

router.get("/my-tokens", Authmiddleware, getMyTokens);

router.patch(
  "/:id",
  Authmiddleware,
  Authroles("staff", "admin"),
  updateTokenStatus
);

export default router;