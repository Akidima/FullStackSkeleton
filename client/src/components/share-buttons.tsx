import { Button } from "@/components/ui/button";
import { SiLinkedin, SiFacebook } from "react-icons/si";
import { FaXTwitter } from "react-icons/fa6";

interface ShareButtonsProps {
  title: string;
  summary?: string;
  notes?: string;
  url: string;
}

export function ShareButtons({ title, summary, notes, url }: ShareButtonsProps) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedSummary = encodeURIComponent(summary || notes || "");

  const shareToLinkedIn = () => {
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}&title=${encodedTitle}&summary=${encodedSummary}`;
    window.open(linkedInUrl, '_blank', 'width=600,height=600');
  };

  const shareToTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  };

  const shareToFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={shareToLinkedIn}
        className="gap-2"
      >
        <SiLinkedin className="h-4 w-4" />
        Share on LinkedIn
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={shareToTwitter}
        className="gap-2"
      >
        <FaXTwitter className="h-4 w-4" />
        Share on X
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={shareToFacebook}
        className="gap-2"
      >
        <SiFacebook className="h-4 w-4" />
        Share
      </Button>
    </div>
  );
}