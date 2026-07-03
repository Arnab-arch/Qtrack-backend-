import express from "express";
import {
  createQueue,
  getQueues,
  getQueuesBrowse,
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
import { getQueuesByService } from "../../controllers/queueController.js";
import { getQueueEta } from "../../helpers/timeEstimation.js";

const router = express.Router();

router.post("/", Authmiddleware, createQueue);
router.get("/", getQueues);
router.get("/browse", getQueuesBrowse);
router.get(
  "/service/:service_id",
  getQueuesByService
);

router.get("/:id/eta", getQueueEta);
router.get("/:id/stats", Authmiddleware, getQueueStats);
router.get("/:id", getQueueById);

router.patch("/:id", Authmiddleware, Authroles("staff", "admin"), updateQueueStatus);
router.delete("/:id", Authmiddleware, Authroles("staff", "admin"), deleteQueue);

router.post("/:id/join", Authmiddleware, joinQueue);
router.post("/:id/next", Authmiddleware, Authroles("staff", "admin"), callNextToken);

export default router;