"use client";

import { Check, Link2, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const text = encodeURIComponent(title);
  const encoded = encodeURIComponent(url);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn’t copy the link");
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={copy}>
        {copied ? <Check /> : <Link2 />}
        Copy link
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`} target="_blank" rel="noopener noreferrer">
          LinkedIn
        </a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={`https://x.com/intent/tweet?text=${text}&url=${encoded}`} target="_blank" rel="noopener noreferrer">
          X
        </a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={`mailto:?subject=${text}&body=${encoded}`}>
          <Mail />
          Email
        </a>
      </Button>
    </div>
  );
}
