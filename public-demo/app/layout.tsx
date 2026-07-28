import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "InfinityAtlas Climate & Health MRV Toolkit";
const description =
  "Controlled public territorial intelligence demonstration for San Cristobal, Galapagos.";

export async function generateMetadata(): Promise<Metadata> {
  const incoming = await headers();
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host");
  const protocol = incoming.get("x-forwarded-proto") ?? "https";
  const base = host ? `${protocol}://${host}` : "http://localhost:3000";
  const image = `${base}/og.png`;
  return {
    title,
    description,
    openGraph: {
      type: "website",
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
