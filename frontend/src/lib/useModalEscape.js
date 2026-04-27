import { useEffect } from "react";

export function useModalEscape(onClose) {
  useEffect(() => {
    function handler(e) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
}
