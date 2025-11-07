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
    const { studentEmail, studentName, transactionId, courseName } = JSON.parse(event.body);

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

    // Brevo email payload
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
      subject: "✅ Seat Confirmed — IGNITE Training Program",
      htmlContent: `
      <div style="background-color:#000; padding:40px 20px; font-family:Arial, sans-serif; color:#fff;">
          <div style="max-width:600px; margin:0 auto;">
              <img src="https://lh3.googleusercontent.com/d/1QP4RpN3F1pc9lIN7lNRgCFYQIU-3skGH" 
                  alt="SOULIX Logo" 
                  style="width:160px; display:block; margin:0 auto 30px;">
              
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          padding:30px; border-radius:15px; text-align:center;">
                  <h2 style="color:#00FFAA; margin:0 0 20px;">🎉 Seat Confirmed!</h2>
              </div>
              
              <div style="background:#1a1a1a; padding:30px; border-radius:15px; margin-top:20px;">
                  <p style="font-size:16px; line-height:1.6;">Hi <b style="color:#00FFAA;">${studentName}</b>,</p>
                  
                  <p style="font-size:16px; line-height:1.6;">
                      Congratulations! Your payment and details have been successfully verified.
                  </p>
                  
                  ${courseName ? `<p style="font-size:16px; line-height:1.6;"><b>Course:</b> <span style="color:#00FFAA;">${courseName}</span></p>` : ''}
                  
                  ${transactionId ? `<p style="font-size:16px; line-height:1.6;"><b>Transaction ID:</b> <span style="color:#00FFAA;">${transactionId}</span></p>` : ''}
                  
                  <div style="background:#000; padding:20px; border-radius:10px; margin:20px 0; border-left:4px solid #00FFAA;">
                      <p style="margin:0; font-size:16px;">
                          <b>Welcome to IGNITE Training Program! 🔥</b>
                      </p>
                  </div>
                  
                  <p style="font-size:16px; line-height:1.6;">
                      We'll send you the joining instructions and course materials shortly via email.
                  </p>
                  
                  <p style="font-size:16px; line-height:1.6;">
                      If you have any questions, feel free to reach out to us anytime.
                  </p>
              </div>
              
              <div style="margin-top:30px; padding-top:20px; border-top:1px solid #333; text-align:center;">
                  <p style="color:#888; font-size:14px; margin:5px 0;">
                      <b>Team SOULIX</b><br>
                      📧 support@soulix.tech<br>
                      🔥 Empowering Education, Inspiring Excellence
                  </p>
              </div>
          </div>
      </div>`
    };

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
