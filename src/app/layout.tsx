import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: {
    default: "DymTicket - Project Management & Client Collaboration",
    template: "%s · DymTicket",
  },
  description:
    "DymTicket is a fast, friendly Kanban workspace for teams and clients - ticket boards, review loops, media attachments and a transparent activity timeline.",
  applicationName: "DymTicket",
  keywords: [
    "kanban",
    "project management",
    "client collaboration",
    "ticket board",
    "review workflow",
    "team tasks",
    "DymTicket",
  ],
  authors: [{ name: "DymTicket" }],
  creator: "DymTicket",
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: "DymTicket",
    title: "DymTicket - Project Management & Client Collaboration",
    description:
      "Kanban boards with client verification questions, review loops, media attachments and a transparent activity timeline.",
    locale: "en_US",
    alternateLocale: ["ja_JP"],
  },
  twitter: {
    card: "summary_large_image",
    title: "DymTicket - Project Management & Client Collaboration",
    description:
      "Kanban boards with client verification questions, review loops, media attachments and a transparent activity timeline.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
};

/** Applied before paint to avoid theme flicker on first load (light default). */
const themeInitScript = `(function(){try{var t=localStorage.getItem("orcaboard-theme");document.documentElement.dataset.theme=(t==="dark")?"dark":"light";}catch(e){document.documentElement.dataset.theme="light";}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
