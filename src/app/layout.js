import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import GlobalAlert from "../components/GlobalAlert";
import { PermissionsProvider } from "../context/PermissionsContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata = {
  title: "CeCube Group",
  description: "Dashboard for CeCube Group",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" style={{ fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif' }}>
        <PermissionsProvider>
          <GlobalAlert />
          {children}
        </PermissionsProvider>
      </body>
    </html>
  );
}
