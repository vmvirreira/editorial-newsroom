import type { Metadata } from "next";
import "./globals.css";
import { StorySpeechProvider } from "@/components/story-listen";

export const metadata: Metadata = {
  title: "The Brief and Beyond",
  description:
    "Thoughtfully curated news, fresh perspectives, and the context to explore beyond the headlines.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col"><StorySpeechProvider>{children}</StorySpeechProvider></body>
    </html>
  );
}
