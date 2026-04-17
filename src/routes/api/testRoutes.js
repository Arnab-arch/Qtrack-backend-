import express from "express";
import authMiddleware, {
  authorizeRoles,
  authorizeOwner,
  authorizeRoleOrOwner,
} from "../../middleware/authMiddleware.js";

const router = express.Router();

router.get("/public", (req, res) => {
  res.json({ success: true, message: "public endpoint, anyone can access" });
});

router.get("/protected", authMiddleware, (req, res) => {
  res.json({ success: true, message: "you are authenticated", user: req.user });
});

router.get("/visitor-only", authMiddleware, authorizeRoles("visitor"), (req, res) => {
  res.json({ success: true, message: "welcome visitor", user: req.user });
});

router.get("/staff-only", authMiddleware, authorizeRoles("staff"), (req, res) => {
  res.json({ success: true, message: "welcome staff", user: req.user });
});

router.get("/admin-only", authMiddleware, authorizeRoles("admin"), (req, res) => {
  res.json({ success: true, message: "welcome admin", user: req.user });
});

router.get("/staff-or-admin", authMiddleware, authorizeRoles("staff", "admin"), (req, res) => {
  res.json({ success: true, message: "access granted to staff or admin", user: req.user });
});

router.get("/my-data/:userId", authMiddleware, authorizeOwner("userId"), (req, res) => {
  res.json({ success: true, message: "your personal data", userId: req.params.userId });
});

router.delete(
  "/tokens/:userId/:tokenId",
  authMiddleware,
  authorizeRoleOrOwner("staff", "admin", "userId"),
  (req, res) => {
    res.json({
      success: true,
      message: "token deleted",
      userId: req.params.userId,
      tokenId: req.params.tokenId,
      deletedBy: req.user,
    });
  }
);

export default router;