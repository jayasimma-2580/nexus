/**
 * utils/emailService.js — Nodemailer email service for NEXUS
 *
 * Exports:
 *   sendOtpEmail               — Email address verification OTP
 *   sendPhoneOtpEmail          — Phone number verification OTP (sent to email as fallback)
 *   sendPasswordResetOtpEmail  — Password reset OTP
 *   sendWelcomeEmail           — Welcome email after full account verification
 *   sendSellerApprovedEmail    — Seller approval notification
 *   sendSellerRejectedEmail    — Seller rejection notification
 *   sendOrderConfirmationEmail — Buyer order confirmation with full details
 */

import nodemailer from "nodemailer";

// Transporter is created fresh inside send() so .env is always loaded before use
const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn("[Email] SMTP not fully configured — check SMTP_HOST, SMTP_USER, SMTP_PASS in .env");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth:   { user, pass },
  });
};

const base = (content, accentColor = "linear-gradient(135deg,#6366f1,#8b5cf6)") => `
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>NEXUS Market</title></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 20px;">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:16px;overflow:hidden;border:1px solid #2a2a2a;">
      <tr><td style="background:${accentColor};padding:28px 40px;text-align:center;">
        <h1 style="margin:0;color:#fff;font-size:26px;font-weight:700;">NEXUS</h1>
        <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:12px;letter-spacing:2px;text-transform:uppercase;">Market Platform</p>
      </td></tr>
      <tr><td style="padding:36px 40px;">${content}</td></tr>
      <tr><td style="padding:20px 40px;border-top:1px solid #2a2a2a;text-align:center;">
        <p style="margin:0;color:#555;font-size:12px;">© ${new Date().getFullYear()} NEXUS Market. All rights reserved.</p>
        <p style="margin:4px 0 0;color:#444;font-size:11px;">If you didn't expect this email, you can safely ignore it.</p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;

const send = async ({ to, subject, html }) => {
  const transporter = createTransporter();

  if (!transporter) {
    const text = html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    console.log(`\n[EMAIL DEV]\nTo: ${to}\nSubject: ${subject}\n${text.slice(0, 300)}\n`);
    return { messageId: "dev-mode" };
  }

  const info = await transporter.sendMail({
    from: `"NEXUS Market" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to, subject, html,
  });

  console.log(`[Email] Sent to ${to} — MessageId: ${info.messageId}`);
  return info;
};

const otpBlock = (otp, gradient) => `
  <div style="text-align:center;margin:0 0 28px;">
    <div style="display:inline-block;background:${gradient};border-radius:12px;padding:18px 40px;">
      <span style="color:#fff;font-size:36px;font-weight:800;letter-spacing:10px;font-family:monospace;">${otp}</span>
    </div>
  </div>`;

// ── Email address verification OTP ───────────────────────────────────────────
export const sendOtpEmail = async (user, otp) => {
  const html = base(`
    <h2 style="margin:0 0 6px;color:#fff;font-size:20px;font-weight:600;">Verify your email</h2>
    <p style="margin:0 0 28px;color:#aaa;font-size:14px;line-height:1.6;">
      Hi <strong style="color:#fff;">${user.name}</strong>, use the OTP below to verify your NEXUS account.
      It expires in <strong style="color:#fff;">10 minutes</strong>.
    </p>
    ${otpBlock(otp, "linear-gradient(135deg,#6366f1,#8b5cf6)")}
    <p style="margin:0;color:#555;font-size:12px;text-align:center;">
      Never share this code. If you didn't sign up for NEXUS, ignore this email.
    </p>
  `);
  return send({ to: user.email, subject: `${otp} — Your NEXUS email verification code`, html });
};

// ── Phone OTP — sent to email as fallback when SMS not configured ─────────────
export const sendPhoneOtpEmail = async (user, otp) => {
  const html = base(`
    <h2 style="margin:0 0 6px;color:#fff;font-size:20px;font-weight:600;">Verify your phone number</h2>
    <p style="margin:0 0 8px;color:#aaa;font-size:14px;line-height:1.6;">
      Hi <strong style="color:#fff;">${user.name}</strong>, use the OTP below to verify your phone number
      <strong style="color:#fff;">${user.phone}</strong>.
    </p>
    <p style="margin:0 0 28px;color:#aaa;font-size:14px;">
      Expires in <strong style="color:#fff;">10 minutes</strong>.
    </p>
    ${otpBlock(otp, "linear-gradient(135deg,#10b981,#059669)")}
    <p style="margin:0;color:#555;font-size:12px;text-align:center;">
      Never share this code. If you didn't request this, ignore it.
    </p>
  `, "linear-gradient(135deg,#10b981,#059669)");
  return send({ to: user.email, subject: `${otp} — NEXUS phone verification code`, html });
};

