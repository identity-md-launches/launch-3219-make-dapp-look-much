import {
  ArrowUpRight,
  Check,
  Fingerprint,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

export function PrivacyPanel({ onLearn }: { onLearn: () => void }) {
  return (
    <aside className="privacy-panel" aria-label="About your privacy">
      <div className="privacy-art" aria-hidden="true">
        <svg viewBox="0 0 360 248" fill="none">
          <defs>
            <pattern
              id="dots"
              width="16"
              height="16"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r=".7" fill="#6f746c" opacity=".35" />
            </pattern>
            <linearGradient
              id="veil"
              x1="180"
              y1="30"
              x2="180"
              y2="230"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#3d443b" />
              <stop offset="1" stopColor="#252a25" />
            </linearGradient>
          </defs>
          <rect width="360" height="248" fill="url(#dots)" />
          <ellipse
            cx="180"
            cy="126"
            rx="130"
            ry="61"
            stroke="#4c5549"
            strokeDasharray="3 5"
            transform="rotate(-30 180 126)"
          />
          <ellipse
            cx="180"
            cy="126"
            rx="130"
            ry="61"
            stroke="#4c5549"
            strokeDasharray="3 5"
            transform="rotate(30 180 126)"
          />
          <circle cx="180" cy="126" r="83" stroke="#495044" />
          <circle cx="180" cy="126" r="64" stroke="#485041" />
          <path
            d="M180 64l47 20v42c0 34-29 55-47 63-18-8-47-29-47-63V84l47-20Z"
            fill="url(#veil)"
            stroke="#a0b191"
            strokeWidth="1.3"
          />
          <path
            d="M165 123v-11a15 15 0 0 1 30 0v11"
            stroke="#d4ddc6"
            strokeWidth="2"
          />
          <rect
            x="159"
            y="123"
            width="42"
            height="33"
            rx="5"
            stroke="#d4ddc6"
            strokeWidth="2"
          />
          <path
            d="M180 136v7"
            stroke="#d4ddc6"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="65" cy="94" r="6" fill="#dc7b48" />
          <circle cx="295" cy="157" r="6" fill="#d4ddc6" />
          <circle cx="237" cy="59" r="3" fill="#6e7b61" />
          <circle cx="124" cy="192" r="3" fill="#6e7b61" />
          <path d="M28 33h12M34 27v12M319 215h12M325 209v12" stroke="#77816e" />
        </svg>
        <span className="art-note">
          <LockKeyhole size={12} /> Visible only to you
        </span>
      </div>
      <div className="privacy-content">
        <h2>
          A little less public.
          <br />
          <em>A lot more yours.</em>
        </h2>
        <p>
          Move beyond a public balance. Keep your payments between you and the
          people you pay.
        </p>
        <ul className="privacy-points">
          <li>
            <Fingerprint size={17} /> Your keys stay on your device
          </li>
          <li>
            <ShieldCheck size={17} /> Proofs, not permission
          </li>
          <li>
            <Check size={17} /> No account to create
          </li>
        </ul>
        <button className="privacy-learn" onClick={onLearn}>
          Understand your privacy <ArrowUpRight size={16} />
        </button>
      </div>
    </aside>
  );
}
