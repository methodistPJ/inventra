import type { Metadata } from "next";
import "./globals.css";
import "./game.css";

export const metadata: Metadata = {
  title: "INVENTRA · Motion Lab",
  description: "Build. Test. Discover. Physics challenges for young inventors.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
