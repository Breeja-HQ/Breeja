interface BreejaLogoProps {
  className?: string;
}

export default function BreejaLogo({ className }: BreejaLogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="8" cy="23" r="7" fill="var(--color-accent)" />
      <circle cx="24" cy="9" r="7" fill="var(--color-accent)" opacity="0.4" />
      <path
        d="M11.5 18.5C15.5 12.5 17.5 10.5 20.5 8.5"
        stroke="var(--color-accent)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M17 7.6L21 8.9L19.6 12.8"
        stroke="var(--color-accent)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
