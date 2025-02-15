import nodemailer from "nodemailer";
import { log } from "../vite";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  const resetLink = `${process.env.APP_URL}/reset-password?token=${resetToken}`;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Meeting Manager" <noreply@meeting-manager.com>',
      to: email,
      subject: "Reset Your Password",
      html: `
        <h1>Password Reset Request</h1>
        <p>You requested to reset your password. Click the link below to set a new password:</p>
        <p><a href="${resetLink}">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });
    log(`Password reset email sent to ${email}`);
  } catch (error) {
    log(`Error sending password reset email to ${email}: ${error}`);
    throw new Error("Failed to send password reset email");
  }
}

export async function sendVerificationEmail(email: string, verificationToken: string) {
  const verificationLink = `${process.env.APP_URL}/verify-email?token=${verificationToken}`;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Meeting Manager" <noreply@meeting-manager.com>',
      to: email,
      subject: "Verify Your Email",
      html: `
        <h1>Email Verification</h1>
        <p>Thank you for registering! Please click the link below to verify your email address:</p>
        <p><a href="${verificationLink}">Verify Email</a></p>
        <p>This link will expire in 24 hours.</p>
      `,
    });
    log(`Verification email sent to ${email}`);
  } catch (error) {
    log(`Error sending verification email to ${email}: ${error}`);
    throw new Error("Failed to send verification email");
  }
}
