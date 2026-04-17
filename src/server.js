// import "dotenv/config";
// import express from "express";
// import cors from "cors";
// import pool from "./config/db.js";
// import authRoutes from "./routes/api/authRoutes.js";
// import testRoutes from "./routes/api/testRoutes.js";

// const app = express();
// const PORT = process.env.PORT || 5000;

// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// app.use((req, res, next) => {
//   console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
//   next();
// });

// app.use("/api/auth", authRoutes);
// app.use("/api/test", testRoutes);

// app.get("/", (req, res) => {
//   res.json({
//     success: true,
//     message: "QTrack API is running",
//     version: "1.0.0",
//     endpoints: {
//       auth: {
//         register: "POST /api/auth/register",
//         login: "POST /api/auth/login",
//         me: "GET /api/auth/me",
//       },
//       test: {
//         public: "GET /api/test/public",
//         protected: "GET /api/test/protected",
//         visitorOnly: "GET /api/test/visitor-only",
//         staffOnly: "GET /api/test/staff-only",
//         adminOnly: "GET /api/test/admin-only",
//         staffOrAdmin: "GET /api/test/staff-or-admin",
//         myData: "GET /api/test/my-data/:userId",
//         deleteToken: "DELETE /api/test/tokens/:userId/:tokenId",
//       },
//     },
//   });
// });

// app.get("/health", (req, res) => {
//   res.json({
//     success: true,
//     status: "healthy",
//     timestamp: new Date().toISOString(),
//     uptime: process.uptime(),
//   });
// });

// app.get("/test-db", async (req, res) => {
//   try {
//     const count = await pool.query("SELECT COUNT(*) as user_count FROM users");
//     const users = await pool.query(
//       "SELECT user_id, full_name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 10"
//     );
//     res.json({
//       success: true,
//       message: "database connection successful",
//       totalUsers: count.rows[0].user_count,
//       recentUsers: users.rows,
//     });
//   } catch (err) {
//     res.status(500).json({
//       success: false,
//       error: "database connection failed",
//       details: err.message,
//     });
//   }
// });

// app.use((req, res) => {
//   res.status(404).json({
//     success: false,
//     message: "route not found",
//     path: req.originalUrl,
//     method: req.method,
//   });
// });

// app.use((err, req, res, next) => {
//   console.error("unhandled error", err.stack);
//   res.status(500).json({
//     success: false,
//     message: "internal server error",
//     error: process.env.NODE_ENV === "development" ? err.message : undefined,
//   });
// });

// app.listen(PORT, () => {
//   console.log(`server running on http://localhost:${PORT}`);
//   console.log(`environment: ${process.env.NODE_ENV || "development"}`);
//   console.log(`database: ${process.env.DB_NAME} on ${process.env.DB_HOST}:${process.env.DB_PORT}`);
// });

import "dotenv/config";
import cors from "cors";
import express from "express";
import pool from "./config/db.js";
import authRoutes from "./routes/api/authRoutes.js"

const app = express();
const PORT = process.env.PORT || 5000 ;

app.use(express.json());
app.use(cors());

app.use("/api/auth" , authRoutes);
app.listen(PORT ,()=>{
  console.log(`server running on http://localhost:${PORT}`);
  
})


