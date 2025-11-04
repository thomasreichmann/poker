"use client";

import { useNavigation } from "@/components/ui/navigation-provider";
import Link, { LinkProps } from "next/link";
import { forwardRef } from "react";

export const AppLink = forwardRef<
  HTMLAnchorElement,
  LinkProps & React.AnchorHTMLAttributes<HTMLAnchorElement>
>(({ onClick, prefetch = true, ...props }, ref) => {
  const { setNavigating } = useNavigation();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    setNavigating(true);
    onClick?.(e);
  };

  return <Link ref={ref} prefetch={prefetch} onClick={handleClick} {...props} />;
});

AppLink.displayName = "AppLink";

export { useNavigation, useNavigate } from "@/components/ui/navigation-provider";

