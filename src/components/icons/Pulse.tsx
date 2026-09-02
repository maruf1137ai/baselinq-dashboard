import React from 'react';

/**
 * Project Health.
 *
 * Compliance and Project Health both rendered `<Shield />` in the sidebar, so
 * two adjacent nav rows were visually identical and could only be told apart
 * by reading their labels. They are different questions — Compliance is
 * "which obligations am I bound to", Project Health is "what is going wrong
 * right now" — and the nav should say so at a glance.
 *
 * A pulse line rather than a warning triangle: this page is a diagnosis, not
 * an alarm, and it is titled Health. A permanent caution glyph in the nav
 * would read as an alert that never clears.
 *
 * Same contract as `Shield` — 18px, `currentColor`, and it takes `className`
 * — because `DashboardSidebar` clones every nav icon with a colour class and
 * an icon that hard-codes its stroke cannot show the active state.
 */
const Pulse = ({ className = "" }) => {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M1.5 9H4.5L6.375 4.125L9.375 13.875L11.25 9H16.5"
        stroke="currentColor"
        strokeWidth="1.125"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default Pulse;
