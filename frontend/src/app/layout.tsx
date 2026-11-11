import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import Sidebar from "@/components/shared/Sidebar";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SmartCare",
  description: "Hospital Resource Management System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="flex min-h-screen bg-gray-50 font-sans">
        <Suspense fallback={null}>
          <Sidebar />
        </Suspense>
        <main className="flex-1 ml-60 p-6 overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
