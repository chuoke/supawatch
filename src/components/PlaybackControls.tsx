"use client";

import { useId, useState, type Ref } from "react";
import { Film, LoaderCircle } from "lucide-react";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BlurImage from "@/components/BlurImage";

export function PlaybackSelect({ label, value, options, onValueChange }: {
  label: string; value: string; options: { value: string; label: string }[]; onValueChange: (value: string) => void;
}) {
  const id = useId();
  return <Field className="playback-select"><FieldLabel id={id}>{label}</FieldLabel><Select value={value} onValueChange={onValueChange}><SelectTrigger aria-labelledby={id}><SelectValue /></SelectTrigger><SelectContent className="playback-select-menu" position="popper"><SelectGroup>{options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>;
}

export function EmbeddedPlayer({ src, title, backdrop, iframeRef }: { src: string; title: string; backdrop?: string | null; iframeRef?: Ref<HTMLIFrameElement> }) {
  const [loaded, setLoaded] = useState(false);
  return <div className="screening-stage">
    {!loaded && <div className="screening-loading" role="status">{backdrop && <BlurImage src={`https://image.tmdb.org/t/p/w1280${backdrop}`} alt="" width={1280} height={720} lazy={false} />}<div><Film size={34} strokeWidth={1} /><p>Setting the scene<span>Opening your player</span></p><LoaderCircle className="animate-spin" size={18} /></div></div>}
    <iframe ref={iframeRef} src={src} title={title} onLoad={() => setLoaded(true)} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
  </div>;
}
