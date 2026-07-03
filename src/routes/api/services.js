import express from "express";
import {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getServiceQueues,
} from "../../controllers/serviceController.js";
import { Authmiddleware, Authroles } from "../../middleware/authMiddleware.js";

const router = express.Router();


router.get("/", getServices);                           
router.get("/:id", getServiceById);                     
router.get("/:id/queues", getServiceQueues);            


router.post(
  "/",
  Authmiddleware,
  Authroles("staff", "admin"),
  createService                                         
);

router.patch(
  "/:id",
  Authmiddleware,
  Authroles("staff", "admin"),
  updateService                                         
);


router.delete(
  "/:id",
  Authmiddleware,
  Authroles("admin"),
  deleteService                                         
);

export default router;