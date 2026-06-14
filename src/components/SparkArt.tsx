/**
 * SparkArt — each Spark's identity tile: a WHITE monochrome line glyph on a
 * SOLID accent-colored squircle (no translucency, no outline). The accent is
 * deterministic per ENS name; the glyph is picked by label/category. Shared by
 * Home, Sparks, Activity, Profile, Create, and the runtime.
 */
import { appAccent } from "@/lib/appStyle";
import { ICON_PATHS, iconNameFor } from "@/lib/icons";

export function SparkArt({
  ens,
  category,
  size = 60,
  className = "",
  imageBlobId,
}: {
  ens: string;
  category?: string;
  size?: number;
  className?: string;
  /** When set, show the Walrus photo instead of the generated glyph tile. */
  imageBlobId?: string;
}) {
  if (imageBlobId) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/blob/${imageBlobId}`}
        alt={ens}
        className={`shrink-0 object-cover ${className}`}
        style={{ width: size, height: size, borderRadius: Math.round(size * 0.3) }}
      />
    );
  }
  const accent = appAccent(ens);
  const paths = ICON_PATHS[iconNameFor(ens, category)] ?? ICON_PATHS.spark;
  const inner = Math.round(size * 0.52);
  return (
    <div
      className={`flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), background: accent }}
    >
      <svg
        width={inner}
        height={inner}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ffffff"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
    </div>
  );
}
