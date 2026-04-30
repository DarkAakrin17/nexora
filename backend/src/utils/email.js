const nodemailer = require('nodemailer');

const createTransporter = () => {
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your_email@gmail.com') {
    return null;
  }
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendConnectionRequestEmail = async ({ toEmail, toName, fromName, introMessage, requestId }) => {
  const transporter = createTransporter();
  if (!transporter) {
    console.log('[Email] No email config. Skipping email notification.');
    return;
  }

  const acceptUrl = `${process.env.FRONTEND_URL}/requests?action=accept&requestId=${requestId}`;
  const rejectUrl = `${process.env.FRONTEND_URL}/requests?action=reject&requestId=${requestId}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', sans-serif; background: #0f0f1a; color: #e2e8f0; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background: #1a1a2e; border-radius: 16px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #667eea, #764ba2); padding: 32px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; color: #fff; }
        .header p { margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px; }
        .body { padding: 32px; }
        .from-badge { display: inline-block; background: rgba(102,126,234,0.2); border: 1px solid #667eea; color: #a78bfa; padding: 4px 12px; border-radius: 20px; font-size: 14px; margin-bottom: 16px; }
        .message-box { background: #0f0f1a; border-left: 3px solid #667eea; padding: 16px; border-radius: 8px; margin: 16px 0; font-style: italic; color: #cbd5e1; }
        .buttons { display: flex; gap: 12px; margin-top: 24px; }
        .btn { display: inline-block; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }
        .btn-accept { background: linear-gradient(135deg, #10b981, #059669); color: #fff; }
        .btn-reject { background: rgba(239,68,68,0.2); border: 1px solid #ef4444; color: #f87171; }
        .footer { background: #0f0f1a; padding: 16px 32px; text-align: center; color: #64748b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🌍 StudyConnect Global</h1>
          <p>A new connection request is waiting for you</p>
        </div>
        <div class="body">
          <p>Hi <strong>${toName}</strong>,</p>
          <div class="from-badge">Connection request from ${fromName}</div>
          <p>They introduced themselves:</p>
          <div class="message-box">"${introMessage}"</div>
          <p>Log in to your dashboard to respond, or use the quick links below:</p>
          <div class="buttons">
            <a href="${acceptUrl}" class="btn btn-accept">✅ Accept</a>
            <a href="${rejectUrl}" class="btn btn-reject">❌ Decline</a>
          </div>
        </div>
        <div class="footer">
          <p>StudyConnect Global • Privacy-First International Student Networking</p>
          <p>You can turn off email notifications in your profile settings.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: toEmail,
      subject: `🌍 ${fromName} wants to connect with you on StudyConnect Global`,
      html,
    });
    console.log(`[Email] Sent connection request notification to ${toEmail}`);
  } catch (err) {
    console.error('[Email] Failed to send email:', err.message);
  }
};

const sendAcceptedEmail = async ({ toEmail, toName, acceptedByName }) => {
  const transporter = createTransporter();
  if (!transporter) return;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', sans-serif; background: #0f0f1a; color: #e2e8f0; }
        .container { max-width: 600px; margin: 40px auto; background: #1a1a2e; border-radius: 16px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #10b981, #059669); padding: 32px; text-align: center; }
        .header h1 { margin: 0; color: #fff; }
        .body { padding: 32px; }
        .cta { display: inline-block; margin-top: 20px; padding: 12px 28px; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; }
        .footer { background: #0f0f1a; padding: 16px 32px; text-align: center; color: #64748b; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>🎉 Connection Accepted!</h1></div>
        <div class="body">
          <p>Hi <strong>${toName}</strong>,</p>
          <p><strong>${acceptedByName}</strong> accepted your connection request! You can now chat with each other on StudyConnect Global.</p>
          <a href="${process.env.FRONTEND_URL}/chat" class="cta">Start Chatting →</a>
        </div>
        <div class="footer"><p>StudyConnect Global • Privacy-First International Student Networking</p></div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: toEmail,
      subject: `🎉 ${acceptedByName} accepted your connection request!`,
      html,
    });
  } catch (err) {
    console.error('[Email] Failed to send accepted email:', err.message);
  }
};

module.exports = { sendConnectionRequestEmail, sendAcceptedEmail };
