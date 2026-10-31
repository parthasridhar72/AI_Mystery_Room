import React from "react";

const iconPaths = {
  sparkle: (
    <path d="M12 3.5 14.4 9.6 20.5 12 14.4 14.4 12 20.5 9.6 14.4 3.5 12 9.6 9.6 12 3.5Z" />
  ),
  arrow: <path d="M7 17 17 7M8 7h9v9" />,
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.3" />
      <path d="m16 16 4.2 4.2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3.2 2" />
    </>
  ),
  check: <path d="m5 12.5 4.2 4.2L19 7" />,
  back: <path d="m14.5 5-7 7 7 7M8 12h12" />,
};

export default function Icon({ name, size = 16, className = "" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
      width={size}
    >
      {iconPaths[name]}
    </svg>
  );
}
