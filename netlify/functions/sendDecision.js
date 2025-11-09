// netlify/functions/sendDecision.js
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function handler(event) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: "Method Not Allowed" }) 
    };
  }

  try {
    const { action, email, name, course, amount, paymentRef, notes, upiTransactionId } = JSON.parse(event.body);

    // Validate required fields
    if (!action || !email || !name || !course) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required fields" })
      };
    }

    // Generate email HTML based on action
    const html = action === "approve"
      ? `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f3f4f6; }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center; }
          .header img { width: 120px; margin-bottom: 20px; }
          .header h1 { color: white; font-size: 28px; font-weight: 700; margin: 0; }
          .content { padding: 40px 30px; }
          .success-badge { background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%); border: 2px solid #10b981; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; }
          .success-badge .icon { font-size: 48px; margin-bottom: 10px; }
          .info-card { background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981; }
          .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .info-row:last-child { border-bottom: none; }
          .info-label { color: #6b7280; font-weight: 500; }
          .info-value { color: #0f172a; font-weight: 700; }
          .footer { background: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://soulix.tech/logo.png" alt="SOULIX Logo" />
            <h1>🎉 Application Approved!</h1>
          </div>
          <div class="content">
            <h2 style="color: #0f172a; font-size: 24px; margin-top: 0;">Hello ${name},</h2>
            <p style="color: #64748b; font-size: 16px; line-height: 1.6;">
              Congratulations! Your application for <strong style="color: #10b981;">${course}</strong> has been <strong>approved</strong>. We're excited to welcome you! 🎓
            </p>
            
            <div class="success-badge">
              <div class="icon">✅</div>
              <div style="color: #10b981; font-size: 20px; font-weight: 700;">Payment Confirmed</div>
            </div>

            <div class="info-card">
              <h3 style="color: #0f172a; margin-top: 0; margin-bottom: 15px;">Payment Details</h3>
              <div class="info-row">
                <span class="info-label">Course:</span>
                <span class="info-value">${course}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Amount Paid:</span>
                <span class="info-value">₹${amount}</span>
              </div>
              ${paymentRef ? `
              <div class="info-row">
                <span class="info-label">Payment Reference:</span>
                <span class="info-value">${paymentRef}</span>
              </div>
              ` : ''}
              ${upiTransactionId ? `
              <div class="info-row">
                <span class="info-label">UPI Transaction ID:</span>
                <span class="info-value">${upiTransactionId}</span>
              </div>
              ` : ''}
            </div>

            <p style="color: #64748b; font-size: 15px; line-height: 1.6;">
              You will receive further instructions about your course via email shortly. If you have any questions, feel free to reach out to us.
            </p>

            <div style="text-align: center;">
              <a href="https://soulix.tech" class="cta-button">Visit Dashboard</a>
            </div>
          </div>
          <div class="footer">
            <p style="margin: 0 0 10px 0;">© 2025 SOULIX. All rights reserved.</p>
            <p style="margin: 0; font-size: 13px;">
              If you have any questions, contact us at 
              <a href="mailto:support@soulix.tech" style="color: #10b981; text-decoration: none;">support@soulix.tech</a>
            </p>
          </div>
        </div>
      </body>
      </html>`
      : `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f3f4f6; }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 30px; text-align: center; }
          .header img { width: 120px; margin-bottom: 20px; }
          .header h1 { color: white; font-size: 28px; font-weight: 700; margin: 0; }
          .content { padding: 40px 30px; }
          .warning-badge { background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%); border: 2px solid #ef4444; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center; }
          .warning-badge .icon { font-size: 48px; margin-bottom: 10px; }
          .info-card { background: #f9fafb; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #ef4444; }
          .footer { background: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="https://soulix.tech/logo.png" alt="SOULIX Logo" />
            <h1>Application Update</h1>
          </div>
          <div class="content">
            <h2 style="color: #0f172a; font-size: 24px; margin-top: 0;">Hello ${name},</h2>
            <p style="color: #64748b; font-size: 16px; line-height: 1.6;">
              Thank you for your interest in <strong>${course}</strong>. After careful review, we regret to inform you that we cannot proceed with your application at this time.
            </p>
            
            <div class="warning-badge">
              <div class="icon">⚠️</div>
              <div style="color: #ef4444; font-size: 20px; font-weight: 700;">Application Not Approved</div>
            </div>

            ${notes ? `
            <div class="info-card">
              <h3 style="color: #0f172a; margin-top: 0; margin-bottom: 15px;">Additional Information</h3>
              <p style="color: #64748b; margin: 0; line-height: 1.6;">${notes}</p>
            </div>
            ` : ''}

            <p style="color: #64748b; font-size: 15px; line-height: 1.6;">
              If you have any questions or would like to discuss this decision, please don't hesitate to contact us. We appreciate your understanding.
            </p>

            <div style="text-align: center;">
              <a href="https://soulix.tech/contact" class="cta-button">Contact Support</a>
            </div>
          </div>
          <div class="footer">
            <p style="margin: 0 0 10px 0;">© 2025 SOULIX. All rights reserved.</p>
            <p style="margin: 0; font-size: 13px;">
              Questions? Email us at 
              <a href="mailto:support@soulix.tech" style="color: #6366f1; text-decoration: none;">support@soulix.tech</a>
            </p>
          </div>
        </div>
      </body>
      </html>`;

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "SOULIX <support@soulix.tech>",
      to: email,
      subject: action === "approve"
        ? `🎉 Seat Confirmed — Welcome to ${course}`
        : `Application Update for ${course}`,
      html
    });

    console.log(`✅ Email sent successfully to ${email}`, emailResponse);

    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        success: true, 
        message: `${action === 'approve' ? 'Approval' : 'Rejection'} email sent successfully`,
        emailId: emailResponse.id
      }) 
    };

  } catch (error) {
    console.error("❌ Error sending email:", error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ 
        error: error.message || "Failed to send email" 
      }) 
    };
  }
}
