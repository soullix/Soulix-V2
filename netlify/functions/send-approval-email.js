// ============================================
// NETLIFY SERVERLESS FUNCTION
// Secure Brevo Email API Handler with Rate Limiting
// ============================================

// Simple in-memory rate limiting (resets on function cold start)
const rateLimitStore = new Map();
const RATE_LIMIT = {
  windowMs: 60000, // 1 minute window
  maxRequests: 10  // Max 10 emails per minute per IP
};

// Clean up old entries
function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.timestamp > RATE_LIMIT.windowMs) {
      rateLimitStore.delete(key);
    }
  }
}

// Check rate limit
function checkRateLimit(identifier) {
  cleanupRateLimitStore();
  
  const now = Date.now();
  const userData = rateLimitStore.get(identifier);
  
  if (!userData) {
    rateLimitStore.set(identifier, { count: 1, timestamp: now });
    return { allowed: true, remaining: RATE_LIMIT.maxRequests - 1 };
  }
  
  if (now - userData.timestamp > RATE_LIMIT.windowMs) {
    rateLimitStore.set(identifier, { count: 1, timestamp: now });
    return { allowed: true, remaining: RATE_LIMIT.maxRequests - 1 };
  }
  
  if (userData.count >= RATE_LIMIT.maxRequests) {
    return { allowed: false, remaining: 0, retryAfter: RATE_LIMIT.windowMs - (now - userData.timestamp) };
  }
  
  userData.count++;
  return { allowed: true, remaining: RATE_LIMIT.maxRequests - userData.count };
}

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Rate limiting check
  const clientIp = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown';
  const rateLimitResult = checkRateLimit(clientIp);
  
  // Add rate limit headers
  headers['X-RateLimit-Limit'] = RATE_LIMIT.maxRequests.toString();
  headers['X-RateLimit-Remaining'] = rateLimitResult.remaining.toString();
  
  if (!rateLimitResult.allowed) {
    headers['Retry-After'] = Math.ceil(rateLimitResult.retryAfter / 1000).toString();
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(rateLimitResult.retryAfter / 1000)
      })
    };
  }

  try {
  // Parse request body
  const { studentEmail, studentName, transactionId, courseName, action = 'approve', rejectionReason = '' } = JSON.parse(event.body);

    // Validate required fields
    if (!studentEmail || !studentName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: studentEmail and studentName are required' 
        })
      };
    }

    // Get Brevo API key from environment variable (secure!)
    const BREVO_API_KEY = process.env.BREVO_API_KEY;

    if (!BREVO_API_KEY) {
      console.error('❌ BREVO_API_KEY not configured in Netlify environment');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: 'Email service not configured' 
        })
      };
    }

    // Load HTML templates - now embedded in the function bundle
    const { APPROVAL_TEMPLATE, REJECTION_TEMPLATE } = require('./email-templates');

    let subject = 'Notification from SOULIX';
    let htmlContent = '';

    console.log('� Template system: Using embedded templates');

    try {
      if (action === 'reject') {
        subject = '⚠️ Payment Issue — Action Required';
        let template = REJECTION_TEMPLATE;
        // Replace standardized placeholders
        template = template.replace(/{{studentName}}/g, studentName);
        template = template.replace(/{{courseName}}/g, courseName || 'IGNITE Training Program');
        template = template.replace(/{{rejectionReason}}/g, rejectionReason || 'Please verify your payment details');
        template = template.replace(/{{transactionId}}/g, transactionId ? `<br>Transaction ID: <b>${transactionId}</b>` : '');
        htmlContent = template;
        console.log('✅ Rejection template loaded, length:', htmlContent.length);
      } else {
        subject = '✅ Seat Confirmed — IGNITE Training Program';
        let template = APPROVAL_TEMPLATE;
        // Replace standardized placeholders
        template = template.replace(/{{studentName}}/g, studentName);
        template = template.replace(/{{courseName}}/g, courseName || 'IGNITE Training Program');
        template = template.replace(/{{transactionId}}/g, transactionId ? `<b>Transaction ID:</b> ${transactionId}` : '');
        htmlContent = template;
        console.log('✅ Approval template loaded, length:', htmlContent.length);
      }

    } catch (err) {
      console.error('❌ Template error:', err);
      htmlContent = `<div style="font-family:Arial, sans-serif; background:#000; color:#fff; padding:40px;"><p>Hi ${studentName},</p><p>${action === 'reject' ? 'We could not verify your payment. Please resend proof.' : 'Your seat is confirmed. Welcome!'}</p></div>`;
    }

    // Brevo email payload - Remove textContent to force HTML rendering
    const emailPayload = {
      sender: {
        name: "Team SOULIX",
        email: "support@soulix.tech"
      },
      to: [
        {
          email: studentEmail,
          name: studentName
        }
      ],
      subject,
      htmlContent
    };
    
    console.log('📧 Sending email:', { 
      to: studentEmail, 
      subject, 
      action,
      htmlLength: htmlContent.length,
      hasHtml: !!htmlContent,
      templateUsed: action === 'reject' ? 'rejected_email_preview.html' : 'final_confirmation_email_preview.html'
    });

    // Call Brevo API
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Email sent successfully:', result.messageId);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          messageId: result.messageId,
          message: `Email sent to ${studentEmail}`
        })
      };
    } else {
      console.error('❌ Brevo API error:', result);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ 
          success: false, 
          error: result.message || 'Failed to send email' 
        })
      };
    }

  } catch (error) {
    console.error('❌ Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      })
    };
  }
};
