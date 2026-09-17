"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import FeedbackForm from "@/app/feedback/FeedbackForm";

export function FeedbackTrigger() {
  const [open, setOpen] = useState(false);
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const linked = params.get("feedback") === "1";
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("sw-open-feedback", show);
    return () => window.removeEventListener("sw-open-feedback", show);
  }, []);
  return <Popover open={open || linked} onOpenChange={value => {
    setOpen(value);
    if (!value && linked) { const next = new URLSearchParams(params); next.delete("feedback"); router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }); }
  }}>
    <PopoverTrigger asChild><Button variant="ghost" size="icon" aria-label="Leave anonymous feedback" data-intro-chrome className="mr-3 size-11"><MessageSquare /></Button></PopoverTrigger>
    <PopoverContent align="end" sideOffset={12} collisionPadding={12} className="feedback-popover w-[min(360px,calc(100vw-24px))]" aria-labelledby="feedback-title" aria-describedby="feedback-description">
      <PopoverHeader><PopoverTitle id="feedback-title">Leave feedback</PopoverTitle><PopoverDescription id="feedback-description">Report a problem or suggest an improvement. No name or email needed.</PopoverDescription></PopoverHeader>
      <FeedbackForm />
    </PopoverContent>
  </Popover>;
}

// The form now lives beside its header trigger, so the popover has an anchor.
export default function FeedbackDialog() { return null; }
