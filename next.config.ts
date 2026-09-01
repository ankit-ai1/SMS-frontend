import type { NextConfig } from "next";

/**
 * Tenant subdomain the backend resolves from the request Host.
 * Kept in sync with NEXT_PUBLIC_TENANT so the client and the proxy agree.
 */
const TENANT = process.env.NEXT_PUBLIC_TENANT ?? "sunrise";

/** Where the proxy forwards to. Override with BACKEND_ORIGIN if the port moves. */
const BACKEND_ORIGIN =
  process.env.BACKEND_ORIGIN ?? `http://${TENANT}.lvh.me:8080`;

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // The browser calls same-origin `/api/*`, so there is no cross-origin
      // request and therefore no CORS preflight. Next forwards server-side and
      // sets Host to the tenant subdomain, which is what the backend reads to
      // resolve the tenant.
      {
        source: "/api/:path*",
        destination: `${BACKEND_ORIGIN}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
