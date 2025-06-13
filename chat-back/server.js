require("dotenv").config();

const mongoose = require("mongoose");
mongoose.connect(process.env.DATABASE, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
});

mongoose.connection.on("error", (err) => {
  console.log("Mongoose Connection ERROR: " + err.message);
});

mongoose.connection.once("open", () => {
  console.log("MongoDB Connected!");
});

//Bring in the models
require("./models/User");
require("./models/Chatroom");
require("./models/Message");

const app = require("./app");

const server = app.listen(8000, () => {
  console.log("Server listening on port 8000");
});

const io = require("socket.io")(server, {
  allowEIO3: true,
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const jwt = require("jsonwebtoken");

const Message = mongoose.model("Message");
const User = mongoose.model("User");

// Add endpoint to get messages for a chatroom
const express = require("express");
const appExpress = app; // app is already express()
appExpress.get("/chatroom/:id/messages", async (req, res) => {
  // Return all messages for the chatroom, including _id
  const messages = await Message.find({ chatroom: req.params.id })
    .sort({ _id: 1 })
    .populate("user", "name")
    .lean();
  // Map to include _id, message, userId, name
  const result = messages.map(msg => ({
    _id: msg._id,
    message: msg.message,
    userId: msg.user ? msg.user._id.toString() : "",
    name: msg.user ? msg.user.name : "",
  }));
  res.json(result);
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.query.token;
    const payload = jwt.verify(token, process.env.SECRET);
    socket.userId = payload.id;
    next();
  } catch (err) {}
});

io.on("connection", (socket) => {
  console.log("Connected: " + socket.userId);

  socket.on("disconnect", () => {
    console.log("Disconnected: " + socket.userId);
  });

  socket.on("joinRoom", async ({ chatroomId }) => {
    socket.join(chatroomId);
    const user = await User.findOne({ _id: socket.userId });
    io.to(chatroomId).emit("userJoined", {
      userId: socket.userId,
      name: user.name, // Send the user's name
      message: `${user.name} joined the chatroom.`
    });
    console.log("A user joined chatroom: " + chatroomId);
  });

  socket.on("leaveRoom", async ({ chatroomId }) => {
    socket.leave(chatroomId);
    const user = await User.findOne({ _id: socket.userId });
    io.to(chatroomId).emit("userLeft", {
      userId: socket.userId,
      name: user.name, // Send the user's name
      message: `${user.name} left the chatroom.`
    });
    console.log("A user left chatroom: " + chatroomId);
  });

  socket.on("chatroomMessage", async ({ chatroomId, message }) => {
    if (message.trim().length > 0) {
      const user = await User.findOne({ _id: socket.userId });
      const newMessage = new Message({
        chatroom: chatroomId,
        user: socket.userId,
        message,
      });
      io.to(chatroomId).emit("newMessage", {
        message,
        name: user.name,
        userId: socket.userId,
      });
      await newMessage.save();
    }
  });

  socket.on("typing", async ({ chatroomId }) => {
    const user = await User.findOne({ _id: socket.userId });
    socket.to(chatroomId).emit("typing", {
      userId: socket.userId,
      name: user.name,
    });
  });

  socket.on("stopTyping", ({ chatroomId }) => {
    socket.to(chatroomId).emit("stopTyping", {
      userId: socket.userId,
    });
  });
});
