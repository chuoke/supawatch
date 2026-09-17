export function matchesSearchFilters(item: Record<string, unknown>, params: URLSearchParams) {
  const genres = (params.get("with_genres") ?? "").split(",").filter(Boolean).map(Number);
  const ids = Array.isArray(item.genre_ids) ? item.genre_ids : [];
  const equivalents: Record<number, number[]> = item.media_type === "tv"
    ? { 28: [10759], 12: [10759], 14: [10765], 878: [10765], 10752: [10768] }
    : { 10759: [28, 12], 10765: [14, 878], 10768: [10752] };
  if (genres.some(id => !(equivalents[id] ?? [id]).some(g => ids.includes(g)))) return false;
  const from = Number(params.get("year_from"));
  const to = Number(params.get("year_to"));
  const year = Number(String(item.release_date || item.first_air_date || item.date || "").slice(0, 4));
  if ((from && (!year || year < from)) || (to && (!year || year > to))) return false;
  if (Number(item.vote_average ?? 0) < Number(params.get("vote_average_gte"))) return false;
  const language = params.get("language");
  return !language || item.original_language === language;
}
