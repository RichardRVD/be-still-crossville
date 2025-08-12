import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export default function ScrollManager() {
  const { pathname, hash } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }

    if (navType === "POP") return;

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, hash, navType]);

  return null;
}