// WordPress and old content path patterns that should return 410 Gone
export const GONE_PATTERNS = [
  /^\/wp-admin(\/.*)?$/,
  /^\/wp-content(\/.*)?$/,
  /^\/wp-includes(\/.*)?$/,
  /^\/category(\/.*)?$/,
  /^\/tag(\/.*)?$/,
  /^\/feed(\/.*)?$/,
  /^\/author(\/.*)?$/,
  /^\/page(\/.*)?$/,
  /^\/old-blog(\/.*)?$/,
  /^\/product(\/.*)?$/,
];

/**
 * Checks if a given pathname matches any of the gone patterns
 * @param pathname - The URL pathname to check
 * @returns true if the path matches a gone pattern, false otherwise
 */
export const isGonePath = (pathname: string): boolean => {
  return GONE_PATTERNS.some(pattern => pattern.test(pathname));
};
