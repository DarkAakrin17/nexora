const nodemailer = require('nodemailer');

// ── Build transporter using explicit SMTP settings (more reliable than 'service' shorthand) ──
const createTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT) || 587;

  if (!user || user.includes('your_email') || !pass || pass.includes('your_app') || pass.includes('xxxx')) {
    console.log('[Email] Email not configured — skipping email send.');
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465 (SSL), false for 587 (STARTTLS)
    auth: { user, pass },
    // Do NOT set rejectUnauthorized: false — Gmail certs are valid
    pool: true,          // Reuse SMTP connections for efficiency
    maxConnections: 3,
  });
};

// ── Verify transporter on startup (call this once at boot) ────────────────────
const verifyEmailConfig = async () => {
  const t = createTransporter();
  if (!t) {
    console.warn('[Email] ⚠️  Email service is NOT configured. Forgot-password and notifications will be unavailable.');
    return false;
  }
  try {
    await t.verify();
    console.log('[Email] ✅ SMTP connection verified — email service ready.');
    return true;
  } catch (err) {
    console.error('[Email] ❌ SMTP verification failed:', err.message);
    console.error('[Email] ❌ Check EMAIL_USER and EMAIL_PASS in your .env file.');
    console.error('[Email] ❌ For Gmail, use a 16-character App Password (not your account password).');
    return false;
  }
};

// Verify transporter — throws if not configured (used for password reset where we MUST send)
const requireTransporter = () => {
  const t = createTransporter();
  if (!t) throw new Error('Email service is not configured on the server.');
  return t;
};

