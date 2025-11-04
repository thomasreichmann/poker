"use client";

import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";

export function NavigationLoading({ isPending }: { isPending: boolean }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isPending) {
      setProgress(30);
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 200);

      return () => {
        clearInterval(interval);
        setProgress(0);
      };
    } else {
      setProgress(100);
      const timeout = setTimeout(() => setProgress(0), 200);
      return () => clearTimeout(timeout);
    }
  }, [isPending]);

  if (!isPending && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1">
      <Progress
        value={progress}
        className="h-1 rounded-none bg-slate-800 [&>div]:bg-emerald-600"
      />
    </div>
  );
}
