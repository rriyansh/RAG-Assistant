export function siteOrigin(): URL {
  return new URL(process.env.SITE_URL || "https://resso-agent.example.com");
}
