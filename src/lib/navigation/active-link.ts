/** Select the most specific route, without matching sibling path prefixes. */
export function activeNavigationHref(pathname: string, hrefs: readonly string[]): string | undefined {
  return hrefs.filter((href) => pathname === href || (href !== "/portal" && pathname.startsWith(`${href}/`)))
    .sort((a, b) => b.length - a.length)[0];
}
