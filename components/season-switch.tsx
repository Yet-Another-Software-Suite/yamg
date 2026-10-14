/**
 * Links between the YAMG for each WPILib season. The 2026 site is served at the root, and the 2027
 * site under /2027, until 2027 becomes the default.
 */
const SEASONS = [
  { year: "2026", href: "/" },
  { year: "2027", href: "/2027/" },
]

export function SeasonSwitch({ current }: { current: string }) {
  return (
    <nav aria-label="WPILib season" className="flex justify-center mb-6">
      <div className="inline-flex rounded-lg border p-1 text-sm">
        {SEASONS.map(({ year, href }) =>
          year === current ? (
            <span key={year} aria-current="page" className="rounded-md bg-primary px-3 py-1 font-medium text-primary-foreground">
              WPILib {year}
            </span>
          ) : (
            <a key={year} href={href} className="rounded-md px-3 py-1 text-muted-foreground hover:text-foreground">
              WPILib {year}
            </a>
          ),
        )}
      </div>
    </nav>
  )
}
