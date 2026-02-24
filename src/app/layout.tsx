import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Connect Four Guru",
  description: "Play Connect Four against an AI powered by negamax with alpha-beta pruning.",
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
