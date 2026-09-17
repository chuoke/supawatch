export const EPISODE_RATING_BANDS = [
  { min: 9, label: "9–10", color: "#b49ae2", name: "Exceptional" },
  { min: 8, label: "8–8.9", color: "#68bca8", name: "Great" },
  { min: 7, label: "7–7.9", color: "#9fbf7a", name: "Good" },
  { min: 6, label: "6–6.9", color: "#d9c575", name: "Mixed" },
  { min: 5, label: "5–5.9", color: "#dc995f", name: "Below average" },
  { min: 0, label: "< 5", color: "#d47778", name: "Low rated" },
] as const;

export function episodeRating(episode: { vote_average?: number; vote_count?: number }): number | null {
  const value = episode.vote_average;
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 10 && episode.vote_count !== 0 ? Math.round(value * 10) / 10 : null;
}

export function episodeRatingBand(rating: number | null) {
  return rating === null ? null : EPISODE_RATING_BANDS.find(band => Math.round(rating * 10) / 10 >= band.min) ?? null;
}
