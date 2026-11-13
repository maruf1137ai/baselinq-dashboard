/**
 * The two-person rule on a Variation Order (QA BUG-08).
 *
 * Whoever recommended a VO for the Client's sign-off cannot also approve and
 * sign it. The server refuses that (`recommender_cannot_approve`,
 * tasks/views_signing.py); this lets the page say so instead of offering a
 * button that will be refused. A VO approved within mandate is never
 * recommended, so it is unaffected.
 *
 * Kept out of the page because it decides what a user is offered.
 */

export interface VoRecommendation {
  status?: string | null;
  recommendedBy?: { userId?: string | number | null; name?: string | null } | null;
}

/** True when `userId` recommended this VO and it is still waiting on approval. */
export function isVoRecommender(
  vo: VoRecommendation | null | undefined,
  userId: string | number | null | undefined,
): boolean {
  if (!vo || vo.status !== "Recommended") return false;
  const recommender = vo.recommendedBy?.userId;
  if (recommender === null || recommender === undefined || recommender === "") return false;
  if (userId === null || userId === undefined || userId === "") return false;
  return String(recommender) === String(userId);
}

/** Who recommended the VO, for the approval dialog — null when nobody has. */
export function voRecommendedByName(vo: VoRecommendation | null | undefined): string | null {
  const name = vo?.recommendedBy?.name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}
