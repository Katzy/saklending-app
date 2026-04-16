import type { MetadataRoute } from 'next'

const STATES = [
  'alabama', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut',
  'delaware', 'florida', 'georgia', 'idaho', 'illinois', 'indiana', 'iowa',
  'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts',
  'michigan', 'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska',
  'new-hampshire', 'new-jersey', 'new-mexico', 'new-york', 'north-carolina',
  'north-dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania', 'rhode-island',
  'south-carolina', 'south-dakota', 'tennessee', 'texas', 'utah', 'vermont',
  'virginia', 'washington', 'west-virginia', 'wisconsin', 'wyoming',
]

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://saklending.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const publicPages = ['', '/about', '/services', '/contact', '/quote', '/calculator'].map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: path === '' ? 1.0 : 0.8,
  }))

  const statePages = STATES.map((state) => ({
    url: `${BASE_URL}/commercial-loans/${state}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [...publicPages, ...statePages]
}
