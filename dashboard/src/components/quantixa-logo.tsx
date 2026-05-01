import { cn } from "@/lib/utils";

/**
 * Quantixa AI logo. The mark is a custom "Q" formed by a stylized
 * orbital ring + AI dot — evokes "quantum" + voice signal. Uses the
 * brand amber gradient on dark bg. Pair with the wordmark for full
 * lockup; mark-only for tight spaces (favicon, mobile nav).
 */

export function QuantixaMark({
  size = 36,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Quantixa AI"
    >
      <defs>
        <linearGradient
          id="qx-bg"
          x1="0"
          y1="0"
          x2="40"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="60%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
        <radialGradient
          id="qx-glow"
          cx="50%"
          cy="50%"
          r="50%"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#000" stopOpacity="0.0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.18" />
        </radialGradient>
      </defs>

      {/* Rounded square base with brand gradient */}
      <rect width="40" height="40" rx="10" fill="url(#qx-bg)" />
      <rect width="40" height="40" rx="10" fill="url(#qx-glow)" />

      {/* Orbital "Q" — 3/4 circle with a diagonal cut */}
      <circle
        cx="20"
        cy="20"
        r="9"
        stroke="#0a0a0a"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="42 14"
        transform="rotate(-30 20 20)"
      />
      {/* AI signal dot at the orbit's tail */}
      <circle cx="27.5" cy="26" r="2.4" fill="#0a0a0a" />
      {/* Small accent dot opposite (suggests waveform / pulse) */}
      <circle cx="13.5" cy="14" r="1.2" fill="#0a0a0a" opacity="0.6" />
    </svg>
  );
}

export function QuantixaWordmark({
  className,
}: {
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-heading text-xl font-bold italic tracking-tight",
        className,
      )}
    >
      Quantixa<span className="text-amber-400">AI</span>
    </span>
  );
}

/** Full lockup: mark + wordmark, sized for headers and the sidebar. */
export function QuantixaLogo({
  size = 36,
  className,
  showWordmark = true,
  wordmarkClassName,
}: {
  size?: number;
  className?: string;
  showWordmark?: boolean;
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <QuantixaMark size={size} />
      {showWordmark && <QuantixaWordmark className={wordmarkClassName} />}
    </span>
  );
}
