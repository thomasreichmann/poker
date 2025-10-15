"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  realtimeStatusStore,
  useRealtimeStatus,
} from "@/supabase/realtimeStatus";
import { useTRPC } from "@/trpc/client";
import { useQueryClient } from "@tanstack/react-query";
import { Copy, Filter } from "lucide-react";
import { useEffect, useState } from "react";

type RealtimePanelProps = {
  gameId?: string;
};

export function RealtimePanel({ gameId }: RealtimePanelProps) {
  const status = useRealtimeStatus();
  const channels = status.channels;
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number>(Date.now());
  const [paused, setPaused] = useState<boolean>(false);
  const [limit, setLimit] = useState<number>(50);
  const [showErrorsOnly, setShowErrorsOnly] = useState(false);
  const [topicFilter, setTopicFilter] = useState<string>("");
  const [eventFilter, setEventFilter] = useState<
    "ALL" | "INSERT" | "UPDATE" | "DELETE"
  >("ALL");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    setLastUpdatedAt(Date.now());
  }, [status]);

  const connection = status.connectionStatus;
  const statusColor =
    connection === "connected"
      ? "bg-emerald-500"
      : connection === "connecting"
      ? "bg-amber-500"
      : connection === "error"
      ? "bg-red-500"
      : "bg-slate-500";

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center gap-2">
        <Badge className={`${statusColor} text-white`}>{connection}</Badge>
        <span className="text-slate-300">
          {channels.length ? "" : "No channels"}
        </span>
        <span className="ml-auto text-xs text-slate-400">
          Updated {new Date(lastUpdatedAt).toLocaleTimeString()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded border border-slate-700 bg-slate-900 p-2">
          <div className="text-slate-400">Channels</div>
          <div className="text-lg font-semibold">{channels.length}</div>
        </div>
        <div className="rounded border border-slate-700 bg-slate-900 p-2">
          <div className="text-slate-400">Connection</div>
          <div className="text-lg font-semibold">{connection}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setPaused((p) => !p)}
          className="border border-slate-700"
        >
          {paused ? "Resume" : "Pause"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => realtimeStatusStore.clearLifecycle()}
          className="border border-slate-700"
        >
          Clear events
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!gameId || isFetching}
          onClick={async () => {
            if (!gameId) return;
            setIsFetching(true);
            try {
              const key = trpc.game.getById.queryKey({ id: gameId });
              await queryClient.invalidateQueries({ queryKey: key });
              await queryClient.refetchQueries({
                queryKey: key,
                type: "active",
              });
            } finally {
              setIsFetching(false);
              setLastUpdatedAt(Date.now());
            }
          }}
          className="border border-slate-700"
        >
          {isFetching ? "Fetching…" : "Fetch state"}
        </Button>
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-300">
          <span>Show</span>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded px-1 py-0.5"
          >
            {[25, 50, 100, 200].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span>events</span>
        </div>
      </div>

      <div className="rounded border border-slate-700 overflow-hidden">
        <div className="grid grid-cols-6 bg-slate-900/80 text-slate-300 px-2 py-1 text-xs">
          <div className="col-span-4">Topic</div>
          <div className="col-span-2">State</div>
        </div>
        <div className="divide-y divide-slate-800">
          {channels.map((c) => (
            <div key={c.topic} className="grid grid-cols-6 px-2 py-1">
              <div className="col-span-4 flex items-center gap-1 text-slate-200">
                <span className="truncate">{c.topic}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  aria-label={`Copy ${c.topic}`}
                  title="Copy topic"
                  onClick={() => {
                    if (
                      typeof navigator !== "undefined" &&
                      navigator.clipboard
                    ) {
                      navigator.clipboard.writeText(c.topic).catch(() => {});
                    }
                  }}
                >
                  <Copy className="size-3.5" />
                </Button>
              </div>
              <div className="col-span-2 text-slate-300">{c.state}</div>
            </div>
          ))}
          {channels.length === 0 && (
            <div className="px-2 py-2 text-slate-400">No active channels</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded border border-slate-700 bg-slate-900 p-2">
          <div className="text-slate-400">Broadcast counters</div>
          <div className="mt-2 grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-xs text-slate-400">INS</div>
              <div className="font-semibold">{status.counters.INSERT}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">UPD</div>
              <div className="font-semibold">{status.counters.UPDATE}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">DEL</div>
              <div className="font-semibold">{status.counters.DELETE}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">OTH</div>
              <div className="font-semibold">{status.counters.OTHER}</div>
            </div>
          </div>
        </div>
        <div className="rounded border border-slate-700 bg-slate-900 p-2">
          <div className="text-slate-400">Last broadcast</div>
          <div className="mt-1 text-slate-200">
            {status.lastBroadcast ? (
              <>
                <div className="text-sm">
                  {status.lastBroadcast.event} on {status.lastBroadcast.table}
                </div>
                <div className="text-xs text-slate-400">
                  {new Date(status.lastBroadcast.at).toLocaleTimeString()}
                </div>
              </>
            ) : (
              <span className="text-slate-400">—</span>
            )}
          </div>
        </div>
      </div>

      <div className="rounded border border-slate-700 overflow-hidden">
        <div className="bg-slate-900/80 text-slate-300 px-2 py-1 text-xs">
          <div className="flex items-center gap-2">
            <span>Recent broadcasts</span>
            <select
              value={eventFilter}
              onChange={(e) =>
                setEventFilter(
                  e.target.value as "ALL" | "INSERT" | "UPDATE" | "DELETE"
                )
              }
              className="ml-2 bg-slate-950 border border-slate-700 rounded px-1 py-0.5"
            >
              {(["ALL", "INSERT", "UPDATE", "DELETE"] as const).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <input
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              placeholder="Filter table"
              className="ml-auto bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-200"
            />
          </div>
        </div>
        <div className="grid grid-cols-6 bg-slate-900/60 text-slate-400 px-2 py-1 text-[11px]">
          <div className="col-span-2">Time</div>
          <div className="col-span-3">Table</div>
          <div className="col-span-1 text-right">Event</div>
        </div>
        <div className="divide-y divide-slate-800">
          {(paused
            ? status.recentBroadcasts
            : status.recentBroadcasts.slice(0, limit)
          )
            .filter((e) =>
              eventFilter === "ALL" ? true : e.event === eventFilter
            )
            .filter((e) =>
              topicFilter.trim() ? e.table.includes(topicFilter.trim()) : true
            )
            .map((e) => (
              <div key={e.id} className="grid grid-cols-6 px-2 py-1 text-xs">
                <div className="col-span-2 text-slate-400">{e.time}</div>
                <div className="col-span-3 truncate text-slate-200">
                  {e.table}
                </div>
                <div className="col-span-1 text-right text-slate-300">
                  {e.event}
                </div>
              </div>
            ))}
          {status.recentBroadcasts.length === 0 && (
            <div className="px-2 py-2 text-slate-400 text-sm">
              No broadcasts
            </div>
          )}
        </div>
      </div>

      <div className="rounded border border-slate-700 overflow-hidden">
        <div className="bg-slate-900/80 text-slate-300 px-2 py-1 text-xs">
          <div className="flex items-center gap-2">
            <span>Lifecycle events</span>
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <label className="ml-2 inline-flex items-center gap-2 text-slate-300">
              <input
                type="checkbox"
                className="h-3 w-3"
                checked={showErrorsOnly}
                onChange={(e) => setShowErrorsOnly(e.target.checked)}
              />
              <span className="text-xs">Errors only</span>
            </label>
            <input
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              placeholder="Filter topic"
              className="ml-auto bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-200"
            />
          </div>
        </div>
        <div className="divide-y divide-slate-800">
          {(paused ? status.lifecycle : status.lifecycle.slice(0, limit))
            .filter((e) =>
              showErrorsOnly
                ? /ERROR|errored|CHANNEL_ERROR|TIMED_OUT/i.test(e.status)
                : true
            )
            .filter((e) =>
              topicFilter.trim() ? e.topic.includes(topicFilter.trim()) : true
            )
            .map((e) => (
              <div
                key={e.id}
                className="flex items-center gap-2 px-2 py-1 text-xs"
              >
                <div className="text-slate-400 w-20">{e.time}</div>
                <div className="text-slate-500">{e.topic}</div>
                <div className="ml-auto text-slate-300">{e.status}</div>
              </div>
            ))}
          {status.lifecycle.length === 0 && (
            <div className="px-2 py-2 text-slate-400 text-sm">No events</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RealtimePanel;
