import CinemaShelf from "@/components/CinemaShelf";
import { GENRE_NAMES } from "@/lib/genres";

export default function TopSix({ title = "Six worth making time for.", subtitle = "The audience has spoken", mediaType = "movie", genreIds, defaultGenre, count = 6 }: {
  title?: string; subtitle?: string; mediaType?: "movie" | "tv"; genreIds?: string[]; defaultGenre?: string; count?: number;
}) {
  const ids = genreIds ?? (mediaType === "movie" ? ["28", "18", "35", "27", "878", "80", "12", "16"] : ["18", "80", "35", "10765", "9648", "16", "10759", "99"]);
  const selections = ids.map(id => ({ label: id.split(",").map(value => GENRE_NAMES[value] ?? "All genres").join(" + "), url: `/api/getDiscover?type=${mediaType}&with_genres=${id}&sort_by=vote_average.desc&vote_count_gte=${mediaType === "movie" ? 1000 : 300}` }));
  const selectedIndex = Math.max(0, ids.indexOf(defaultGenre ?? ids[0]));
  return <CinemaShelf id="audience-picks" title={title} subtitle={subtitle} mediaType={mediaType} variant="ranked" limit={count} selections={selections} selectionLabel="Chart genre" fetchUrl={selections[selectedIndex].url} />;
}
