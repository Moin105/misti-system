"use client";

import React, { createContext, useContext, useMemo } from "react";
import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface RouterRuntimeValue {
  params: Record<string, string>;
}

const RouterRuntimeContext = createContext<RouterRuntimeValue>({ params: {} });

export function RouterRuntimeProvider({
  params,
  children,
}: {
  params: Record<string, string>;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ params }), [params]);
  return <RouterRuntimeContext.Provider value={value}>{children}</RouterRuntimeContext.Provider>;
}

export function BrowserRouter({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Routes({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Route({ element }: { element: React.ReactNode; [key: string]: unknown }) {
  return <>{element}</>;
}

type ToValue = string | { pathname?: string; search?: string };

function toHref(to: ToValue): string {
  if (typeof to === "string") return to;
  const pathname = to.pathname ?? "/";
  const search = to.search ?? "";
  return `${pathname}${search}`;
}

export function Link({
  to,
  replace,
  children,
  ...rest
}: {
  to: ToValue;
  replace?: boolean;
  children: React.ReactNode;
} & Omit<React.ComponentProps<typeof NextLink>, "href">) {
  return (
    <NextLink href={toHref(to)} replace={replace} {...rest}>
      {children}
    </NextLink>
  );
}

export function useNavigate() {
  const router = useRouter();
  return (to: string | number, options?: { replace?: boolean }) => {
    if (typeof to === "number") {
      if (to < 0) router.back();
      return;
    }
    if (options?.replace) {
      router.replace(to);
    } else {
      router.push(to);
    }
  };
}

export function useLocation() {
  const pathname = usePathname();
  const search =
    typeof window !== "undefined" && window.location.search
      ? window.location.search.slice(1)
      : "";
  return {
    pathname: pathname ?? "/",
    search: search ? `?${search}` : "",
    hash: typeof window !== "undefined" ? window.location.hash : "",
    key: pathname ?? "/",
    state: null as unknown,
  };
}

export function useParams<T extends Record<string, string> = Record<string, string>>() {
  return useContext(RouterRuntimeContext).params as T;
}

export function useSearchParamsShim(): [URLSearchParams, (nextInit: URLSearchParams | string) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );

  const setSearchParams = (nextInit: URLSearchParams | string) => {
    const nextValue = typeof nextInit === "string" ? nextInit : nextInit.toString();
    router.replace(`${pathname ?? "/"}${nextValue ? `?${nextValue}` : ""}`);
  };

  return [params, setSearchParams];
}

export { useSearchParamsShim as useSearchParams };
