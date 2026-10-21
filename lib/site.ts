export const REPO = "Yet-Another-Software-Suite/yamg"
export const REPO_URL = `https://github.com/${REPO}`

/** Set when the site is built into the SystemCore package (.github/workflows/build-ipk.yml), not the hosted site. */
export const ON_SYSTEMCORE = process.env.NEXT_PUBLIC_SYSTEMCORE === "1"
