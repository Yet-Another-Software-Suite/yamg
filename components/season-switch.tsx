import { ON_SYSTEMCORE, SITE_URL } from "@/lib/site"

/**
 * Links between the YAMG for each WPILib season, at the top right of the page. The 2026 site is
 * served under /2026, and the 2027 site at the root. A SystemCore package holds only its own
 * season, so there the others link to the hosted site.
 */
const SEASONS = [
  { year: "2026", href: ON_SYSTEMCORE ? `${SITE_URL}/2026/` : "/2026/" },
  { year: "2027", href: "/" },
]

export function SeasonSwitch({ current }: { current: string }) {
  return (
    <nav aria-label="WPILib season" className="flex justify-center pt-4 md:absolute md:right-4 md:top-4 md:z-10 md:pt-0">
      <div className="inline-flex rounded-sm border bg-card p-1 font-mono text-xs uppercase tracking-wider">
        {SEASONS.map(({ year, href }) =>
          year === current ? (
            <span key={year} aria-current="page" className="rounded-sm bg-primary px-3 py-1 font-bold text-primary-foreground">
              WPILib {year}
            </span>
          ) : (
            <a key={year} href={href} className="rounded-sm px-3 py-1 text-muted-foreground hover:text-foreground">
              WPILib {year}
            </a>
          ),
        )}
      </div>
    </nav>
  )
}
