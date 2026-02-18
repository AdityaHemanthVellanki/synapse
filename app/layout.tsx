import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Synapse - Agent-Native Skill Composition Engine",
  description:
    "Build, visualize, and compose executable skill graphs for AI agents",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} text-gray-200 antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
