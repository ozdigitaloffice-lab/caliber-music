import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Album art lives on Apple's CDN; YouTube thumbnails on ytimg.com.
    // Spotify previews are audio (no images needed from there).
    remotePatterns: [
      { protocol: "https", hostname: "is1-ssl.mzstatic.com", pathname: "/**" },
      { protocol: "https", hostname: "is2-ssl.mzstatic.com", pathname: "/**" },
      { protocol: "https", hostname: "is3-ssl.mzstatic.com", pathname: "/**" },
      { protocol: "https", hostname: "is4-ssl.mzstatic.com", pathname: "/**" },
      { protocol: "https", hostname: "is5-ssl.mzstatic.com", pathname: "/**" },
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/**" },
      { protocol: "https", hostname: "i1.ytimg.com", pathname: "/**" },
      { protocol: "https", hostname: "i2.ytimg.com", pathname: "/**" },
      { protocol: "https", hostname: "i3.ytimg.com", pathname: "/**" },
      { protocol: "https", hostname: "i4.ytimg.com", pathname: "/**" },
      { protocol: "https", hostname: "img.youtube.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
