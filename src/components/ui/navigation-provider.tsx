"use client";

import { NavigationLoading } from "@/components/ui/navigation-loading";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

interface NavigationContextType {
  isNavigating: boolean;
  setNavigating: (value: boolean) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(
  undefined
);

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within NavigationProvider");
  }
  return context;
}

export function useNavigate() {
  const { setNavigating } = useNavigation();
  const router = useRouter();

  return {
    push: (href: string) => {
      setNavigating(true);
      router.push(href);
    },
    replace: (href: string) => {
      setNavigating(true);
      router.replace(href);
    },
  };
}

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const timeout = setTimeout(() => setIsNavigating(false), 0);
    return () => clearTimeout(timeout);
  }, [pathname]);

  return (
    <NavigationContext.Provider
      value={{
        isNavigating,
        setNavigating: setIsNavigating,
      }}
    >
      <NavigationLoading isPending={isNavigating} />
      {children}
    </NavigationContext.Provider>
  );
}

