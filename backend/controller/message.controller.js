import cloudinary from "../config/cloudinary.js";
import { getReceiverSocketIds, getIO } from "../config/socket.js";
import Message from "../models/message.model.js";
import User from "../models/User.model.js";
import mongoose from "mongoose";
import redisClient from "../config/redis.js";

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

// ================= GET MESSAGES (WITH REDIS) =================
export const getMessagesByUserId = async (req, res) => {
  try {
    const myId = req.user._id;
    const { id: userToChatId } = req.params;

    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;

    const ids = [myId.toString(), userToChatId].sort();
    const conversationId = ids.join("_");

    const cacheKey = `chat:${conversationId}:page:${page}`;

    // ✅ 1. CHECK CACHE
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log("⚡ Redis HIT:", cacheKey);
      return res.status(200).json(JSON.parse(cached));
    }

    // ❌ CACHE MISS → DB QUERY
    console.log("🐢 MongoDB HIT");
    console.log("⚡ Redis HIT:", cacheKey);
console.log("🐢 MongoDB HIT");

    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean();

    const orderedMessages = messages.reverse();

    const response = {
      success: true,
      messages: orderedMessages,
      page,
      limit,
      hasMore: messages.length === limit,
    };

    // ✅ 2. STORE IN CACHE (60 sec)
    await redisClient.setEx(cacheKey, 60, JSON.stringify(response));

    return res.status(200).json(response);
  } catch (error) {
    console.error("getMessages Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ================= SEND MESSAGE (WITH CACHE INVALIDATION) =================
export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    const cleanText = text?.trim();

    if (!cleanText && !image) {
      return res.status(400).json({
        success: false,
        message: "Message must contain text or image",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid receiver ID",
      });
    }

    if (senderId.toString() === receiverId) {
      return res.status(400).json({
        success: false,
        message: "Cannot send message to yourself",
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
      const upload = await cloudinary.uploader.upload(image, {
        folder: "blinkchat/messages",
      });
      imageUrl = upload.secure_url;
    }

    const newMessage = await Message.create({
      senderId,
      receiverId,
      text: cleanText || undefined,
      image: imageUrl,
    });

    // ================= REDIS INVALIDATION =================
    const ids = [senderId.toString(), receiverId].sort();
    const conversationId = ids.join("_");

    const keys = await redisClient.keys(`chat:${conversationId}:*`);
    if (keys.length > 0) {
      await redisClient.del(keys);
      console.log("🧹 Cache cleared:", keys);
    }

    // invalidate unread cache
    await redisClient.del(`unread:${receiverId}`);

    // ================= SOCKET =================
    const io = getIO();
    const receiverSockets = getReceiverSocketIds(receiverId);

    if (receiverSockets) {
      receiverSockets.forEach((socketId) => {
        io.to(socketId).emit("newMessage", newMessage);
      });
    }

    return res.status(201).json({
      success: true,
      message: newMessage,
    });
  } catch (error) {
    console.error("sendMessage Error:", error);
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

// ================= MARK SEEN =================
export const markMessagesAsSeen = async (req, res) => {
  try {
    const myId = req.user._id;
    const { id: senderId } = req.params;

    const result = await Message.updateMany(
      {
        senderId,
        receiverId: myId,
        isSeen: false,
      },
      {
        $set: {
          isSeen: true,
          seenAt: new Date(),
        },
      }
    );

    // invalidate unread cache
    await redisClient.del(`unread:${myId}`);

    return res.status(200).json({
      success: true,
      updated: result.modifiedCount,
    });
  } catch (error) {
    console.error("markMessagesAsSeen Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ================= GET UNREAD (WITH CACHE) =================
export const getUnreadCounts = async (req, res) => {
  try {
    const userId = req.user._id.toString();

    const cacheKey = `unread:${userId}`;

    // ✅ CACHE CHECK
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log("⚡ Redis HIT (unread)");
      return res.json({
        success: true,
        unread: JSON.parse(cached),
      });
    }

    console.log("🐢 MongoDB HIT (unread)");

    const unread = await Message.aggregate([
      {
        $match: {
          receiverId: new mongoose.Types.ObjectId(userId),
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

    // ✅ STORE CACHE (30 sec)
    await redisClient.setEx(cacheKey, 30, JSON.stringify(unread));

    return res.status(200).json({
      success: true,
      unread,
    });
  } catch (error) {
    console.error("getUnreadCounts Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const toggleReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    if (!["🔥", "❤️", "👍"].includes(emoji)) {
      return res.status(400).json({
        success: false,
        message: "Invalid emoji",
      });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    // check if already reacted
    const existing = message.reactions.find(
      (r) => r.userId.toString() === userId.toString()
    );

    if (existing) {
      // same emoji → remove
      if (existing.emoji === emoji) {
        message.reactions = message.reactions.filter(
          (r) => r.userId.toString() !== userId.toString()
        );
      } else {
        // update emoji
        existing.emoji = emoji;
      }
    } else {
      message.reactions.push({ userId, emoji });
    }

    await message.save();

    // 🔥 SOCKET EMIT
    const io = getIO();
    const receiverSockets = getReceiverSocketIds(
      message.receiverId.toString()
    );

    if (receiverSockets) {
      receiverSockets.forEach((socketId) => {
        io.to(socketId).emit("reactionUpdated", {
          messageId,
          reactions: message.reactions,
        });
      });
    }

    return res.status(200).json({
      success: true,
      reactions: message.reactions,
    });
  } catch (error) {
    console.error("Reaction error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};