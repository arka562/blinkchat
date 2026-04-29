import { resendClient, sender } from "../config/resend.js";
import { createWelcomeEmailTemplate } from "./emailTemplate.js";

export const sendWelcomeEmail = async (email, fullName) => {
  try {
    if (!email || !fullName) {
      throw new Error("Email and fullName are required");
    }

    const recipient =
      process.env.NODE_ENV === "development"
        ? process.env.DEV_EMAIL || email
        : email;

    const { error } = await resendClient.emails.send({
      from: `${sender.name} <${sender.email}>`,
      to: recipient,
      subject: "Welcome to BlinkChat!",
      html: createWelcomeEmailTemplate(fullName, process.env.CLIENT_URL),
    });

    if (error) {
      console.error("Resend error:", error);

      if (process.env.NODE_ENV === "production") {
        throw new Error("Failed to send welcome email");
      }

      return;
    }

    console.log(`Welcome Email sent to ${recipient}`);
  } catch (err) {
    console.error("Email Service Error:", err.message);

    if (process.env.NODE_ENV === "production") {
      throw err;
    }
  }
};