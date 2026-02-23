import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AppShellClient from "@/components/AppShellClient";
import { resolveRoute } from "@/lib/nextRoutes";
import { buildMetadataForPathAsync } from "@/lib/seo";

interface CatchAllPageProps {
  params: Promise<{ slug?: string[] }>;
}

function normalizePath(slug?: string[]) {
  if (!slug || slug.length === 0) return "/";
  return `/${slug.join("/")}`;
}

export async function generateMetadata({ params }: CatchAllPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const pathname = normalizePath(resolvedParams.slug);
  return buildMetadataForPathAsync(pathname);
}

export default async function CatchAllPage({ params }: CatchAllPageProps) {
  const resolvedParams = await params;
  const pathname = normalizePath(resolvedParams.slug);
  const route = resolveRoute(pathname);

  if (!route) {
    notFound();
  }

  return <AppShellClient routeKey={route.key} routeParams={route.params} />;
}
