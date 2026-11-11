import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tulkit — Invoices & Quotes Made Easy",
  description: "Tulkit helps freelancers and small businesses create invoices and quotes, generate PDFs, and share via WhatsApp or email.",
  keywords: ["Tulkit", "invoice", "quote", "PDF", "WhatsApp", "email", "freelancer", "small business", "South Africa"],
  authors: [{ name: "Brandweaver" }],
  icons: {
    icon: "/tulkit.png",
    apple: "/tulkit.png",
  },
  openGraph: {
    title: "Tulkit — Invoices & Quotes Made Easy",
    description: "Create invoices and quotes, generate PDFs, share via WhatsApp or email. Powered by Brandweaver.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tulkit — Invoices & Quotes Made Easy",
    description: "Create invoices and quotes, generate PDFs, share via WhatsApp or email. Powered by Brandweaver.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
