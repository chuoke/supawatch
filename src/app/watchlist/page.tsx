import type { Metadata } from "next";
import Watchlist from "./Watchlist";
export const metadata: Metadata = { title: "My List", description: "Your next great watches, saved in one place.", robots: { index: false, follow: true } };
export default function WatchlistPage() { return <Watchlist />; }
