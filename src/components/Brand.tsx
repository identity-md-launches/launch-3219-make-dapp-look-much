export function Brand({ small = false }: { small?: boolean }) {
  return (
    <a
      href="#wallet"
      className={`brand ${small ? "brand-small" : ""}`}
      aria-label="Tacit home"
    >
      <svg
        width="34"
        height="34"
        viewBox="0 0 36 36"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M10 12h17M21 5l-7 23c-1 3 1 4 5 2"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M30 8a15 15 0 1 1-15-4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <span>
        tacit<span className="brand-dot">.</span>
      </span>
    </a>
  );
}
