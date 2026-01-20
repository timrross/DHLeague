import { useMemo } from "react";
import { Rider } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getColorFromName, getInitials, safeImageUrl } from "@/lib/utils";
import { formatRiderDisplayName } from "@shared/utils";

type RiderAvatarProps = {
  rider: Rider;
  size?: "sm" | "md" | "lg";
  className?: string;
  highlight?: boolean;
  showFlagBadge?: boolean;
};

const sizeMap: Record<NonNullable<RiderAvatarProps["size"]>, string> = {
  sm: "w-10 h-10",
  md: "w-12 h-12",
  lg: "w-16 h-16",
};

export function RiderAvatar({
  rider,
  size = "md",
  className,
  highlight = false,
}: RiderAvatarProps) {
  const displayName = useMemo(
    () => formatRiderDisplayName(rider) || rider.name || rider.riderId || "Rider",
    [rider],
  );

  const initials = getInitials(displayName);
  const placeholderUrl = rider.uciId
    ? `/api/riders/${encodeURIComponent(rider.uciId)}/placeholder.svg`
    : undefined;
  const currentImage = safeImageUrl(rider.image);
  const shouldUsePlaceholder =
    rider.imageSource === "placeholder" || rider.imageSource === null || !currentImage;
  const imageSrc = shouldUsePlaceholder ? placeholderUrl : currentImage;
  const usingPlaceholder = shouldUsePlaceholder && Boolean(placeholderUrl);
  const fallbackColor = getColorFromName(displayName);

  return (
    <div className={cn("relative inline-block", className)}>
      <Avatar
        className={cn(
          "rounded-md",
          sizeMap[size],
          highlight ? "ring-2 ring-primary" : "",
          usingPlaceholder ? "" : "bg-slate-800 text-white",
        )}
      >
        {imageSrc ? (
          <AvatarImage src={imageSrc} alt={displayName} className="object-cover" />
        ) : null}
        {!usingPlaceholder ? (
          <AvatarFallback className={cn("text-white font-bold", fallbackColor)}>
            {initials || "?"}
          </AvatarFallback>
        ) : null}
      </Avatar>
    </div>
  );
}
