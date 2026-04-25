import express from "express";
import {
  createQueue,
  getQueues,
  getQueueById,
  updateQueueStatus,
  deleteQueue,
  joinQueue,
  callNextToken,
  getQueueStats,
} from "../../controllers/queueController.js";

import {
  Authmiddleware,
  Authroles,
} from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", Authmiddleware, createQueue);
router.get("/", getQueues);

router.get("/:id/stats", Authmiddleware, getQueueStats);
router.get("/:id", getQueueById);

router.patch("/:id", Authmiddleware, Authroles("staff", "admin"), updateQueueStatus);
router.delete("/:id", Authmiddleware, Authroles("staff", "admin"), deleteQueue);

router.post("/:id/join", Authmiddleware, joinQueue);
router.post("/:id/next", Authmiddleware, Authroles("staff", "admin"), callNextToken);

export default router;