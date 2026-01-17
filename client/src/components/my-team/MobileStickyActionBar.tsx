import { Link } from "wouter";
import { Button } from "@/components/ui/button";

type MobileAction = {
  label: string;
  href: string;
  summary?: string;
};

type MobileStickyActionBarProps = {
  actions: MobileAction[];
};

export default function MobileStickyActionBar({ actions }: MobileStickyActionBarProps) {
  if (!actions.length) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur lg:hidden">
      <div className="space-y-2">
        {actions.map((action) => (
          <div key={action.href} className="space-y-1">
            {action.summary && (
              <p className="text-xs text-gray-600">{action.summary}</p>
            )}
            <Link href={action.href}>
              <Button className="w-full min-h-[44px]">{action.label}</Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
