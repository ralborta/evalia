"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/** Al volver a la pestaña, pide datos frescos del servidor (p. ej. tras finalizar una entrevista pública). */
export function RefreshOnFocus() {
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => router.refresh(), 250);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [router]);

  return null;
}
