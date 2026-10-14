import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Civic Ledger",
  description:
    "A Supabase-powered editorial news site with public reading, writer drafts, and editor publishing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
