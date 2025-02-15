import * as React from "react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

    if (!siteKey) {
      console.error('ReCAPTCHA site key is missing');
      setHasError(true);
      setIsLoading(false);
      toast({
        title: "Error",
        description: "ReCAPTCHA configuration is missing. Please try again later.",
        variant: "destructive",
      });
      return;
    }

    // Load the reCAPTCHA script
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit`;
    script.async = true;
    script.defer = true;

    script.onerror = () => {
      console.error('Failed to load reCAPTCHA script');
      setHasError(true);
      setIsLoading(false);
      toast({
        title: "Error",
        description: "Failed to load security verification. Please refresh the page.",
        variant: "destructive",
      });
    };

    // Create a callback for when reCAPTCHA is loaded
    window.onRecaptchaLoad = () => {
      try {
        window.grecaptcha.render("recaptcha-container", {
          sitekey: siteKey,
          callback: onVerify,
          'expired-callback': () => {
            toast({
              title: "Verification Expired",
              description: "Please complete the security check again.",
              variant: "destructive",
            });
          },
          'error-callback': () => {
            setHasError(true);
            toast({
              title: "Verification Failed",
              description: "Please try again or refresh the page.",
              variant: "destructive",
            });
          },
        });
        setIsLoading(false);
      } catch (error) {
        console.error('Error rendering reCAPTCHA:', error);
        setHasError(true);
        setIsLoading(false);
        toast({
          title: "Error",
          description: "Failed to initialize security verification. Please refresh the page.",
          variant: "destructive",
        });
      }
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
      window.onRecaptchaLoad = undefined;
    };
  }, [onVerify, toast]);

  if (hasError) {
    return (
      <div className="text-sm text-destructive text-center mt-4">
        Security verification failed to load. Please refresh the page.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground text-center mt-4">
        Loading security verification...
      </div>
    );
  }

  return <div id="recaptcha-container" className="mt-4 flex justify-center"></div>;
}