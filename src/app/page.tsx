import { Suspense } from "react";
import ScenicRoute, { ScenicSkeleton } from "@/components/discovery/ScenicRoute";
import type { Metadata } from "next";
import Hero from "@/components/Hero";
import DiscoveryFeed from "@/components/discovery/DiscoveryFeed";
import { VALID_REGIONS } from "@/lib/geo";

export const metadata: Metadata = {
  title: "Find Your Next Great Watch",
  description: "Find films and series by mood, region, release date, and rating. Explore personal recommendations, curated collections, trailers, and cast details.",
  alternates: { canonical: "/" },
};
export default function Home() {
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  const countries = [...VALID_REGIONS].map(code => ({ code, name: names.of(code) ?? code })).sort((a, b) => a.name.localeCompare(b.name));
  return <><Hero /><DiscoveryFeed countries={countries} scenic={<Suspense key="scenic-collections" fallback={<ScenicSkeleton />}><ScenicRoute /></Suspense>} /></>;
}
