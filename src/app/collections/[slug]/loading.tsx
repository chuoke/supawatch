export default function Loading() {
  return <div className="collection-detail" role="status" aria-label="Opening the collection"><header className="collection-shelf-hero" aria-hidden="true"><div className="collection-shelf-copy flex flex-col gap-4"><div className="h-4 w-28 bg-muted" /><div className="h-14 w-3/4 bg-muted" /><div className="h-4 w-full bg-muted" /><div className="h-4 w-2/3 bg-muted" /></div><ul className="collection-shelf">{Array.from({ length: 12 }, (_, i) => <li key={i} className="bg-muted" />)}</ul></header><span className="sr-only">Opening the collection…</span></div>;
}
