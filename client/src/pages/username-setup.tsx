import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { trackEvent } from "@/lib/analytics";

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

const normalizeUsername = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);

const extractErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    const [, message] = error.message.split(": ");
    return message || error.message;
  }
  return "Something went wrong. Please try again.";
};

export default function UsernameSetup() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<{
    status: "idle" | "checking" | "available" | "taken" | "invalid";
    normalized: string;
  }>({ status: "idle", normalized: "" });

  const suggestedUsername = useMemo(() => {
    if (!user?.email) return "";
    const base = user.email.split("@")[0] ?? "";
    return normalizeUsername(base);
  }, [user?.email]);

  useEffect(() => {
    if (!username && suggestedUsername) {
      setUsername(suggestedUsername);
    }
  }, [suggestedUsername, username]);

  const mutation = useMutation({
    mutationFn: async (value: string) =>
      apiRequest<{ username: string }>("/api/me/username", {
        method: "PUT",
        body: JSON.stringify({ username: value }),
      }),
    onSuccess: async () => {
      trackEvent("username_set", {
        used_suggestion: normalizedUsername === suggestedUsername,
      });
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (err) => {
      setError(extractErrorMessage(err));
    },
  });

  const normalizedUsername = normalizeUsername(username);
  const isValid = USERNAME_PATTERN.test(normalizedUsername);

  useEffect(() => {
    if (!username) {
      setAvailability({ status: "idle", normalized: "" });
      return;
    }

    if (!isValid) {
      setAvailability({ status: "invalid", normalized: normalizedUsername });
      return;
    }

    let cancelled = false;
    setAvailability({ status: "checking", normalized: normalizedUsername });

    const handle = window.setTimeout(async () => {
      try {
        const response = await apiRequest<{
          available: boolean;
          normalized: string;
          reason?: string;
        }>(`/api/me/username/check?username=${encodeURIComponent(normalizedUsername)}`);

        if (cancelled) return;
        setAvailability({
          status: response.available ? "available" : "taken",
          normalized: response.normalized,
        });
      } catch {
        if (cancelled) return;
        setAvailability({ status: "invalid", normalized: normalizedUsername });
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [username, normalizedUsername, isValid]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!isValid) {
      setError(
        "Usernames must be 3-20 characters and use only letters, numbers, or underscores.",
      );
      return;
    }

    if (availability.status === "taken") {
      setError("That username is already taken.");
      return;
    }

    mutation.mutate(normalizedUsername);
  };

  const availabilityMessage = (() => {
    switch (availability.status) {
      case "checking":
        return "Checking availability…";
      case "available":
        return "Username available";
      case "taken":
        return "Username already taken";
      case "invalid":
        return "Invalid username format";
      default:
        return "";
    }
  })();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-heading font-bold text-secondary">
            Choose your username
          </h1>
          <p className="text-sm text-gray-600">
            Your username is public on leaderboards. Emails and real names are
            never shown.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Unable to save username</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700" htmlFor="username">
              Username
            </label>
            <Input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="yourname"
              autoComplete="off"
            />
            <p className="text-xs text-gray-500">
              3-20 characters • letters, numbers, underscores only
            </p>
            {availabilityMessage && (
              <p
                className={`text-xs ${
                  availability.status === "available"
                    ? "text-green-600"
                    : availability.status === "checking"
                      ? "text-gray-500"
                      : "text-red-600"
                }`}
              >
                {availabilityMessage}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={
              mutation.isPending ||
              availability.status === "checking" ||
              availability.status === "taken" ||
              availability.status === "invalid"
            }
          >
            {mutation.isPending ? "Saving…" : "Save username"}
          </Button>
        </form>

        <div className="text-center">
          <a
            href="/api/auth/logout"
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Sign out
          </a>
        </div>
      </div>
    </div>
  );
}
