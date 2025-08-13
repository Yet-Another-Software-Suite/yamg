import type React from "react";
import "@/app/globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Footer } from "@/components/footer";

export const metadata = {
  title: "Yet Another Mechanisms Generator (YAMG)",
  description:
    "Generate code for FRC mechanisms, and simulate them in the browser!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          forcedTheme="dark"
        >
          {children}
          <Footer />
        </ThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
          window.addEventListener('error', function(e) {
            if (e.message && e.message.includes('ResizeObserver loop')) {
              e.stopImmediatePropagation();
              e.preventDefault();
              console.warn('ResizeObserver error prevented');
            }
          });
        `,
          }}
        />
      </body>
    </html>
  );
}
