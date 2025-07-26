"use client";
// <-- hooks can only be used in client components
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

export function Test() {
  const trpc = useTRPC();
  const greeting = useQuery(
    trpc.hello.queryOptions({ text: "world thomas (now with helpers!)" })
  );
  if (!greeting.data) return <div>Loading...</div>;
  return <div>{greeting.data.greeting}</div>;
}
