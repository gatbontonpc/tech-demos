export function Wordmark() {
  return (
    <svg className="wordmark" viewBox="0 0 148 28" role="img" aria-label="Waypoint">
      <g transform="translate(2,2)">
        <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="2" />
        <path
          d="M5 16 L10 9 L14 13 L19 6"
          fill="none"
          stroke="#B5541C"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="19" cy="6" r="2.4" fill="#B5541C" />
      </g>
      <text x="34" y="20" fontFamily="Georgia, 'Liberation Serif', serif" fontSize="18" fontWeight="600" fill="currentColor">
        Waypoint
      </text>
    </svg>
  );
}
