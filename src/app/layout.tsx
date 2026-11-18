import type { Metadata, Viewport } from "next";
import { Alef, Suez_One, Open_Sans } from "next/font/google";
import "./globals.css";

// Brand fonts: Suez One for headings, Alef for text, Open Sans for numbers.
const alef = Alef({
  variable: "--font-alef",
  subsets: ["hebrew", "latin"],
  weight: ["400", "700"],
});

const suezOne = Suez_One({
  variable: "--font-suez",
  subsets: ["hebrew", "latin"],
  weight: "400",
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "כלכלת המשפחה",
  description: "מערכת ניהול לקוחות לכלכלת המשפחה",
  appleWebApp: {
    capable: true,
    title: "התקציב שלי",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B5F58",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${alef.variable} ${suezOne.variable} ${openSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