// ── Password reset OTP ────────────────────────────────────────────────────────
export const sendPasswordResetOtpEmail = async (user, otp) => {
  const html = base(`
    <h2 style="margin:0 0 6px;color:#fff;font-size:20px;font-weight:600;">Reset your password</h2>
    <p style="margin:0 0 28px;color:#aaa;font-size:14px;line-height:1.6;">
      Hi <strong style="color:#fff;">${user.name}</strong>, use the OTP below to reset your password.
      It expires in <strong style="color:#fff;">15 minutes</strong>.
    </p>
    ${otpBlock(otp, "linear-gradient(135deg,#f59e0b,#ef4444)")}
    <p style="margin:0;color:#555;font-size:12px;text-align:center;">
      Never share this code. If you didn't request a reset, ignore this email.
    </p>
  `, "linear-gradient(135deg,#f59e0b,#ef4444)");
  return send({ to: user.email, subject: `${otp} — Reset your NEXUS password`, html });
};

// ── Welcome email after account fully verified ────────────────────────────────
export const sendWelcomeEmail = async (user) => {
  const isSeller = user.role === "seller";
  const html = base(`
    <h2 style="margin:0 0 8px;color:#fff;font-size:22px;font-weight:700;">
      Welcome to NEXUS${isSeller ? ', ' + (user.shopName || user.name) : ', ' + user.name}! 🎉
    </h2>
    <p style="margin:0 0 20px;color:#aaa;font-size:14px;line-height:1.7;">
      ${isSeller
        ? `Your seller account has been created and your application for <strong style="color:#fff;">${user.shopName}</strong> has been submitted for review. Our admin team will review your store and notify you by email once approved.`
        : `Your account is verified and ready. Start exploring thousands of products from verified sellers across India.`
      }
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      ${isSeller ? `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;">
          <span style="color:#6366f1;font-size:18px;margin-right:10px;">📦</span>
          <span style="color:#ccc;font-size:14px;">List your products after approval</span>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;">
          <span style="color:#6366f1;font-size:18px;margin-right:10px;">📊</span>
          <span style="color:#ccc;font-size:14px;">Track sales and earnings from your dashboard</span>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;">
          <span style="color:#6366f1;font-size:18px;margin-right:10px;">💬</span>
          <span style="color:#ccc;font-size:14px;">Reply to buyer reviews on your products</span>
        </td>
      </tr>
      ` : `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;">
          <span style="color:#6366f1;font-size:18px;margin-right:10px;">🛍️</span>
          <span style="color:#ccc;font-size:14px;">Shop from 500+ verified sellers</span>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;">
          <span style="color:#6366f1;font-size:18px;margin-right:10px;">❤️</span>
          <span style="color:#ccc;font-size:14px;">Save favourites to your wishlist</span>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;">
          <span style="color:#6366f1;font-size:18px;margin-right:10px;">⭐</span>
          <span style="color:#ccc;font-size:14px;">Leave reviews for products you've received</span>
        </td>
      </tr>
      `}
    </table>

    <div style="text-align:center;">
      <a href="${process.env.FRONTEND_URL}${isSeller ? '/seller' : '/shop'}"
        style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;
               text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:600;">
        ${isSeller ? 'Go to Seller Dashboard' : 'Start Shopping'}
      </a>
    </div>
  `);
  return send({ to: user.email,
    subject: `Welcome to NEXUS, ${user.name}! Your account is ready`, html });
};

// ── Seller approved notification ──────────────────────────────────────────────
export const sendSellerApprovedEmail = async (seller) => {
  const html = base(`
    <h2 style="margin:0 0 8px;color:#22c55e;font-size:20px;font-weight:600;">Your store is approved! 🎉</h2>
    <p style="margin:0 0 16px;color:#aaa;font-size:14px;line-height:1.6;">
      Hi <strong style="color:#fff;">${seller.name}</strong>, your seller account for
      <strong style="color:#fff;">${seller.shopName}</strong> has been approved by our admin team.
      You can now log in and start listing products on NEXUS.
    </p>
    <div style="text-align:center;">
      <a href="${process.env.FRONTEND_URL}/login"
        style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;
               text-decoration:none;padding:13px 32px;border-radius:8px;font-size:14px;font-weight:600;">
        Go to Seller Dashboard
      </a>
    </div>
  `, "linear-gradient(135deg,#22c55e,#16a34a)");
  return send({ to: seller.email, subject: "🎉 Your NEXUS seller account is approved!", html });
};

// ── Seller rejected notification ──────────────────────────────────────────────
export const sendSellerRejectedEmail = async (seller, reason) => {
  const html = base(`
    <h2 style="margin:0 0 8px;color:#f59e0b;font-size:20px;font-weight:600;">Application update</h2>
    <p style="margin:0 0 12px;color:#aaa;font-size:14px;">
      Hi <strong style="color:#fff;">${seller.name}</strong>, your application for
      <strong style="color:#fff;">${seller.shopName}</strong> was not approved at this time.
    </p>
    <div style="background:#1f1200;border:1px solid rgba(245,158,11,0.3);border-radius:8px;padding:16px;margin-bottom:16px;">
      <p style="margin:0;color:#e5c08a;font-size:13px;line-height:1.6;">${reason}</p>
    </div>
    <p style="color:#aaa;font-size:13px;line-height:1.6;">
      Please address the feedback above and re-apply. If you have questions, contact our support team.
    </p>
  `, "linear-gradient(135deg,#f59e0b,#d97706)");
  return send({ to: seller.email, subject: "Update on your NEXUS seller application", html });
};

