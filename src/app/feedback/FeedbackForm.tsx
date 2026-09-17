"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function FeedbackForm() {
  const [kind, setKind] = useState("feedback");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(false);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (message.trim().length >= 10) setPreview(true);
  }
  return <div className="ph-no-capture" data-ph-no-capture>
    {preview ? <div className="flex flex-col gap-4"><p className="text-sm text-muted-foreground">{kind === "bug" ? "Something isn’t working" : kind === "feature" ? "Feature idea" : "General feedback"}</p><p className="text-sm whitespace-pre-wrap break-words">{message}</p><p role="status" className="text-sm text-muted-foreground">Preview only. Feedback delivery isn’t connected yet; your message hasn’t been sent.</p><Button variant="outline" onClick={() => setPreview(false)}>Keep editing</Button></div> : <form onSubmit={onSubmit}>
      <FieldGroup className="gap-4">
        <Field><FieldLabel id="feedback-kind-label">Topic</FieldLabel><Select value={kind} onValueChange={setKind}><SelectTrigger aria-labelledby="feedback-kind-label" className="w-full min-h-11"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem value="feedback">General feedback</SelectItem><SelectItem value="bug">Something isn’t working</SelectItem><SelectItem value="feature">Feature idea</SelectItem></SelectGroup></SelectContent></Select></Field>
        <Field><FieldLabel htmlFor="feedback-message">Your message</FieldLabel><Textarea id="feedback-message" name="message" required minLength={10} maxLength={2000} rows={4} value={message} onChange={event => setMessage(event.target.value)} placeholder="What should we improve?" aria-describedby="feedback-message-help" /><FieldDescription id="feedback-message-help">10–2,000 characters. Please leave out personal details.</FieldDescription></Field>
        <Button type="submit" className="min-h-11" disabled={message.trim().length < 10}>Preview feedback</Button>
      </FieldGroup>
    </form>}
  </div>;
}
