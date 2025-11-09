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

    // Generate email HTML based on action using your custom templates
    const transactionIdText = upiTransactionId ? `💳 <b>Transaction ID:</b> ${upiTransactionId}` : '';
    
    const html = action === "approve"
      ? `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Seat Confirmed — SOULIX</title>
<style>
  body { background-color: #000; font-family: Arial, sans-serif; margin: 0; padding: 0; color: #fff; }
  .container { max-width: 600px; margin: auto; background: #111; border-radius: 12px; overflow: hidden; color: #fff; }
  .logo-section { background: #000; text-align: center; padding: 35px 20px 25px; }
  .logo-section img { width: 130px; }
  .content { padding: 30px; }
  .title { font-size: 23px; font-weight: bold; color: #22c55e; text-align: center; }
  .success { background: #052e14; padding: 14px 16px; border-radius: 8px; font-size: 15px; margin-top: 15px; border-left: 4px solid #22c55e; color:#b5ffcf; }
  .details-box { background: #0b1b3a; padding: 14px 16px; border-radius: 8px; border-left: 4px solid #3b82f6; margin-top: 18px; font-size: 15px; }
  ul {color:#ddd;}
  .btn { display: block; width: 100%; text-align: center; padding: 12px; font-size: 15px; font-weight: bold; border-radius: 6px; margin-top: 12px; text-decoration: none; }
  .whatsapp { background: #25d366; color: #fff !important; }
  footer { text-align: center; margin: 25px 0; font-size: 12px; color: #777; }
</style>
</head>
<body>
  <div class="container">
    <div class="logo-section">
      <img src="https://lh3.googleusercontent.com/d/1QP4RpN3F1pc9lIN7lNRgCFYQIU-3skGH" alt="SOULIX Logo" />
    </div>

    <div class="content">
      <p class="title">🎉 Seat Confirmed — Welcome to IGNITE Program!</p>

      <p>Hi <b>${name}</b>,</p>

      <div class="success">
        ✅ Your payment has been successfully verified.<br>
        🚀 Your seat for the ${course} is officially confirmed.
      </div>

      <div class="details-box">
        <b>Program Details:</b><br><br>
        📚 <b>${course}</b><br>
        🔥 Live project-based learning<br>
        🧠 Includes: Front‑end + Back‑end + Database + Deployment + Portfolio building<br>
        ${transactionIdText}<br><br>
        ✅ Next steps will be sent shortly (WhatsApp + Email)
      </div>

      
          <h3 style="margin-top:25px;font-size:18px;font-weight:bold;color:#0d6efd;">🚀 Program Highlights</h3>
      <ul style="font-size:15px;line-height:1.6;margin-top:10px;padding-left:18px;">
        <li>Live mentor-led sessions — learn by doing, not watching</li>
        <li>Work on real projects & build portfolio</li>
        <li>Hands‑on training: Frontend + Backend + Database + Hosting</li>
        <li>1‑to‑1 doubt clearing and personal guidance</li>
        <li>Access to premium resources & project templates</li>
        <li>Certificate + Internship opportunity for top performers</li>
      </ul>

      <p style="line-height:1.6;font-size:15px;color:#ddd;">
You'll receive all important updates on <b>WhatsApp</b> — including session reminders, shared resources, and announcements.
<br><br>
Your <b>joining instructions</b> and course materials will be shared soon via <b>Email</b> and <b>WhatsApp</b>.
<br><br>
If you need any help at any point, just reply — we're always here to support you.
</p>

      <p>If you have questions or want to stay updated, join our official WhatsApp community group:</p>

<a href="https://chat.whatsapp.com/D76OYRDVQYqD4RVmrBYuDS" class="btn whatsapp" style="background:#25d366;color:#fff !important;">✅ Join WhatsApp Group</a>
<br>

      <a href="https://wa.me/919356671329" class="btn whatsapp">📱 Chat on WhatsApp</a>

      <br>
      <p>Regards,<br>
      <b>Team SOULIX</b><br>
      support@soulix.tech</p>
    </div>
<footer style="text-align:center;margin:25px 0;font-size:12px;color:#777;">
  © 2025 SOULIX — All rights reserved.<br>
  <div style="margin-top:15px;">
    <a href="https://instagram.com" style="margin:0 6px;"><img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png" width="22"></a>
    <a href="https://linkedin.com" style="margin:0 6px;"><img src="https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png" width="22"></a>
    <a href="https://youtube.com" style="margin:0 6px;"><img src="https://upload.wikimedia.org/wikipedia/commons/b/b8/YouTube_Logo_2017.svg" width="50"></a>
  </div>
</footer>
</body>
</html>`
      : `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Payment Issue — Action Required</title>
<style>
  body { background:#000; margin:0; padding:0; font-family:Arial, sans-serif; color:#fff; }
  .container { max-width:600px; margin:auto; background:#111; border-radius:12px; padding:30px; }
  .logo { text-align:center; margin-bottom:25px; }
  .logo img { width:120px; }
  .alert { background:#330000; padding:15px; border-left:4px solid #ff4444; border-radius:8px; }
  ul { margin-top:10px; }
  .btn { display:block; margin-top:18px; padding:12px; background:#25d366; text-align:center; color:#fff; font-weight:bold; border-radius:6px; text-decoration:none; }
  .btn.blue { background:#3b82f6; }
  footer { text-align:center; margin-top:30px; color:#777; font-size:12px; }
</style>
</head>
<body>
<div class="container">
<div class="logo">
  <img src="https://lh3.googleusercontent.com/d/1QP4RpN3F1pc9lIN7lNRgCFYQIU-3skGH" alt="SOULIX Logo" />
</div>

<h2 style="color:#ff4444; text-align:center;">⚠️ Payment Verification Failed</h2>
<p>Hi <b>${name}</b>,</p>

<div class="alert">
  ❌ We could not verify your payment for <b>${course}</b>.<br><br>
  <b>Reason:</b> ${notes || 'Payment verification failed'}
  <br><br>
  Common issues:
  <ul>
    <li>Incorrect / invalid Transaction ID</li>
    <li>Payment not received or incomplete</li>
    <li>Screenshot missing or unclear</li>
  </ul>
</div>

<p style="margin-top:22px; font-size:15px; line-height:1.6;">
Please resend your payment screenshot or transaction proof so we can proceed with your seat booking.<br><br>
<b>You can reply to this email and attach the screenshot directly,</b><br>or send it on WhatsApp using the button below.
</p>

<a href="https://wa.me/919356671329" class="btn">📱 Send Screenshot on WhatsApp</a>

<p style="font-size:14px; margin-top:25px; text-align:center;">OR</p>

<a href="mailto:support@soulix.tech?subject=Payment%20Screenshot%20Attached&body=Hi%20Team%20Soulix,%0D%0AHere%20is%20my%20payment%20screenshot%20for%20verification.%0D%0ATransaction%20ID:%20%0D%0AThank%20you!" class="btn blue">✉️ Reply With Screenshot</a>

<p style="margin-top:35px; line-height:1.6;">
Regards,<br>
<b>Team SOULIX</b><br>
support@soulix.tech
</p>

<footer>
© 2025 SOULIX — All rights reserved.
</footer>
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
