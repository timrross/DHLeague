import { Rider } from "@shared/schema";
import { formatRiderDisplayName } from "@shared/utils";
import { FaMars, FaVenus } from "react-icons/fa";
import { RiderAvatar } from "@/components/rider-avatar";
import { getFlagCode } from "@/lib/flags";
import { cn } from "@/lib/utils";

type RiderIdentityProps = {
  rider: Rider;
  avatarSize?: "sm" | "md" | "lg";
  showAvatar?: boolean;
  showTeam?: boolean;
  avatarHighlight?: boolean;
  className?: string;
  nameClassName?: string;
  metaClassName?: string;
};

export default function RiderIdentity({
  rider,
  avatarSize = "sm",
  showAvatar = true,
  showTeam = true,
  avatarHighlight = false,
  className,
  nameClassName,
  metaClassName,
}: RiderIdentityProps) {
  const displayName = formatRiderDisplayName(rider) || rider.name;
  const flagCode = getFlagCode(rider.country);
  const countryLabel = rider.country?.trim();
  const isMale = rider.gender === "male";
  const GenderIcon = isMale ? FaMars : FaVenus;

  return (
    <div className={cn("flex items-center gap-3 min-w-0", className)}>
      {showAvatar && (
        <RiderAvatar
          rider={rider}
          size={avatarSize}
          highlight={avatarHighlight}
          showFlagBadge={false}
          className="flex-shrink-0"
        />
      )}
      <div className="min-w-0">
        <p
          className={cn(
            "truncate font-heading text-sm font-bold text-secondary",
            nameClassName,
          )}
        >
          {displayName}
        </p>
        <div
          className={cn(
            "mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500",
            metaClassName,
          )}
        >
          {flagCode ? (
            <span
              role="img"
              aria-label={`${countryLabel ?? ""} flag`}
              className={cn("fi", `fi-${flagCode}`, "h-4 w-4 rounded-full")}
              style={{ backgroundSize: "cover", backgroundPosition: "center" }}
            />
          ) : countryLabel ? (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              {countryLabel}
            </span>
          ) : null}
          <span
            className={cn(
              "flex items-center gap-1",
              isMale ? "text-blue-600" : "text-pink-600",
            )}
          >
            <GenderIcon className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">{isMale ? "Male" : "Female"}</span>
          </span>
          {showTeam && (
            <span className="truncate">{rider.team}</span>
          )}
        </div>
      </div>
    </div>
  );
}
