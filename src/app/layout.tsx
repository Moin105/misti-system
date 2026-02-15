import type { Metadata } from "next";
import Providers from "./providers";
import { buildMetadataForPath } from "@/lib/seo";
import "@/index.css";

export const metadata: Metadata = buildMetadataForPath("/");

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
