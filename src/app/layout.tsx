import type { Metadata, Viewport } from "next";
import { PwaStatus } from "@/components/pwa/pwa-status";
import "./globals.css";

export const metadata: Metadata = {
  title: "OneIT — Gestão de Serviços e Operações",
  description: "Gestão de serviços, operações de campo e governança de TI.",
  appleWebApp: { capable: true, title: "OneIT", statusBarStyle: "default" },
  icons: { icon: "/pwa/icons/192", apple: "/pwa/icons/180" },
};

export const viewport: Viewport = { themeColor: "#062c59", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col"><PwaStatus />{children}</body>
    </html>
  );
}
