import { useEffect } from "react";
import { buildDocumentTitle } from "@shared/analytics";

export const usePageTitle = (prefix?: string | null) => {
  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.title = buildDocumentTitle(prefix ?? undefined);
  }, [prefix]);
};
