import { getPerson } from "@/lib/person";
import { CACHE, jsonFromError, jsonOk, requirePositiveInt } from "@/lib/tmdb";

type PersonCredit = {
  media_type?: string;
  popularity?: number;
};

type PersonCredits = {
  cast?: PersonCredit[];
  crew?: PersonCredit[];
};

type PersonImages = {
  profiles?: unknown[];
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = requirePositiveInt(searchParams.get("id"), "id param");
  if (id instanceof Response) return id;

  try {
    const data = await getPerson(id);
    const credits: PersonCredits = data.combined_credits ?? {};
    const images: PersonImages = data.images ?? {};
    const person = { ...data };
    delete person.combined_credits;
    delete person.images;

    const knownFor = [...(credits.cast ?? []), ...(credits.crew ?? [])]
      .filter((item) => item.media_type === "movie" || item.media_type === "tv")
      .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
      .slice(0, 8);

    return jsonOk(
      {
        person,
        knownFor,
        profiles: (images.profiles ?? []).slice(0, 6),
      },
      200,
      { sMaxAge: CACHE.hour, staleWhileRevalidate: CACHE.day },
    );
  } catch (e) {
    return jsonFromError(e);
  }
}
