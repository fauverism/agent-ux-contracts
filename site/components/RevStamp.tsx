/*
 * The signature delight, executed with restraint: a version stamp angled
 * 1–2 degrees off-square, like a real rubber stamp. The angle is a
 * deterministic hash of the pattern id — stable across builds, different
 * across patterns — so the index reads like a hand-stamped ledger.
 * Server-rendered, zero JS, nothing animates.
 */

const ANGLES = [-2, -1.4, -0.8, 0.8, 1.4, 2] as const;

function angleFor(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return ANGLES[Math.abs(hash) % ANGLES.length];
}

export function RevStamp({
  id,
  version,
  size,
}: {
  id: string;
  version: string;
  size?: 'lg';
}) {
  return (
    <span
      className="rev-stamp"
      data-size={size}
      style={{ ['--stamp-angle' as string]: `${angleFor(id)}deg` }}
      aria-label={`revision ${version}`}
    >
      rev. {version}
    </span>
  );
}
