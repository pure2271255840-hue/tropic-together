import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { AuthSessionProvider } from "@/features/auth/use-auth-session";

export const metadata: Metadata = {
  title: "Tropic Together",
  description: "槟城与哥打京那巴鲁旅行协作工具"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <AuthSessionProvider>
          <AppShell>{children}</AppShell>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
