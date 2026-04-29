import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import cookie from "cookie";

export const socketAuthMiddleware = async (socket, next) => {
  try {
    const cookies = cookie.parse(socket.handshake.headers.cookie || "");
    const token = cookies.jwt;

    if (!token) {
      return next(new Error("Unauthorized - No Token Provided"));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return next(new Error("Unauthorized - Invalid Token"));
    }

    const user = await User.findById(decoded.userId)
      .select("-password")
      .lean();

    if (!user) {
      return next(new Error("User not found"));
    }

    socket.user = {
      _id: user._id,
      fullName: user.fullName,
    };

    socket.userId = user._id.toString();

    if (process.env.NODE_ENV === "development") {
      console.log(`Socket authenticated: ${user._id}`);
    }

    return next();
  } catch (error) {
    console.error("Socket Auth Error:", error.message);
    return next(new Error("Authentication failed"));
  }
};