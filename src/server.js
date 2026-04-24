import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import express from "express";
import pool from "./config/db.js";
import authRoutes from "./routes/api/authRoutes.js"
import queueRoutes from "./routes/api/queues.js";
// import tokenRoutes from "./routes/api/tokens.js";

const app = express();
const PORT = process.env.PORT || 5000 ;

app.use(express.json());
app.use(cors());

app.use("/queues", queueRoutes);
// app.use("/tokens", tokenRoutes);
app.use("/api/auth" , authRoutes);
app.listen(PORT ,()=>{
  console.log(`server running on http://localhost:${PORT}`);
  
})


