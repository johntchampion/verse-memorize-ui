/** The app icon's blank-and-baseline mark, filling its box edge to edge like the favicon. */
export default function AppIcon({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" aria-hidden="true">
      <path d="M224,0 H800 A224,224 0 0 1 1024,224 V800 H0 V224 A224,224 0 0 1 224,0 Z" fill="#F9C9BC" />
      <rect x="0" y="800" width="1024" height="224" fill="#C6462F" />
    </svg>
  );
}
