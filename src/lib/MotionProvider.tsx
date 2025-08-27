"use client";

import { MotionConfig } from "motion/react";
import type { PropsWithChildren } from "react";

export function MotionProvider({ children }: PropsWithChildren) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

