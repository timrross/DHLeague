import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function Login() {
  useEffect(() => {
    // Redirect to the server-side auth endpoint to start the login flow
    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get("returnTo") ?? "/";
    window.location.href = `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900">Redirecting to login…</p>
          <p className="text-sm text-gray-600">If you are not redirected, please refresh the page.</p>
        </div>
      </div>
    </div>
  );
}
