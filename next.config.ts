import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Next 16 defaults Content-Disposition to "attachment" for security, which
    // makes <img> render at 0×0 in some headless contexts. We're loading from
    // trusted CDNs we control via remotePatterns, so "inline" is safe.
    contentDispositionType: "inline",
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
      // Band photo from the previous emergent.sh build of the site
      { protocol: "https", hostname: "customer-assets.emergentagent.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
