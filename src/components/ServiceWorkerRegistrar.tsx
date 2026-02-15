"use client";

import { useEffect } from "react";
import { isPrerender } from "@/lib/prerender";
import { env } from "@/lib/env";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (isPrerender()) {
      (window as any).IS_PRERENDERING = true;
    }

    if (!("serviceWorker" in navigator) || !env.PROD || (window as any).IS_PRERENDERING) {
      return;
    }

    const onLoad = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        let updateInterval: ReturnType<typeof setInterval> | null = null;

        const startUpdateChecks = () => {
          if (updateInterval) return;
          updateInterval = setInterval(() => registration.update(), 5 * 60 * 1000);
        };

        const stopUpdateChecks = () => {
          if (!updateInterval) return;
          clearInterval(updateInterval);
          updateInterval = null;
        };

        const onVisibilityChange = () => {
          if (document.visibilityState === "visible") {
            startUpdateChecks();
            registration.update();
          } else {
            stopUpdateChecks();
          }
        };

        document.addEventListener("visibilitychange", onVisibilityChange);
        if (document.visibilityState === "visible") {
          startUpdateChecks();
        }

        return () => {
          document.removeEventListener("visibilitychange", onVisibilityChange);
          stopUpdateChecks();
        };
      } catch {
        return undefined;
      }
    };

    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
