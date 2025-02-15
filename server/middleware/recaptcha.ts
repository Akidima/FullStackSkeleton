import axios from "axios";
import type { Request, Response, NextFunction } from "express";

export async function verifyRecaptcha(token: string): Promise<boolean> {
  try {
    const response = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: token,
        },
      }
    );

    return response.data.success;
  } catch (error) {
    console.error("ReCAPTCHA verification error:", error);
    return false;
  }
}

export function requireRecaptcha(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.body.recaptchaToken;

  if (!token) {
    return res.status(400).json({ message: "ReCAPTCHA verification required" });
  }

  verifyRecaptcha(token)
    .then((isValid) => {
      if (!isValid) {
        return res.status(400).json({ message: "ReCAPTCHA verification failed" });
      }
      next();
    })
    .catch((error) => {
      console.error("ReCAPTCHA middleware error:", error);
      res.status(500).json({ message: "ReCAPTCHA verification failed" });
    });
}
