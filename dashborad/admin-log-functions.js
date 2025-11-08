// ==============================================
// ADMIN LOG FUNCTIONS
// ==============================================

function initAdminLog() {
    const closeEmailPreviewBtn = document.getElementById('closeEmailPreviewModal');
    const clearLogBtn = document.getElementById('clearLogBtn');
    const logFilters = document.querySelectorAll('[data-log-filter]');
    
    if (closeEmailPreviewBtn) {
        closeEmailPreviewBtn.addEventListener('click', function() {
            document.getElementById('emailPreviewModal').classList.remove('show');
        });
    }
    
    if (clearLogBtn) {
        clearLogBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to clear all log entries?')) {
                const logBody = document.getElementById('adminLogBody');
                if (logBody) {
                    logBody.innerHTML = `
                        <div class="admin-log-empty">
                            <i class="fas fa-info-circle"></i>
                            <p>Activity log will appear here</p>
                        </div>
                    `;
                    addAdminLog('info', 'Log Cleared', 'All log entries have been cleared');
                }
            }
        });
    }
    
    // Filter functionality
    if (logFilters.length > 0) {
        logFilters.forEach(btn => {
            btn.addEventListener('click', function() {
                const filter = this.getAttribute('data-log-filter');
                
                // Update active state
                logFilters.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                
                // Filter log items
                const logItems = document.querySelectorAll('.admin-log-item');
                logItems.forEach(item => {
                    if (filter === 'all') {
                        item.style.display = 'block';
                    } else {
                        if (item.classList.contains(filter)) {
                            item.style.display = 'block';
                        } else {
                            item.style.display = 'none';
                        }
                    }
                });
            });
        });
    }
    
    // Don't add "Session Started" here - it will be added after loading old logs
}

function addAdminLog(type, title, message, saveToSupabaseFlag = true, timestamp = null) {
    console.log(`📝 Adding log: ${type} | ${title} | Save:${saveToSupabaseFlag} | Timestamp:${timestamp ? new Date(timestamp).toLocaleString() : 'NOW'}`);
    
    const logBody = document.getElementById('adminLogBody');
    if (!logBody) {
        console.error('❌ adminLogBody element not found!');
        return;
    }
    
    // Remove empty state
    const emptyState = logBody.querySelector('.admin-log-empty');
    if (emptyState) {
        emptyState.remove();
    }
    
    const logItem = document.createElement('div');
    logItem.className = `admin-log-item ${type}`;
    
    // Use provided timestamp or current time
    const logTime = timestamp ? new Date(timestamp) : new Date();
    const timeStr = logTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    console.log(`  ⏰ Time: ${timeStr}`);
    
    // Icon based on type
    let icon = '';
    switch(type) {
        case 'success': icon = '<i class="fas fa-check-circle"></i>'; break;
        case 'error': icon = '<i class="fas fa-times-circle"></i>'; break;
        case 'warning': icon = '<i class="fas fa-exclamation-triangle"></i>'; break;
        case 'info': icon = '<i class="fas fa-info-circle"></i>'; break;
        default: icon = '<i class="fas fa-circle"></i>';
    }
    
    logItem.innerHTML = `
        <div class="admin-log-item-header">
            <span class="admin-log-item-title">${icon} ${title}</span>
            <span class="admin-log-item-time">${timeStr}</span>
        </div>
        <div class="admin-log-item-message">${message}</div>
    `;
    
    logBody.insertBefore(logItem, logBody.firstChild);
    
    // Limit to 100 log items
    const items = logBody.querySelectorAll('.admin-log-item');
    if (items.length > 100) {
        items[items.length - 1].remove();
    }
    
    console.log(`  ✅ Log added to UI. Total logs: ${items.length}`);
    
    // Update badge count in sidebar
    updateLogBadge();
    
    // Save to Supabase using new DataManager
    if (saveToSupabaseFlag) {
        console.log(`  🔍 Checking DataManager availability...`);
        console.log(`    window.DataManager exists: ${!!window.DataManager}`);
        console.log(`    window.DataManager.saveLog exists: ${!!(window.DataManager && window.DataManager.saveLog)}`);
        
        if (window.DataManager && window.DataManager.saveLog) {
            console.log(`  💾 Calling DataManager.saveLog('${type}', '${title}', '${message}')`);
            window.DataManager.saveLog(type, title, message)
                .then(result => {
                    console.log(`  ✅ saveLog returned:`, result);
                })
                .catch(err => {
                    console.error('  ❌ Failed to save log to Supabase:', err);
                });
        } else {
            console.error(`  ❌ DataManager or saveLog not available!`);
        }
    } else {
        console.log(`  ⏭️ Skipping Supabase save (saveToSupabaseFlag = false)`);
    }
}

function updateLogBadge() {
    const logBadge = document.getElementById('logBadge');
    const logItems = document.querySelectorAll('.admin-log-item');
    if (logBadge && logItems.length > 0) {
        logBadge.textContent = logItems.length;
        logBadge.style.display = 'flex';
    }
}

// ==============================================
// EMAIL PREVIEW FUNCTIONS
// ==============================================

function previewEmail(app, action = 'approve') {
    const modal = document.getElementById('emailPreviewModal');
    const frame = document.getElementById('emailPreviewFrame');
    const confirmBtn = document.getElementById('confirmSendEmail');
    
    if (!modal || !frame) return;
    
    addAdminLog('info', 'Email Preview', `Previewing ${action} email for ${app.name}`);
    
    // Generate preview HTML based on action
    let previewHTML = generateEmailPreview(app, action);
    
    // Write to iframe
    const iframeDoc = frame.contentDocument || frame.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(previewHTML);
    iframeDoc.close();
    
    // Setup confirm button
    confirmBtn.style.display = 'block';
    confirmBtn.onclick = function() {
        modal.classList.remove('show');
        if (action === 'approve') {
            approveApplication(app.id);
        } else {
            const reason = prompt(`Reject ${app.name}'s application?\n\nOptional: Enter rejection reason:`);
            if (reason !== null) {
                rejectApplicationWithReason(app.id, reason);
            }
        }
    };
    
    modal.classList.add('show');
}

function generateEmailPreview(app, action) {
    const studentName = app.name || 'Student';
    const courseName = app.course || 'IGNITE Training Program';
    const transactionId = app.upiTransactionId || '';
    
    if (action === 'reject') {
        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Payment Issue</title>
<style>
  body { background:#000; margin:0; padding:20px; font-family:Arial, sans-serif; color:#fff; }
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
<p>Hi <b>${studentName}</b>,</p>

<div class="alert">
  ❌ We could not verify your payment for <b>${courseName}</b>.<br><br>
  <b>Reason:</b> [Rejection reason will appear here]
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

<a href="mailto:support@soulix.tech" class="btn blue">✉️ Reply With Screenshot</a>

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
    } else {
        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Seat Confirmed</title>
<style>
  body { background-color: #000; font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #fff; }
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

      <p>Hi <b>${studentName}</b>,</p>

      <div class="success">
        ✅ Your payment has been successfully verified.<br>
        🚀 Your seat for the ${courseName} is officially confirmed.
      </div>

      <div class="details-box">
        <b>Program Details:</b><br><br>
        📚 <b>${courseName}</b><br>
        🔥 Live project-based learning<br>
        🧠 Includes: Front‑end + Back‑end + Database + Deployment + Portfolio building<br>
        ${transactionId ? '<b>Transaction ID:</b> ' + transactionId + '<br>' : ''}<br>
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
  © 2025 SOULIX — All rights reserved.
</footer>
</body>
</html>`;
    }
}
