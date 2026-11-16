import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "../lib/api";

/** Loads the whole fleet once. status: "loading" | "ready" | "error". */
export function useVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  const load = useCallback(async (signal) => {
    setStatus("loading");
    try {
      const { data } = await api.get("/api/vehicles", { signal });
      setVehicles(Array.isArray(data) ? data : []);
      setStatus("ready");
    } catch (err) {
      if (signal?.aborted) return;
      setError(errorMessage(err, "We couldn't load vehicles."));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return { vehicles, setVehicles, status, error, reload: () => load() };
}
