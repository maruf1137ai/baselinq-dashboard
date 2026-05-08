/**
 * Werner spec rev H — RFI detail page.
 *
 * Thin wrapper around the shared EntityDetailV2 — see that file for
 * the full implementation. Each task type gets its own page so the
 * router can mount the right URL, but all the layout logic lives in
 * the shared component to prevent drift.
 */
import EntityDetailV2 from "./EntityDetailV2";

export default function RFIDetailV2() {
  return <EntityDetailV2 entityType="rfi" />;
}
