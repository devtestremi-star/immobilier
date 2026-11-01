import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Suspense } from "react";
import { DataProvider } from "@/components/DataProvider";
import { NamePrompt } from "@/components/NamePrompt";
import { PendingSheet } from "@/components/PendingSheet";
import { Shell } from "@/components/Shell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Maison – suivi des annonces",
  description: "Recensement et notation des logements à acheter ou louer",
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col overflow-x-clip bg-slate-50 text-slate-900">
        <DataProvider>
          <Suspense>
            <Shell>{children}</Shell>
            <PendingSheet />
          </Suspense>
          <NamePrompt />
        </DataProvider>
      </body>
    </html>
  );
}
