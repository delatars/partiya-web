import type { OfferBadge } from "@partiya/api-contracts";
import { Tag } from "@partiya/ui";

/* Бейджи оффера: «Хит», «−15 % мощность», «аудит» — макет .card .bd */
const BADGES: Record<OfferBadge, { tone: "hot" | "disc" | "ok"; label: string }> = {
  hit: { tone: "hot", label: "Хит" },
  underload: { tone: "disc", label: "−15 % мощность" },
  audit: { tone: "ok", label: "аудит" },
};

export function OfferBadges({
  badges,
  className,
}: {
  badges: readonly OfferBadge[];
  className?: string;
}) {
  if (badges.length === 0) return null;
  return (
    <div className={className}>
      {badges.map((badge) => (
        <Tag key={badge} tone={BADGES[badge].tone}>
          {BADGES[badge].label}
        </Tag>
      ))}
    </div>
  );
}
