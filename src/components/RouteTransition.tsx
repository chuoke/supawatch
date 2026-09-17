"use client";

import { ViewTransition, type ReactNode } from "react";
import { usePathname } from "next/navigation";

export default function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <ViewTransition
      key={pathname}
      name="page-content"
      default="none"
      share={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "auto" }}
      enter="fade-in"
      exit="fade-out"
    >
      <div className="route-content">{children}</div>
    </ViewTransition>
  );
}
