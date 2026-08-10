import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wiievent.com";
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/orders/", "/tickets/", "/claim/", "/account", "/checkout", "/api/"] },
    ],
    sitemap: `${site}/sitemap.xml`,
  };
}
