import { useEffect, useState } from "react";
import { HeroSpill } from "../components/HeroSpill";

/** Dispatched when the brand is clicked while already on `/`. */
export const RESET_LANDING_EVENT = "feling:reset-landing";

export function HomePage() {
  const [storyKey, setStoryKey] = useState(0);

  useEffect(() => {
    const onReset = () => {
      document.documentElement.classList.remove("shop-expanded");
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      // Remount after scroll so the story reads top-of-page progress
      requestAnimationFrame(() => {
        setStoryKey((k) => k + 1);
      });
    };

    window.addEventListener(RESET_LANDING_EVENT, onReset);
    return () => window.removeEventListener(RESET_LANDING_EVENT, onReset);
  }, []);

  return <HeroSpill key={storyKey} />;
}
