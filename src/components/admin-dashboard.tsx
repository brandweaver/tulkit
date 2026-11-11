"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Users, Crown, Clock, TrendingUp, UserCheck, UserX } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { FEATURE_KEYS, FEATURE_LABELS } from "@/lib/types";
import type { FeatureKey } from "@/lib/types";

interface AdminUser {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  subscriptionStatus: string;
  subscriptionExpiresAt?: string;
  subscriptionActivatedAt?: string;
  allocatedFeatures: FeatureKey[];
  daysRemaining: number;
  createdAt: string;
}

interface Stats {
  totalUsers: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  freeUsers: number;
  totalDocuments: number;
  totalClients: number;
  recentActivations: number;
  estimatedMonthlyRevenue: number;
}

export function AdminDashboard() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribeUser, setSubscribeUser] = useState<AdminUser | null>(null);

  async function loadData() {
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/stats"),
      ]);
      const usersData = await usersRes.json();
      const statsData = await statsRes.json();
      setUsers(usersData.users ?? []);
      setStats(statsData);
    } catch (e) {
      console.error(e);
      toast({ title: "Failed to load admin data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubscribe(
    userId: string,
    durationDays: number,
    features: FeatureKey[],
  ) {
    try {
      const res = await fetch(`/api/admin/users/${userId}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationDays, features }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      toast({
        title: "Subscription activated",
        description: `User has ${durationDays} days of Pro access.`,
      });
      setSubscribeUser(null);
      loadData();
    } catch (e) {
      toast({
        title: "Failed to activate subscription",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  async function handleRevoke(userId: string) {
    if (!confirm("Revoke this user's subscription?")) return;
    try {
      await fetch(`/api/admin/users/${userId}/subscribe`, { method: "DELETE" });
      toast({ title: "Subscription revoked" });
      loadData();
    } catch {
      toast({ title: "Failed to revoke", variant: "destructive" });
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading admin dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Manage users, activate subscriptions, and track revenue.
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={<Users className="h-4 w-4" />} label="Total users" value={String(stats.totalUsers)} />
          <StatCard icon={<Crown className="h-4 w-4" />} label="Active subscriptions" value={String(stats.activeSubscriptions)} tone="emerald" />
          <StatCard icon={<Clock className="h-4 w-4" />} label="Expired" value={String(stats.expiredSubscriptions)} tone="amber" />
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Est. monthly revenue"
            value={`R${stats.estimatedMonthlyRevenue}`}
            sub={`R99 × ${stats.activeSubscriptions} active`}
            tone="emerald"
          />
        </div>
      )}

      {/* Users table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No users yet. Share your Tulkit URL to get signups!
            </div>
          ) : (
            <div className="divide-y">
              {users.map((u) => (
                <div key={u.id} className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{u.name || u.email || "Unknown"}</span>
                      {u.role === "admin" && (
                        <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                          <Crown className="h-3 w-3 mr-1" /> Admin
                        </Badge>
                      )}
                      <StatusBadge status={u.subscriptionStatus} days={u.daysRemaining} />
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {u.email} · joined {new Date(u.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {u.role !== "admin" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setSubscribeUser(u)}>
                          {u.subscriptionStatus === "active" ? "Extend" : "Activate"}
                        </Button>
                        {u.subscriptionStatus === "active" && (
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleRevoke(u.id)}>
                            Revoke
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscribe dialog */}
      {subscribeUser && (
        <SubscribeDialog
          user={subscribeUser}
          onSubscribe={(days, features) => handleSubscribe(subscribeUser.id, days, features)}
          onClose={() => setSubscribeUser(null)}
        />
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: "emerald" | "amber" | "red" | "neutral";
}) {
  const toneClass = {
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    red: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    neutral: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  }[tone];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className={`w-7 h-7 rounded-md flex items-center justify-center ${toneClass}`}>
            {icon}
          </span>
        </div>
        <div className="text-xl font-bold mt-2">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status, days }: { status: string; days: number }) {
  if (status === "active") {
    return (
      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
        <Crown className="h-3 w-3 mr-1" /> Pro · {days}d left
      </Badge>
    );
  }
  if (status === "expired") {
    return (
      <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
        Expired
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
      Free
    </Badge>
  );
}

function SubscribeDialog({
  user,
  onSubscribe,
  onClose,
}: {
  user: AdminUser;
  onSubscribe: (days: number, features: FeatureKey[]) => void;
  onClose: () => void;
}) {
  const [days, setDays] = useState(30);
  const [selectedFeatures, setSelectedFeatures] = useState<FeatureKey[]>(
    user.allocatedFeatures.length > 0 ? user.allocatedFeatures : [...FEATURE_KEYS],
  );

  function toggleFeature(f: FeatureKey) {
    setSelectedFeatures((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Activate subscription</DialogTitle>
          <DialogDescription>
            Mark <strong>{user.email}</strong> as paid. This REPLACES any existing subscription (no accumulation).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Duration (days)</Label>
            <Input
              type="number"
              min={1}
              max={365}
              value={days}
              onChange={(e) => setDays(Number(e.target.value) || 30)}
            />
            <p className="text-xs text-muted-foreground">Default: 30 days. R99 recommended.</p>
          </div>

          <div className="space-y-2">
            <Label>Features to allocate</Label>
            <div className="space-y-2 max-h-60 overflow-y-auto rounded-md border p-3">
              {FEATURE_KEYS.map((f) => (
                <div key={f} className="flex items-center space-x-2">
                  <Checkbox
                    id={`feat-${f}`}
                    checked={selectedFeatures.includes(f)}
                    onCheckedChange={() => toggleFeature(f)}
                  />
                  <Label htmlFor={`feat-${f}`} className="text-sm cursor-pointer">
                    {FEATURE_LABELS[f]}
                  </Label>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedFeatures([...FEATURE_KEYS])}
              >
                Select all
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedFeatures([])}
              >
                Clear
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => onSubscribe(days, selectedFeatures)}
            disabled={selectedFeatures.length === 0}
            className="bg-[#0E7C9C] hover:bg-[#0A6582] text-white"
          >
            Activate — {days} days
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
