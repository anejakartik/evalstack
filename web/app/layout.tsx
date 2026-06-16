import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "evalstack",
  description: "Open-source LLM evaluation dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-semibold tracking-tight">
                evalstack
              </span>
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono text-zinc-600">
                v0.1
              </span>
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link
                href="/"
                className="text-zinc-600 hover:text-zinc-900"
              >
                Runs
              </Link>
              <a
                href="https://github.com/anejakartik/evalstack"
                target="_blank"
                rel="noreferrer"
                className="text-zinc-600 hover:text-zinc-900"
              >
                GitHub ↗
              </a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        <footer className="border-t border-zinc-200 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-4 text-xs text-zinc-500">
            evalstack · open-source LLM evaluation · MIT
          </div>
        </footer>
      </body>
    </html>
  );
}
