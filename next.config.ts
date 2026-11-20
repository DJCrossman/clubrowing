import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	// Its bundled undici can't read a large response under Bun, which runs the dev instances.
	serverExternalPackages: ["@vercel/blob"],
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
