import cloudinary from "../config/cloudinary.js";
import { getReceiverSocketId, getIO } from "../config/socket.js";
import Message from "../models/message.model.js";
import User from "../models/User.model.js";
import Conversation from "../models/Conversation.model.js";
import mongoose from "mongoose";

// ================= GET ALL CONTACTS =================
export const getAllContacts = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    const users = await User.find({
      _id: { $ne: loggedInUserId },
    })
      .select("-password")
      .lean();

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("getAllContacts Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ================= GET MESSAGES =================
export const getMessagesByUserId = async (req, res) => {
  try {
    const myId = req.user._id;
    const { id: userToChatId } = req.params;

    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.status(200).json({
      success: true,
      messages: messages.reverse(),
    });
  } catch (error) {
    console.error("getMessages Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ================= SEND MESSAGE =================
export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    const cleanText = text?.trim();

    if (!cleanText && !image) {
      return res.status(400).json({
        success: false,
        message: "Text or image is required",
      });
    }

    if (senderId.toString() === receiverId) {
      return res.status(400).json({
        success: false,
        message: "Cannot send messages to yourself",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid receiver ID",
      });
    }

    const receiverExists = await User.exists({ _id: receiverId });
    if (!receiverExists) {
      return res.status(404).json({
        success: false,
        message: "Receiver not found",
      });
    }

    let imageUrl;
    if (image) {
      if (!image.startsWith("data:image")) {
        return res.status(400).json({
          success: false,
          message: "Invalid image format",
        });
      }

      try {
        const uploadResponse = await cloudinary.uploader.upload(image, {
          folder: "blinkchat/messages",
        });
        imageUrl = uploadResponse.secure_url;
      } catch (err) {
        console.error("Cloudinary Upload Error:", err.message);
        return res.status(500).json({
          success: false,
          message: "Image upload failed",
        });
      }
    }

    // ================= FIND OR CREATE CONVERSATION =================
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
      });
    }

    const newMessage = await Message.create({
      senderId,
      receiverId,
      text: cleanText,
      image: imageUrl,
      isSeen: false,
    });

    // ================= UPDATE CONVERSATION =================
    conversation.lastMessage = cleanText || "📷 Image";
    conversation.lastMessageAt = new Date();
    await conversation.save();

    // 🔥 Real-time emit
    const io = getIO();
    const receiverSocketId = getReceiverSocketId(receiverId);

    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    return res.status(201).json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    console.error("sendMessage Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ================= GET CHAT PARTNERS =================
export const getChatPartners = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;

    const partners = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: loggedInUserId },
            { receiverId: loggedInUserId },
          ],
        },
      },
      {
        $project: {
          user: {
            $cond: [
              { $eq: ["$senderId", loggedInUserId] },
              "$receiverId",
              "$senderId",
            ],
          },
        },
      },
      {
        $group: {
          _id: "$user",
        },
      },
    ]);

    const partnerIds = partners.map((p) => p._id);

    const users = await User.find({ _id: { $in: partnerIds } })
      .select("-password")
      .lean();

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("getChatPartners Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ================= MARK MESSAGES AS SEEN =================
export const markMessagesAsSeen = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id: senderId } = req.params;

    await Message.updateMany(
      {
        senderId,
        receiverId: userId,
        isSeen: false,
      },
      {
        $set: {
          isSeen: true,
          seenAt: new Date(),
        },
      }
    );

    // 🔥 Emit real-time update
    const io = getIO();
    const senderSocketId = getReceiverSocketId(senderId);

    if (senderSocketId) {
      io.to(senderSocketId).emit("messagesSeen", {
        seenBy: userId.toString(),
      });
    }

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error("markMessagesAsSeen Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getUnreadCounts = async (req, res) => {
  try {
    console.log("USER:", req.user);

    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - user missing",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const userId = new mongoose.Types.ObjectId(req.user._id);

    const unread = await Message.aggregate([
      {
        $match: {
          receiverId: userId,
          isSeen: false,
        },
      },
      {
        $group: {
          _id: "$senderId",
          count: { $sum: 1 },
        },
      },
    ]);

    console.log("UNREAD RESULT:", unread);

    return res.status(200).json({
      success: true,
      unread,
    });
  } catch (error) {
    console.error("❌ FULL ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};