// ── Send connection request notification ─────────────────────────────────────
const sendConnectionRequestEmail = async ({ toEmail, toName, fromName, introMessage, requestId }) => {
  const transporter = createTransporter();
  if (!transporter) return;

  const dashboardUrl = `${process.env.FRONTEND_URL}/requests`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f0f1a; color: #e2e8f0; margin: 0; padding: 0; }
        .wrap { max-width: 600px; margin: 0 auto; padding: 40px 16px; }
        .card { background: #1a1a2e; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); }
        .header { background: linear-gradient(135deg, #7c3aed, #06b6d4); padding: 32px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; color: #fff; }
        .header p { margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px; }
        .body { padding: 28px 32px; }
        .badge { display: inline-block; background: rgba(124,58,237,0.2); border: 1px solid #7c3aed; color: #c4b5fd; padding: 4px 14px; border-radius: 20px; font-size: 13px; margin-bottom: 16px; }
        .msg-box { background: rgba(124,58,237,0.08); border-left: 3px solid #7c3aed; padding: 14px 18px; border-radius: 0 8px 8px 0; margin: 16px 0; font-style: italic; color: #cbd5e1; line-height: 1.6; }
        .cta { display: inline-block; margin-top: 20px; padding: 13px 32px; background: linear-gradient(135deg, #7c3aed, #06b6d4); color: #fff !important; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; }
        .footer { background: #0d0d1f; padding: 16px 32px; text-align: center; color: #475569; font-size: 12px; border-top: 1px solid rgba(255,255,255,0.05); }
      </style>
    </head>
    <body>
      <div class="wrap"><div class="card">
        <div class="header">
          <h1>🌍 Nexora</h1>
          <p>You have a new connection request</p>
        </div>
        <div class="body">
          <p>Hi <strong>${toName}</strong>,</p>
          <div class="badge">From: ${fromName}</div>
          <p>They introduced themselves:</p>
          <div class="msg-box">"${introMessage}"</div>
          <p>Head to your dashboard to accept or decline:</p>
          <a href="${dashboardUrl}" class="cta">View Request →</a>
        </div>
        <div class="footer">
          <p>Nexora · Privacy-First Student Networking</p>
          <p>You can turn off email notifications in your profile settings.</p>
        </div>
      </div></div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"Nexora" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `🌍 ${fromName} wants to connect with you on Nexora`,
      html,
    });
    console.log(`[Email] ✅ Request notification sent to ${toEmail}`);
  } catch (err) {
    console.error('[Email] ❌ Failed to send request email:', err.message);
  }
};

// ── Send acceptance notification ─────────────────────────────────────────────
const sendAcceptedEmail = async ({ toEmail, toName, acceptedByName }) => {
  const transporter = createTransporter();
  if (!transporter) return;

  const chatUrl = `${process.env.FRONTEND_URL}/chat`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f0f1a; color: #e2e8f0; margin: 0; padding: 0; }
        .wrap { max-width: 600px; margin: 0 auto; padding: 40px 16px; }
        .card { background: #1a1a2e; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); }
        .header { background: linear-gradient(135deg, #10b981, #06b6d4); padding: 32px; text-align: center; }
        .header h1 { margin: 0; color: #fff; font-size: 22px; }
        .body { padding: 28px 32px; }
        .highlight { font-size: 1.1em; font-weight: 700; color: #6ee7b7; }
        .cta { display: inline-block; margin-top: 20px; padding: 13px 32px; background: linear-gradient(135deg, #7c3aed, #06b6d4); color: #fff !important; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; }
        .footer { background: #0d0d1f; padding: 16px 32px; text-align: center; color: #475569; font-size: 12px; border-top: 1px solid rgba(255,255,255,0.05); }
      </style>
    </head>
    <body>
      <div class="wrap"><div class="card">
        <div class="header"><h1>🎉 You're Connected!</h1></div>
        <div class="body">
          <p>Hi <strong>${toName}</strong>,</p>
          <p><span class="highlight">${acceptedByName}</span> accepted your connection request on Nexora!</p>
          <p>You can now chat, share contact info, and connect on WhatsApp, Instagram, or Telegram.</p>
          <a href="${chatUrl}" class="cta">Start Chatting →</a>
        </div>
        <div class="footer"><p>Nexora · Privacy-First Student Networking</p></div>
      </div></div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"Nexora" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `🎉 ${acceptedByName} accepted your connection request!`,
      html,
    });
    console.log(`[Email] ✅ Acceptance notification sent to ${toEmail}`);
  } catch (err) {
    console.error('[Email] ❌ Failed to send acceptance email:', err.message);
  }
};

// ── Send password reset email ─────────────────────────────────────────────
// NOTE: Uses requireTransporter() — throws if email is not configured so the
// forgot-password route can return a proper 500 instead of silently failing.
const sendPasswordResetEmail = async ({ toEmail, toName, resetUrl }) => {
  const transporter = requireTransporter();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f0f1a; color: #e2e8f0; margin: 0; padding: 0; }
        .wrap { max-width: 600px; margin: 0 auto; padding: 40px 16px; }
        .card { background: #1a1a2e; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); }
        .header { background: linear-gradient(135deg, #6366f1, #0ea5e9); padding: 32px; text-align: center; }
        .header h1 { margin: 0; color: #fff; font-size: 22px; }
        .body { padding: 28px 32px; }
        .notice { background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3); border-radius: 10px; padding: 12px 16px; font-size: 0.82rem; color: #fcd34d; margin: 16px 0; }
        .cta { display: inline-block; margin-top: 20px; padding: 13px 32px; background: linear-gradient(135deg, #6366f1, #0ea5e9); color: #fff !important; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; }
        .footer { background: #0d0d1f; padding: 16px 32px; text-align: center; color: #475569; font-size: 12px; border-top: 1px solid rgba(255,255,255,0.05); }
      </style>
    </head>
    <body>
      <div class="wrap"><div class="card">
        <div class="header"><h1>🔐 Reset Your Password</h1></div>
        <div class="body">
          <p>Hi <strong>${toName}</strong>,</p>
          <p>We received a request to reset your Nexora password. Click the button below to set a new password:</p>
          <a href="${resetUrl}" class="cta">Reset Password →</a>
          <div class="notice">⏰ This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.</div>
          <p style="font-size:0.78rem;color:#475569;margin-top:16px;">Or copy this URL into your browser:<br><span style="color:#818cf8;word-break:break-all;">${resetUrl}</span></p>
        </div>
        <div class="footer"><p>Nexora · Privacy-First Student Networking</p></div>
      </div></div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"Nexora" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `🔐 Reset your Nexora password`,
    html,
  });
  console.log(`[Email] ✅ Password reset email sent to ${toEmail}`);
};

// ── Send new message notification (only when receiver is offline) ─────────────
const sendNewMessageEmail = async ({ toEmail, toName, fromName, messagePreview }) => {
  const transporter = createTransporter();
  if (!transporter) return;

  const chatUrl = `${process.env.FRONTEND_URL}/chat`;
  // Truncate preview for safety
  // If the message looks like encrypted ciphertext (hex string), don't show it in email
  const isEncrypted = /^[0-9a-f]{32,}(:[0-9a-f]+)*$/i.test(messagePreview.trim());
  const preview = isEncrypted
    ? '[Encrypted message — open Nexora to read it]'
    : messagePreview.length > 120
      ? messagePreview.slice(0, 120) + '…'
      : messagePreview;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f0f1a; color: #e2e8f0; margin: 0; padding: 0; }
        .wrap { max-width: 600px; margin: 0 auto; padding: 40px 16px; }
        .card { background: #1a1a2e; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); }
        .header { background: linear-gradient(135deg, #7c3aed, #06b6d4); padding: 32px; text-align: center; }
        .header h1 { margin: 0; color: #fff; font-size: 22px; }
        .header p  { margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px; }
        .body { padding: 28px 32px; }
        .bubble { background: rgba(124,58,237,0.12); border-left: 3px solid #7c3aed; padding: 14px 18px; border-radius: 0 8px 8px 0; margin: 16px 0; font-style: italic; color: #cbd5e1; line-height: 1.6; }
        .cta { display: inline-block; margin-top: 20px; padding: 13px 32px; background: linear-gradient(135deg, #7c3aed, #06b6d4); color: #fff !important; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; }
        .footer { background: #0d0d1f; padding: 16px 32px; text-align: center; color: #475569; font-size: 12px; border-top: 1px solid rgba(255,255,255,0.05); }
      </style>
    </head>
    <body>
      <div class="wrap"><div class="card">
        <div class="header">
          <h1>💬 New Message on Nexora</h1>
          <p>You have an unread message from ${fromName}</p>
        </div>
        <div class="body">
          <p>Hi <strong>${toName}</strong>,</p>
          <p><strong>${fromName}</strong> sent you a message:</p>
          <div class="bubble">"${preview}"</div>
          <a href="${chatUrl}" class="cta">Reply Now →</a>
        </div>
        <div class="footer">
          <p>Nexora · Privacy-First Student Networking</p>
          <p>You can turn off email notifications in your profile settings.</p>
        </div>
      </div></div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"Nexora" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `💬 ${fromName} sent you a message on Nexora`,
      html,
    });
    console.log(`[Email] ✅ Message notification sent to ${toEmail}`);
  } catch (err) {
    console.error('[Email] ❌ Failed to send message email:', err.message);
  }
};

module.exports = {
  sendConnectionRequestEmail,
  sendAcceptedEmail,
  sendPasswordResetEmail,
  sendNewMessageEmail,
  verifyEmailConfig,
};
