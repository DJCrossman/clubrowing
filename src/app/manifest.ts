import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "Club Rowing",
		short_name: "Club Rowing",
		description:
			"The training schedule, workouts, activities and club chat for your rowing club.",
		start_url: "/",
		display: "standalone",
		background_color: "#09090b",
		theme_color: "#09090b",
		icons: [{ src: "/logo.png", sizes: "512x512", type: "image/png" }],
	};
}
