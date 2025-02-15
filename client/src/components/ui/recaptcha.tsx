import * as React from "react";
import { useEffect } from "react";

declare global {
  interface Window {
    grecaptcha: any;
    onRecaptchaLoad: () => void;
  }
}

interface ReCAPTCHAProps {
  onVerify: (token: string) => void;
}

export function ReCAPTCHA({ onVerify }: ReCAPTCHAProps) {
  useEffect(() => {
    // Load the reCAPTCHA script
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit`;
    script.async = true;
    script.defer = true;

    // Create a callback for when reCAPTCHA is loaded
    window.onRecaptchaLoad = () => {
      window.grecaptcha.render("recaptcha-container", {
        sitekey: import.meta.env.VITE_RECAPTCHA_SITE_KEY,
        callback: onVerify,
      });
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
      delete window.onRecaptchaLoad;
    };
  }, [onVerify]);

  return <div id="recaptcha-container" className="mt-4 flex justify-center"></div>;
}
