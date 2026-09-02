/**
 * Project — the "project" permission group in the Roles & Permissions rail.
 *
 * The sidebar has no Project nav item to borrow from, and the nearest ones
 * (Compliance, Project Health) both use Shield, which would put the same glyph
 * twice in one nine-item list. Drawn to this folder's conventions: 18x18,
 * stroke="currentColor", strokeWidth 1.125, round caps — so it inherits colour
 * and size from className like Task and SaveMoney do.
 */
const Project = ({ className = "" }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.25 15.75H15.75" stroke="currentColor" strokeWidth="1.125" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M4.5 15.75V7.125L9 3.75L13.5 7.125V15.75" stroke="currentColor" strokeWidth="1.125" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7.5 15.75V11.25H10.5V15.75" stroke="currentColor" strokeWidth="1.125" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default Project;
