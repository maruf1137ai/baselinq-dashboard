import React from 'react';

const Trending = ({ className = "" }) => {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M15.75 15.75H7.5C5.02513 15.75 3.78769 15.75 3.01885 14.9812C2.25 14.2123 2.25 12.9748 2.25 10.5V2.25"
        stroke="currentColor"
        stroke-width="1.125"
        stroke-linecap="round"
      />
      <path d="M5.25 3H6" stroke="currentColor" stroke-width="1.125" stroke-linecap="round" />
      <path d="M5.25 5.25H8.25" stroke="currentColor" stroke-width="1.125" stroke-linecap="round" />
      <path
        d="M3.75 15C4.5532 13.5397 5.64209 9.76417 7.72973 9.76417C9.17258 9.76417 9.54622 11.6038 10.9602 11.6038C13.3929 11.6038 13.0403 7.5 15.75 7.5"
        stroke="currentColor"
        stroke-width="1.125"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
};

export default Trending;
