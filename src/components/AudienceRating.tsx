import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AudienceRating({ value, prominent = false }: { value?: number | null; prominent?: boolean }) {
  const rated = typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 10;
  const score = rated ? value.toFixed(1) : null;
  return <span className={cn("audience-rating", prominent && "audience-rating--prominent", !rated && "audience-rating--unrated")}
    aria-label={score ? `TMDB audience rating: ${score} out of 10` : "No audience rating yet"}
    title={score ? `TMDB audience rating: ${score} / 10` : "No audience rating yet"}>
    <Star aria-hidden="true" /><strong>{score ?? "—"}</strong>{prominent && <span>/ 10</span>}
  </span>;
}
