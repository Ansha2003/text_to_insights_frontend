import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy API calls to ADK backend to avoid CORS issues
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: `${apiUrl}/:path*`,
        },
        {
          source: '/run_sse',
          destination: `${apiUrl}/run_sse`,
        },
        {
          source: '/list-apps',
          destination: `${apiUrl}/list-apps`,
        },
        {
          source: '/apps/:path*',
          destination: `${apiUrl}/apps/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
