"use client";

import { useEffect, useState } from "react";

// Browser-side access to the data API through the /api rewrite.
export const api = <T,>(path: string): Promise<T> => fetch(`/api/${path}`).then((r) => r.json() as Promise<T>);

// Fetches `path` whenever it changes; `data` keeps the previous value while the next one loads.
export function useApi<T>(path: string | null): { data: T | undefined; loading: boolean } {
  const [state, setState] = useState<{ path: string | null; data: T | undefined }>({ path: null, data: undefined });
  useEffect(() => {
    if (!path) return;
    let live = true;
    api<T>(path).then((data) => { if (live) setState({ path, data }); });
    return () => { live = false; };
  }, [path]);
  return { data: state.data, loading: path !== null && state.path !== path };
}