// ── Order confirmation email ──────────────────────────────────────────────────
export const sendOrderConfirmationEmail = async (buyer, order) => {
  const itemRows = (order.orderItems || []).slice(0, 8).map((i) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #222;">
        <p style="margin:0;color:#ddd;font-size:13px;font-weight:600;">${i.name}</p>
        ${i.seller?.shopName ? `<p style="margin:2px 0 0;color:#666;font-size:11px;">by ${i.seller.shopName}</p>` : ''}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #222;text-align:center;color:#aaa;font-size:13px;">×${i.quantity}</td>
      <td style="padding:10px 0;border-bottom:1px solid #222;text-align:right;color:#fff;font-size:13px;font-weight:600;">
        ₹${(i.price * i.quantity).toLocaleString('en-IN')}
      </td>
    </tr>`).join("");

  const html = base(`
    <h2 style="margin:0 0 4px;color:#fff;font-size:22px;font-weight:700;">Order confirmed! 🛍️</h2>
    <p style="margin:0 0 24px;color:#aaa;font-size:14px;">
      Hi <strong style="color:#fff;">${buyer.name}</strong> — your order
      <strong style="color:#6366f1;font-family:monospace;">#${order._id.toString().slice(-8).toUpperCase()}</strong>
      has been placed successfully.
    </p>

    <!-- Items table -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 4px;">
      <thead>
        <tr>
          <th style="text-align:left;color:#555;font-size:11px;text-transform:uppercase;letter-spacing:1px;padding-bottom:8px;">Item</th>
          <th style="text-align:center;color:#555;font-size:11px;text-transform:uppercase;letter-spacing:1px;padding-bottom:8px;">Qty</th>
          <th style="text-align:right;color:#555;font-size:11px;text-transform:uppercase;letter-spacing:1px;padding-bottom:8px;">Price</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <!-- Price breakdown -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0 24px;">
      <tr>
        <td style="padding:4px 0;color:#888;font-size:13px;">Subtotal</td>
        <td style="padding:4px 0;text-align:right;color:#ccc;font-size:13px;">₹${order.itemsPrice?.toLocaleString('en-IN')}</td>
      </tr>
      ${order.taxPrice > 0 ? `
      <tr>
        <td style="padding:4px 0;color:#888;font-size:13px;">Tax</td>
        <td style="padding:4px 0;text-align:right;color:#ccc;font-size:13px;">₹${order.taxPrice?.toLocaleString('en-IN')}</td>
      </tr>` : ''}
      <tr>
        <td style="padding:4px 0;color:#888;font-size:13px;">Shipping</td>
        <td style="padding:4px 0;text-align:right;color:${order.shippingPrice === 0 ? '#22c55e' : '#ccc'};font-size:13px;">
          ${order.shippingPrice === 0 ? 'Free' : '₹' + order.shippingPrice?.toLocaleString('en-IN')}
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0 0;border-top:1px solid #2a2a2a;color:#fff;font-size:16px;font-weight:700;">Total</td>
        <td style="padding:10px 0 0;border-top:1px solid #2a2a2a;text-align:right;color:#6366f1;font-size:20px;font-weight:800;">
          ₹${order.totalPrice?.toLocaleString('en-IN')}
        </td>
      </tr>
    </table>

    <!-- Shipping address -->
    ${order.shippingInfo ? `
    <div style="background:#111;border:1px solid #2a2a2a;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
      <p style="margin:0 0 6px;color:#555;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Shipping to</p>
      <p style="margin:0;color:#ccc;font-size:13px;line-height:1.6;">
        ${order.shippingInfo.address}<br>
        ${order.shippingInfo.city}, ${order.shippingInfo.postalCode}<br>
        ${order.shippingInfo.country}
        ${order.shippingInfo.phone ? `<br>📞 ${order.shippingInfo.phone}` : ''}
      </p>
    </div>` : ''}

    <!-- Payment method -->
    <p style="margin:0 0 24px;color:#888;font-size:13px;">
      Payment: <strong style="color:#ccc;">${order.paymentInfo?.method || 'COD'}</strong>
      ${order.isPaid ? ' <span style="color:#22c55e;">✓ Paid</span>' : ' · Pay on delivery'}
    </p>

    <div style="text-align:center;">
      <a href="${process.env.FRONTEND_URL}/orders/${order._id}"
        style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;
               text-decoration:none;padding:13px 32px;border-radius:8px;font-size:14px;font-weight:600;">
        View Order Details
      </a>
    </div>
  `);
  return send({ to: buyer.email,
    subject: `Order confirmed ✓ #${order._id.toString().slice(-8).toUpperCase()} — ₹${order.totalPrice?.toLocaleString('en-IN')}`,
    html });
};
