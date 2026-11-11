"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Clock, AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/store";
import { daysRemaining } from "@/lib/features";

interface Props {
  onUpgradeClick?: () => void;
}

export function SubscriptionBanner({ onUpgradeClick }: Props) {
  const authUser = useStore((s) => s.authUser);

  if (!authUser) return null;

  // Admin — no banner needed
  if (authUser.role === "admin") {
    return (
      <div className="rounded-md bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 px-4 py-2 text-sm text-purple-800 dark:text-purple-200 flex items-center gap-2">
        <Crown className="h-4 w-4" />
        Admin access — all features unlocked
      </div>
    );
  }

  // Active subscription
  if (authUser.subscriptionStatus === "active") {
    const days = daysRemaining(authUser.subscriptionExpiresAt);
    return (
      <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 px-4 py-2 text-sm text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4" />
          Pro plan active — {days} days remaining
        </div>
        {days <= 5 && (
          <Button size="sm" variant="outline" onClick={onUpgradeClick}>
            Renew now
          </Button>
        )}
      </div>
    );
  }

  // Expired subscription
  if (authUser.subscriptionStatus === "expired") {
    return (
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900">
        <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div>
              <div className="font-semibold">Your subscription has expired</div>
              <div className="text-xs text-amber-700 dark:text-amber-300">
                Some features are now locked. Renew to get full access.
              </div>
            </div>
          </div>
          <Button
            size="sm"
            onClick={onUpgradeClick}
            className="bg-[#0E7C9C] hover:bg-[#0A6582] text-white"
          >
            Renew — R99 / 30 days
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Free user
  return (
    <Card className="border-sky-200 bg-sky-50 dark:bg-sky-950/40 dark:border-sky-900">
      <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sky-800 dark:text-sky-200">
          <Clock className="h-5 w-5 shrink-0" />
          <div>
            <div className="font-semibold">Free plan</div>
            <div className="text-xs text-sky-700 dark:text-sky-300">
              Limited features — upgrade for full access
            </div>
          </div>
        </div>
        <Button
          size="sm"
          onClick={onUpgradeClick}
          className="bg-[#0E7C9C] hover:bg-[#0A6582] text-white"
        >
          <Crown className="h-4 w-4 mr-1" /> Upgrade — R99 / 30 days
        </Button>
      </CardContent>
    </Card>
  );
}
