export function Logo({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="5" y="6" width="22" height="5" rx="2.5" fill="currentColor" />
      <rect x="8" y="13.5" width="19" height="5" rx="2.5" fill="currentColor" opacity=".7" />
      <rect x="5" y="21" width="16" height="5" rx="2.5" fill="currentColor" opacity=".45" />
    </svg>
  );
}
