import { useEffect, useState } from "react";

/**
 * The currently selected project id, kept in step with the rest of the app.
 *
 * `selectedProjectId` is read from localStorage in ~60 files, but only five of
 * them subscribe to the `project-change` event the sidebar and project picker
 * dispatch. The ones that don't keep showing the previous project's data until
 * something else forces a re-render. This is that subscription, in one place.
 */
export function useSelectedProjectId(): string | undefined {
  const [projectId, setProjectId] = useState<string | undefined>(
    () => localStorage.getItem("selectedProjectId") || undefined,
  );

  useEffect(() => {
    const handleProjectChange = () => {
      setProjectId(localStorage.getItem("selectedProjectId") || undefined);
    };
    window.addEventListener("project-change", handleProjectChange);
    return () => window.removeEventListener("project-change", handleProjectChange);
  }, []);

  return projectId;
}

export default useSelectedProjectId;
