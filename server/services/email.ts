import nodemailer from "nodemailer";
import { log } from "../vite";

// Create reusable transporter with secure settings for Gmail
const createTransporter = () => {
  // Validate SMTP credentials
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    throw new Error("SMTP credentials are not configured");
  }

  return nodemailer.createTransport({
    service: 'Gmail', // Use Gmail service
    auth: {
      user: smtpUser,
      pass: smtpPass, // Use app-specific password
    },
  });
};

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  try {
    const transporter = createTransporter();
    const resetLink = `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/reset-password?token=${resetToken}`;

    const info = await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: "Reset Your Password",
      html: `
        <h1>Password Reset Request</h1>
        <p>You requested to reset your password. Click the link below to set a new password:</p>
        <p><a href="https://${resetLink}">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });

    log(`Password reset email sent to ${email}: ${info.messageId}`);
  } catch (error) {
    log(`Error sending password reset email to ${email}: ${error}`);
    throw new Error("Email service is not properly configured. Please contact support.");
  }
}

export async function sendVerificationEmail(email: string, verificationToken: string) {
  try {
    const transporter = createTransporter();
    const verificationLink = `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/verify-email?token=${verificationToken}`;

    const info = await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: "Verify Your Email",
      html: `
        <h1>Email Verification</h1>
        <p>Thank you for registering! Please click the link below to verify your email address:</p>
        <p><a href="https://${verificationLink}">Verify Email</a></p>
        <p>This link will expire in 24 hours.</p>
      `,
    });

    log(`Verification email sent to ${email}: ${info.messageId}`);
  } catch (error) {
    log(`Error sending verification email to ${email}: ${error}`);
    throw new Error("Email service is not properly configured. Please contact support.");
  }
}