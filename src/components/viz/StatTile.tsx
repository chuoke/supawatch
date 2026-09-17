import { cn } from "@/lib/utils";

/* One headline figure. A hairline above and nothing else — no box, no
   border, no rounded card. The number does the work. */

type Props = {
  label: string;
  value: string;
  sub?: string;
  peak?: boolean;
  className?: string;
};

export default function StatTile({ label, value, sub, peak, className }: Props) {
  return (
    <div className={cn("border-t border-white/[0.08] pt-3", className)}>
      <p className="font-space text-[10px] uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 font-space text-[30px] font-bold leading-none tabular-nums md:text-[38px]",
          peak ? "text-neutral-300" : "text-white",
        )}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-1.5 font-space text-[11px] tabular-nums text-neutral-500">{sub}</p>
      )}
    </div>
  );
}
