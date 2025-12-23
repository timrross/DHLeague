import { useMemo, useState } from "react";
import { Rider } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, getColorFromName, getInitials, safeImageUrl } from "@/lib/utils";
import { formatRiderDisplayName } from "@shared/utils";

type RiderAvatarProps = {
  rider: Rider;
  size?: "sm" | "md" | "lg";
  className?: string;
  highlight?: boolean;
};

const sizeMap: Record<NonNullable<RiderAvatarProps["size"]>, string> = {
  sm: "w-10 h-10",
  md: "w-12 h-12",
  lg: "w-16 h-16",
};

export function RiderAvatar({ rider, size = "md", className, highlight = false }: RiderAvatarProps) {
  const [flagError, setFlagError] = useState(false);
  const displayName = useMemo(
    () => formatRiderDisplayName(rider) || rider.name || rider.riderId || "Rider",
    [rider],
  );

  const initials = getInitials(displayName);
  const flagCode = rider.country?.toLowerCase();
  const flagSrc = flagCode ? `/assets/flags/${flagCode}.svg` : undefined;
  const flagLabel = rider.country?.toUpperCase() || "?";
  const placeholderUrl = rider.uciId
    ? `/api/riders/${encodeURIComponent(rider.uciId)}/placeholder.svg`
    : undefined;
  const currentImage = safeImageUrl(rider.image);
  const shouldUsePlaceholder =
    rider.imageSource === "placeholder" || rider.imageSource === null || !currentImage;
  const imageSrc = shouldUsePlaceholder ? placeholderUrl : currentImage;
  const fallbackColor = getColorFromName(displayName);

  return (
    <div className={cn("relative inline-block", className)}>
      <Avatar
        className={cn(
          "rounded-md bg-slate-800 text-white",
          sizeMap[size],
          highlight ? "ring-2 ring-primary" : "",
        )}
      >
        {imageSrc ? (
          <AvatarImage src={imageSrc} alt={displayName} className="object-cover" />
        ) : null}
        <AvatarFallback className={cn("text-white font-bold", fallbackColor)}>
          {initials || "?"}
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          "absolute flex items-center justify-center rounded-full border border-white bg-slate-900 text-[10px] font-bold text-white",
          size === "lg"
            ? "w-7 h-7 -bottom-1.5 -right-1.5"
            : size === "sm"
              ? "w-5 h-5 -bottom-1 -right-1"
              : "w-6 h-6 -bottom-1.5 -right-1.5",
        )}
      >
        {flagSrc && !flagError ? (
          <img
            src={flagSrc}
            alt={`${flagLabel} flag`}
            className="w-full h-full object-cover rounded-full"
            onError={() => setFlagError(true)}
          />
        ) : (
          <span>{flagLabel}</span>
        )}
      </div>
    </div>
  );
}
