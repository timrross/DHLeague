import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  usePendingRequestsQuery,
  useAcceptFriendRequestMutation,
  useRejectFriendRequestMutation,
} from "@/services/friendsApi";
import { trackEvent } from "@/lib/analytics";

export function PendingFriendRequests() {
  const { data: pendingRequests, isLoading } = usePendingRequestsQuery();
  const acceptRequest = useAcceptFriendRequestMutation();
  const rejectRequest = useRejectFriendRequestMutation();

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!pendingRequests || pendingRequests.length === 0) {
    return null;
  }

  const getInitials = (name: string | null): string => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  return (
    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 className="font-heading font-bold text-gray-700 mb-3">
        PENDING FRIEND REQUESTS ({pendingRequests.length})
      </h3>
      <div className="space-y-2">
        {pendingRequests.map((request) => (
          <div
            key={request.id}
            className="flex items-center justify-between bg-white p-3 rounded-md shadow-sm"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-white text-xs">
                  {getInitials(request.user.displayName)}
                </AvatarFallback>
              </Avatar>
              <span className="text-gray-700 font-medium">
                {request.user.displayName || "Anonymous"}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  trackEvent("friend_request_accepted", { source: "friends_panel" });
                  acceptRequest.mutate(request.id);
                }}
                disabled={acceptRequest.isPending || rejectRequest.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-1" />
                Accept
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  trackEvent("friend_request_rejected", { source: "friends_panel" });
                  rejectRequest.mutate(request.id);
                }}
                disabled={acceptRequest.isPending || rejectRequest.isPending}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
