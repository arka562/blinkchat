import aj from "../config/arcjet.js";
import { isSpoofedBot } from "@arcjet/inspect";

export const arcjetProtection = async (req, res, next) => {
  try {
    const decision = await aj.protect(req);

    // Attach decision for later use
    req.arcjet = decision;

    // 🔥 Check spoofed bot first
    if (decision.results?.some(isSpoofedBot)) {
      return res.status(403).json({
        success: false,
        message: "Malicious bot activity detected.",
      });
    }

    if (decision.isDenied()) {
      if (decision.reason?.isRateLimit?.()) {
        return res.status(429).json({
          success: false,
          message: "Rate limit exceeded. Please try again later.",
        });
      }

      if (decision.reason?.isBot?.()) {
        return res.status(403).json({
          success: false,
          message: "Bot access denied.",
        });
      }

      return res.status(403).json({
        success: false,
        message: "Access denied by security policy.",
      });
    }

    return next();
  } catch (error) {
    console.error("Arcjet Protection Error:", {
      message: error.message,
      stack: error.stack,
    });

    return next(); // fail-open strategy
  }
};