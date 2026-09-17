"use client";

import { useState } from "react";
import { Bookmark, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { titleKey, type DiscoveryTitle } from "@/lib/discovery";
import { toggleSaved, useWatchlist } from "@/lib/watchlist";

export default function SaveTitleButton({ item, compact = false, remove = false }: { item: DiscoveryTitle; compact?: boolean; remove?: boolean }) {
  const list = useWatchlist();
  const saved = list.some(entry => titleKey(entry) === titleKey(item));
  const [error, setError] = useState(false);
  const Icon = remove && saved ? X : Bookmark;
  return (
    <span className="save-control">
      <Button
        variant={remove ? "ghost" : "outline"}
        size={compact ? "icon" : "lg"}
        className="min-h-11 min-w-11"
        aria-label={`${saved ? "Remove" : "Save"} ${item.title}${saved ? " from" : " to"} My List`}
        aria-pressed={saved}
        onClick={() => setError(!toggleSaved(item))}
      >
        <Icon data-icon="inline-start" fill={saved && !remove ? "currentColor" : "none"} />
        {!compact && (remove && saved ? "Remove from list" : saved ? "In My List" : "My List")}
      </Button>
      {error && <span className="save-error" role="status">Your browser couldn’t save this. Allow site storage and try again.</span>}
    </span>
  );
}
