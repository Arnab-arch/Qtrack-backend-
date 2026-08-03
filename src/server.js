import dotenv from "dotenv";
dotenv.config();
import http from "http";
import cors from "cors";
import express from "express";
import pool from "./config/db.js";
import authRoutes from "./routes/api/authRoutes.js";
import locationRoutes from "./routes/api/locations.js";
import serviceRoutes from "./routes/api/services.js";
import queueRoutes from "./routes/api/queues.js";
import tokenRoutes from "./routes/api/tokens.js";
import { Server } from "socket.io";

const app = express();
const PORT = process.env.PORT || 5000;

import { initDb } from "./config/schema.js";
import { Socket } from "net";
// server we create a server originally app.listen() creates it own server but socket.io needs a new one
// so we made one
const server = http.createServer(app);
// create server for socket we pass cors because socket doesnt have its own cors we have to mention it on our own
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});
app.set("io", io);
// we make the connection it fires once per browser tab that connects  socket ==== represnts one browser tab connection

// var client = 0  ;

io.on("connection", (socket) => {
  console.log("socket connected", socket.id);

  socket.on("joinQueue", (queueId) => {
    socket.join(`queue_${queueId}`);
    console.log(`Socket ${socket.id} joined room queue_${queueId}`);
  });

  socket.on("joinUser", (userId) => {
    socket.join(`user_${userId}`);
    console.log(`Socket ${socket.id} joined room user_${userId}`);
  });
  // send a data after a certain time
  // setTimeout(()=>{
  //   socket.send("user got a message after 2 sec")
  // },2000)

  // the above example is a built in function we can make our custom event here is how using emit

  setTimeout(() => {
    socket.emit("test", "this is a custom event from server ");
  }, 2000);

  socket.on("clientevent", (data) => {
    console.log(data);
  });

  socket.on("disconnect", () => {
    console.log("socket disconnected", socket.id);
  });
});

// io.on("connection" , (socket)=>{
//   client++ ;
//   io.sockets.emit('broadcast' , `${client} connected`);
//   console.log("connected new client ");

// })

app.use((req, res, next) => {
  if (req.method === "GET") res.set("Cache-Control", "no-store");
  next();
});

app.use(express.json());
app.use(cors());

app.use("/queues", queueRoutes);
app.use("/tokens", tokenRoutes);
app.use("/api/auth", authRoutes);
app.use("/locations", locationRoutes);
app.use("/services", serviceRoutes);

app.get("/", (req, res) => {
  res.send("QTrack API Running");
});

server.listen(PORT, () => {
  console.log(`server running on http://localhost:${PORT}`);
  initDb();
});



// server setup 

// import http from "http";
// import { Server } from "socket.io";

// const server = http.createServer(app)
// const io = new Server(server , {object contaiing cor with origin for frintend url application with methiods } )


// app.set("io",io) ;     makes io reachable to any services within our backend application 

// server.listen(PORT , ()=>{})



// connection and rooms 

// server 


// io.on("connection"  ,(socket)=>{           io is the server for socket.io and socket is nothing but a 
//   argument we paas 
//   console.log("newconnection " socket.id);

//   socket.on("join queue" , (queueID)=>{
//     socket.join(`queue_${queueID}`)      // join(name) crates and subscribes to the room 
//   })

//   socket.on("disconnect" , ()=>{})

  
// })


// anywhere in our backend 

// const io = req.app.get("io") ;
// io.to(`queueu_${id}`).emit("messsage" , {data})



// client side 

// import {io} from "socket.io-client"

// const socket = io("backend ka url")

// socket.on("connect" ,()=>{
//   socket.emit("joinQueue" , 2 )     // ask the server to put in this room with the id 
// })