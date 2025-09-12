import { resendClient, sender } from "../config/resend.js";
import { createWelcomeEmailTemplate } from "./emailTemplate.js";
import { ENV } from "../config/env.js";

export const sendWelcomeEmail = async (email, fullName) => {
  try {
    // In dev mode, always send to your own email
    const recipient =
      ENV.NODE_ENV === "development" ? "arka792002@gmail.com" : email;

    const { data, error } = await resendClient.emails.send({
      from: `${sender.name} <${sender.email}>`,
      to: recipient,
      subject: "Welcome to BlinkChat!",
      html: createWelcomeEmailTemplate(fullName, ENV.CLIENT_URL),
    });

    if (error) {
      console.error("Error sending welcome email:", error);
      // Don't throw in dev mode to avoid crashing signup
      if (ENV.NODE_ENV === "production") throw new Error("Failed to send welcome email");
    } else {
      console.log(`✅ Welcome Email sent successfully to ${recipient}`, data);
    }
  } catch (err) {
    console.error("Failed to send welcome email:", err.message);
    // Only throw in production, ignore in development
    if (ENV.NODE_ENV === "production") throw err;
  }
};
