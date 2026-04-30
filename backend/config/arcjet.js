import dotenv from "dotenv";
dotenv.config(); // ✅ LOAD ENV HERE
import arcjet, { shield, detectBot, slidingWindow } from "@arcjet/node";

// Optional: remove if not using
// import { ENV } from "./env.js";

if (!process.env.ARCJET_KEY) {
  throw new Error("ARCJET_KEY is missing");
}

const isDev = process.env.NODE_ENV === "development";

const aj = arcjet({
  key: process.env.ARCJET_KEY,
  rules: [
    shield({ mode: isDev ? "DRY_RUN" : "LIVE" }),

    detectBot({
      mode: isDev ? "DRY_RUN" : "LIVE",
      allow: ["CATEGORY:SEARCH_ENGINE"],
    }),

    slidingWindow({
      mode: isDev ? "DRY_RUN" : "LIVE",
      max: 100,
      interval: 60,
    }),
  ],
});

export default aj;