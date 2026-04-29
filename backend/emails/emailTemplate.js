export function createWelcomeEmailTemplate(name, clientURL) {
  // 🔒 Basic XSS protection
  const safeName = String(name)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  const safeURL = clientURL || "#";

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to BlinkChat</title>
  </head>
  <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
    
    <!-- Header -->
    <div style="background-color: #5B86E5; background: linear-gradient(to right, #36D1DC, #5B86E5); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
      <img 
        src="https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg" 
        alt="BlinkChat Logo" 
        style="width: 80px; height: 80px; margin-bottom: 20px; border-radius: 50%; background-color: white; padding: 10px;"
      />
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 500;">
        Welcome to BlinkChat!
      </h1>
    </div>

    <!-- Body -->
    <div style="background-color: #ffffff; padding: 35px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
      
      <p style="font-size: 18px; color: #5B86E5;">
        <strong>Hello ${safeName},</strong>
      </p>

      <p>
        We're excited to have you join BlinkChat! Connect with friends, family, and colleagues in real-time — anytime, anywhere.
      </p>
      
      <!-- Steps -->
      <div style="background-color: #f8f9fa; padding: 25px; border-radius: 10px; margin: 25px 0; border-left: 4px solid #36D1DC;">
        <p style="font-size: 16px; margin: 0 0 15px 0;">
          <strong>Get started in just a few steps:</strong>
        </p>
        <ul style="padding-left: 20px; margin: 0;">
          <li style="margin-bottom: 10px;">Set up your profile picture</li>
          <li style="margin-bottom: 10px;">Find and add your contacts</li>
          <li style="margin-bottom: 10px;">Start a conversation</li>
          <li>Share photos, videos, and more</li>
        </ul>
      </div>
      
      <!-- CTA -->
      <div style="text-align: center; margin: 30px 0;">
        <p style="font-size: 16px;">Click below to start chatting:</p>
        <a 
          href="${safeURL}" 
          style="background: linear-gradient(to right, #36D1DC, #5B86E5); color: white; text-decoration: none; padding: 12px 30px; border-radius: 50px; font-weight: 500; display: inline-block;"
        >
          Open BlinkChat
        </a>
      </div>
      
      <p>If you need any help, we're always here for you.</p>
      <p>Happy chatting! 🚀</p>
      
      <p style="margin-top: 25px;">
        Best regards,<br>
        <strong>The BlinkChat Team</strong>
      </p>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
      <p>© ${new Date().getFullYear()} BlinkChat. All rights reserved.</p>
    </div>

  </body>
  </html>
  `;
}