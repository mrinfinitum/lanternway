import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { PrototypeBanner } from "@/components/prototype-banner";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lanternway",
  description: "Your child's whole journey, in one place.",
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <PrototypeBanner />
        {children}
      </body>
    </html>
  );
}
