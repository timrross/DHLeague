import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { FriendWithUser, Friend } from "@shared/schema";

type QueryOptions<T> = Omit<UseQueryOptions<T>, "queryKey" | "queryFn">;

export type FriendStatus = "none" | "pending_sent" | "pending_received" | "accepted";

const friendsEndpoints = {
  friends: "/api/friends",
  pending: "/api/friends/pending",
  pendingCount: "/api/friends/pending/count",
  status: (userId: string) => `/api/friends/status/${userId}`,
  request: (userId: string) => `/api/friends/request/${userId}`,
  accept: (requestId: number) => `/api/friends/accept/${requestId}`,
  reject: (requestId: number) => `/api/friends/reject/${requestId}`,
  remove: (friendId: number) => `/api/friends/${friendId}`,
};

// Query functions
export function getFriends() {
  return apiRequest<FriendWithUser[]>(friendsEndpoints.friends);
}

export function getPendingRequests() {
  return apiRequest<FriendWithUser[]>(friendsEndpoints.pending);
}

export function getPendingCount() {
  return apiRequest<{ count: number }>(friendsEndpoints.pendingCount);
}

export function getFriendStatus(userId: string) {
  return apiRequest<{ status: FriendStatus }>(friendsEndpoints.status(userId));
}

// Query hooks
export function useFriendsQuery(options?: QueryOptions<FriendWithUser[]>) {
  return useQuery<FriendWithUser[]>({
    queryKey: [friendsEndpoints.friends],
    queryFn: getFriends,
    ...options,
  });
}

export function usePendingRequestsQuery(options?: QueryOptions<FriendWithUser[]>) {
  return useQuery<FriendWithUser[]>({
    queryKey: [friendsEndpoints.pending],
    queryFn: getPendingRequests,
    ...options,
  });
}

export function usePendingCountQuery(options?: QueryOptions<{ count: number }>) {
  return useQuery<{ count: number }>({
    queryKey: [friendsEndpoints.pendingCount],
    queryFn: getPendingCount,
    ...options,
  });
}

export function useFriendStatusQuery(
  userId: string | undefined,
  options?: QueryOptions<{ status: FriendStatus }>
) {
  return useQuery<{ status: FriendStatus }>({
    queryKey: [friendsEndpoints.status(userId ?? ""), userId],
    queryFn: () => getFriendStatus(userId!),
    enabled: !!userId,
    ...options,
  });
}

// Mutation hooks
export function useSendFriendRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      apiRequest<Friend>(friendsEndpoints.request(userId), { method: "POST" }),
    onSuccess: (_data, userId) => {
      // Invalidate the status for this specific user
      queryClient.invalidateQueries({ queryKey: [friendsEndpoints.status(userId)] });
      // Also invalidate friends list in case UI shows it
      queryClient.invalidateQueries({ queryKey: [friendsEndpoints.friends] });
    },
  });
}

export function useAcceptFriendRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: number) =>
      apiRequest<Friend>(friendsEndpoints.accept(requestId), { method: "POST" }),
    onSuccess: () => {
      // Invalidate all friend-related queries
      queryClient.invalidateQueries({ queryKey: [friendsEndpoints.friends] });
      queryClient.invalidateQueries({ queryKey: [friendsEndpoints.pending] });
      queryClient.invalidateQueries({ queryKey: [friendsEndpoints.pendingCount] });
    },
  });
}

export function useRejectFriendRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: number) =>
      apiRequest<void>(friendsEndpoints.reject(requestId), { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [friendsEndpoints.pending] });
      queryClient.invalidateQueries({ queryKey: [friendsEndpoints.pendingCount] });
    },
  });
}

export function useRemoveFriendMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (friendId: number) =>
      apiRequest<void>(friendsEndpoints.remove(friendId), { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [friendsEndpoints.friends] });
    },
  });
}
