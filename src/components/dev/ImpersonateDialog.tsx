"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type UserLite = { id: string; email: string };

export function ImpersonateDialog(props: {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
  onImpersonatedAction?: (userId: string) => void;
}) {
  const { open, onOpenChangeAction, onImpersonatedAction } = props;
  const [users, setUsers] = useState<UserLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const [listRes, currentRes] = await Promise.all([
        fetch("/api/dev/users"),
        fetch("/api/dev/impersonate"),
      ]);
      const listJson = await listRes.json();
      const currJson = await currentRes.json();
      setUsers(listJson.users ?? []);
      setCurrentId(currJson.userId ?? null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void loadUsers();
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) => u.email.toLowerCase().includes(q) || u.id.toLowerCase().includes(q)
    );
  }, [search, users]);

  const impersonate = async (userId: string) => {
    try {
      setBusyUserId(userId);
      // Per-tab: store in sessionStorage and avoid cookie when present
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("dev_impersonate_user_id", userId);
      }
      // Also call cookie API for cross-tab fallback
      await fetch("/api/dev/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      onOpenChangeAction(false);
      onImpersonatedAction?.(userId);
    } finally {
      setBusyUserId(null);
    }
  };

  const clear = async () => {
    try {
      setClearing(true);
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("dev_impersonate_user_id");
      }
      await fetch("/api/dev/impersonate", { method: "DELETE" });
      onOpenChangeAction(false);
      onImpersonatedAction?.("");
    } finally {
      setClearing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">Impersonate a user</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              {users.length > 0
                ? `${users.length} users`
                : "Load users to begin"}
            </p>
            <Button variant="outline" size="sm" onClick={loadUsers}>
              {loading ? "Loading..." : "Refresh"}
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by email or ID"
              className="pl-10 bg-slate-700 border-slate-600 placeholder:text-slate-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="max-h-80 overflow-auto border border-slate-700 rounded-md">
            {loading && users.length === 0 ? (
              <div className="divide-y divide-slate-700">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-3 animate-pulse"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-600" />
                      <div>
                        <div className="h-3 w-40 bg-slate-600 rounded mb-2" />
                        <div className="h-2 w-24 bg-slate-700 rounded" />
                      </div>
                    </div>
                    <div className="h-8 w-20 bg-slate-700 rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-slate-700">
                {filtered.map((u) => {
                  const initials = (u.email?.[0] ?? "?").toUpperCase();
                  const isCurrent = currentId === u.id;
                  return (
                    <div
                      key={u.id}
                      className={`flex items-center justify-between px-3 py-2 transition-colors hover:bg-slate-700/50 ${
                        isCurrent ? "bg-emerald-600/10" : ""
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-emerald-600 text-white">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="truncate">
                          <div className="text-sm font-medium text-white truncate">
                            {u.email}
                          </div>
                          <div className="text-xs text-slate-400 truncate">
                            {u.id}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isCurrent && (
                          <span className="text-xs text-emerald-400 font-medium">
                            Current
                          </span>
                        )}
                        <Button
                          size="sm"
                          onClick={() => impersonate(u.id)}
                          disabled={busyUserId !== null}
                          className="disabled:opacity-70"
                        >
                          {busyUserId === u.id ? (
                            <div className="flex items-center gap-2">
                              <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Logging…</span>
                            </div>
                          ) : (
                            "Login as"
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="p-3 text-sm text-slate-400">
                    No users found
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={clear}
              disabled={clearing}
              className="disabled:opacity-70"
            >
              {clearing ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Clearing…
                </span>
              ) : (
                "Clear impersonation"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
