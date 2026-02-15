import AppShellClient from "@/components/AppShellClient";
import { buildMetadataForPath } from "@/lib/seo";

export const metadata = buildMetadataForPath("/404");

export default function NotFoundPage() {
  return <AppShellClient routeKey="notFound" routeParams={{}} />;
}
