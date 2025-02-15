import axios from "axios";
import type { Request, Response, NextFunction } from "express";
import { log } from "../vite";

export async function verifyRecaptcha(token: string): Promise<boolean> {
  try {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    if (!secretKey) {
      log('ReCAPTCHA secret key is missing');
      return false;
    }

    const response = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      null,
      {
        params: {
          secret: secretKey,
          response: token,
        },
      }
    );

    if (!response.data.success) {
      log(`ReCAPTCHA verification failed: ${JSON.stringify(response.data)}`);
    }

    return response.data.success;
  } catch (error) {
    if (error instanceof Error) {
      log(`ReCAPTCHA verification error: ${error.message}`);
    } else {
      log('Unknown ReCAPTCHA verification error');
    }
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
      log("ReCAPTCHA middleware error:", error);
      res.status(500).json({ message: "ReCAPTCHA verification failed" });
    });
}