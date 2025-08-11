import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";
import superjson from "superjson";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
      },
      dehydrate: {
        serializeData: superjson.serialize,
        shouldRedactErrors: () => {
          return false;
        },
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      hydrate: {
        deserializeData: superjson.deserialize,
      },
    },
  });
}

// Helper queryOptions for current user from tRPC route auth.me
export const meQueryOptions = {
  queryKey: ["auth", "me"] as const,
  queryFn: async () => {
    const res = await fetch("/api/trpc/auth.me");
    if (!res.ok) throw new Error("Failed to fetch current user");
    const json = await res.json();
    return json?.result?.data?.json ?? null;
  },
};
