import type { NextConfig } from "next";

const apiProxyTarget = process.env.API_PROXY_TARGET;

const nextConfig: NextConfig = {
  async rewrites() {
    const rewrites = [
      // Serve Firebase's auth helper from OUR domain so Safari never sees a
      // cross-site frame during Google sign-in (fixes desktop-Safari storage
      // blocking). Active only when NEXT_PUBLIC_AUTH_PROXY=1 is also set,
      // but the proxy itself is always safe to have in place.
      {
        source: "/__/auth/:path*",
        destination: "https://feedtldr.firebaseapp.com/__/auth/:path*",
      },
      {
        source: "/__/firebase/:path*",
        destination: "https://feedtldr.firebaseapp.com/__/firebase/:path*",
      },
    ];

    if (apiProxyTarget) {
      rewrites.push({
        source: "/api/:path*",
        destination: `${apiProxyTarget}/:path*`,
      });
    }

    return rewrites;
  },
};

export default nextConfig;
