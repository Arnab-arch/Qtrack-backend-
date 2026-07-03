import express from "express";
import {
  getLocations,
  getLocationById,
  createLocation,
  createLocationFromSearch,
  searchLocationByName,
  updateLocation,
  deleteLocation,
  distancecal,
} from "../../controllers/locationController.js";
import { Authmiddleware, Authroles } from "../../middleware/authMiddleware.js";
import { ROLES } from "../../config/roles.js";

const router = express.Router();

router.get("/search", searchLocationByName);         
router.get("/", getLocations);                        
router.get("/:id", getLocationById);                  


router.post(
  "/",
  Authmiddleware,
  Authroles(ROLES.ADMIN ,ROLES.STAFF),
  createLocation    
);                                 
router.post(
  "/from-search",
  Authmiddleware,
  Authroles(ROLES.ADMIN ,ROLES.STAFF),
  createLocationFromSearch                           
);
router.patch(
  "/:id",
  Authmiddleware,
  Authroles(ROLES.ADMIN ,ROLES.STAFF),
  updateLocation                                     
);

router.delete(
  "/:id",
  Authmiddleware,
  Authroles(ROLES.ADMIN ,ROLES.STAFF),
  deleteLocation                                     
);

router.post("/:id/distance",distancecal);

export default router;


