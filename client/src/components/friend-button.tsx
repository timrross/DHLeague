import { UserPlus, UserCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useFriendStatusQuery,
  useSendFriendRequestMutation,
  useRemoveFriendMutation,
  useFriendsQuery,
} from "@/services/friendsApi";
import { trackEvent } from "@/lib/analytics";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FriendButtonProps {
  userId: string;
  userName?: string;
}

export function FriendButton({ userId, userName }: FriendButtonProps) {
  const { data: statusData, isLoading: statusLoading } = useFriendStatusQuery(userId);
  const { data: friends } = useFriendsQuery();
  const sendRequest = useSendFriendRequestMutation();
  const removeFriend = useRemoveFriendMutation();

  const status = statusData?.status ?? "none";
  const isLoading = statusLoading || sendRequest.isPending || removeFriend.isPending;

  // Find the friend record if they're friends (to get the friendId for removal)
  const friendRecord = friends?.find(
    (f) => f.user.id === userId
  );

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (status === "none") {
      trackEvent("friend_request_sent", { source: "leaderboard" });
      sendRequest.mutate(userId);
    } else if (status === "accepted" && friendRecord) {
      trackEvent("friend_removed", { source: "leaderboard" });
      removeFriend.mutate(friendRecord.id);
    }
    // For pending states, clicking does nothing
  };

  const getTooltipText = () => {
    const name = userName || "this user";
    switch (status) {
      case "none":
        return `Add ${name} as friend`;
      case "pending_sent":
        return "Friend request pending";
      case "pending_received":
        return "Accept request in Friends tab";
      case "accepted":
        return `Remove ${name} as friend`;
      default:
        return "";
    }
  };

  const getIcon = () => {
    switch (status) {
      case "none":
        return <UserPlus className="h-4 w-4" />;
      case "pending_sent":
      case "pending_received":
        return <Clock className="h-4 w-4" />;
      case "accepted":
        return <UserCheck className="h-4 w-4" />;
      default:
        return <UserPlus className="h-4 w-4" />;
    }
  };

  const getVariant = () => {
    switch (status) {
      case "accepted":
        return "secondary";
      case "pending_sent":
      case "pending_received":
        return "outline";
      default:
        return "ghost";
    }
  };

  const isClickable = status === "none" || status === "accepted";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={getVariant()}
            size="icon"
            className="h-8 w-8"
            onClick={handleClick}
            disabled={isLoading || !isClickable}
            aria-label={getTooltipText()}
          >
            {isLoading ? (
              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              getIcon()
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipText()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
