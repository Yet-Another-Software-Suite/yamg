import { Github } from "lucide-react"
import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t py-6 md:py-8">
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Made with 💚 by nstrike, v0, and Yet Another Software Suite
          </p>
        </div>
        <Link
          href="https://github.com/thenetworkgrinch/yamg"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-sm font-medium transition-colors hover:text-foreground/80"
        >
          <Github className="h-4 w-4" />
          <span>GitHub</span>
        </Link>
      </div>
    </footer>
  )
}
