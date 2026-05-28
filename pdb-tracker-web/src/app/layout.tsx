import type { Metadata } from "next";
import "molstar/build/viewer/molstar.css";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

// Fonts: CSS variable stubs (no Google Fonts - network unavailable)
const geistSans = { variable: "--font-geist-sans" };
const geistMono = { variable: "--font-geist-mono" };

export const metadata: Metadata = {
  title: "PDB Structure Tracker",
  description: "Protein Data Bank structure tracking, evaluation, and literature monitoring platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}