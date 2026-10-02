import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CUSTOMER_APPLE_APP_ID } from "@/lib/app-links";

export const metadata: Metadata = {
  title: "ASAP Delivery",
  description: "Lightning-fast same-day delivery service",
  appleWebApp: {
    title: "ASAP",
    statusBarStyle: "black-translucent",
  },
  // iOS Safari smart app banner, once the customer app is live.
  ...(CUSTOMER_APPLE_APP_ID && {
    itunes: { appId: CUSTOMER_APPLE_APP_ID },
  }),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#080e1c",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
