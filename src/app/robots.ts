import type { MetadataRoute } from "next";

/** Keep every authenticated application surface out of search engines -
 * only the public landing page is meaningful SEO surface. */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/projects",
          "/analytics",
          "/knowledge",
          "/admin",
          "/api",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
