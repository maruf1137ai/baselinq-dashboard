/**
 * Audit — the "audit" permission group in the Roles & Permissions rail.
 *
 * A record being inspected: the log on the left, a lens over it. Same drawing
 * conventions as the rest of this folder: 18x18, stroke="currentColor",
 * strokeWidth 1.125, round caps.
 */
const Audit = ({ className = "" }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.625 4.125H12.375M2.625 7.875H8.625M2.625 11.625H6.375" stroke="currentColor" strokeWidth="1.125" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="11.625" cy="11.625" r="2.625" stroke="currentColor" strokeWidth="1.125" />
    <path d="M13.6875 13.6875L15.75 15.75" stroke="currentColor" strokeWidth="1.125" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export default Audit;
