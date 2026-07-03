import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import pool from "./config/db.js";
import authRoutes from "./routes/api/authRoutes.js"
import locationRoutes from "./routes/api/locations.js";
import serviceRoutes from "./routes/api/services.js";

import queueRoutes from "./routes/api/queues.js";
import tokenRoutes from "./routes/api/tokens.js";

const app = express();
const PORT = process.env.PORT || 5000 ;

import {initDb} from "./config/schema.js";

app.use((req, res, next) => {
  if (req.method === "GET") res.set("Cache-Control", "no-store");
  next();
});

app.use(express.json());
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

// Frontend joins a room per queue it's watching:
//   socket.emit("join_queue_room", queueId)
// and listens for:
//   socket.on("queue_updated", (payload) => { ...refetch or patch state... })
io.on("connection", (socket) => {
  socket.on("join_queue_room", (queueId) => {
    socket.join(`queue_${queueId}`);
  });
  socket.on("leave_queue_room", (queueId) => {
    socket.leave(`queue_${queueId}`);
  });
});

// Makes io reachable from controllers via req.app.get("io")
app.set("io", io);

app.use("/queues", queueRoutes);
app.use("/tokens", tokenRoutes);
app.use("/api/auth" , authRoutes);
app.use("/locations", locationRoutes);
app.use("/services", serviceRoutes);
app.get("/", (req, res) => {
  res.send("QTrack API Running");
});
httpServer.listen(PORT ,()=>{
  console.log(`server running on http://localhost:${PORT}`);
  initDb();
})


