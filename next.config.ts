import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	images: {
		// Clerk serves organization logos from here.
		remotePatterns: [{ protocol: "https", hostname: "img.clerk.com" }],
	},
	experimental: {
		serverActions: {
			bodySizeLimit: "4mb",
		},
	},
};

export default nextConfig;
