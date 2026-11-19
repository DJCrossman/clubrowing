import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.fn();
const getOrganization = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
	auth,
	clerkClient: async () => ({ organizations: { getOrganization } }),
}));
vi.mock("@/server/clerk/default-organization", () => ({
	getDefaultOrganizationId: () => "org_default",
}));

const { GET } = await import("./route");

describe("GET /api/v1/organization/icon", () => {
	beforeEach(() => {
		auth.mockReset();
		getOrganization.mockReset();
	});

	it("redirects a member to the image of their active organization", async () => {
		auth.mockResolvedValue({ orgId: "org_active" });
		getOrganization.mockResolvedValue({
			hasImage: true,
			imageUrl: "https://img.clerk.com/active.png",
		});

		const response = await GET(
			new Request("http://localhost/api/v1/organization/icon"),
		);

		expect(getOrganization).toHaveBeenCalledWith({
			organizationId: "org_active",
		});
		expect(response.status).toBe(307);
		expect(response.headers.get("Location")).toBe(
			"https://img.clerk.com/active.png",
		);
	});

	it("redirects to the default organization's image when no organization is active", async () => {
		auth.mockResolvedValue({ orgId: null });
		getOrganization.mockResolvedValue({
			hasImage: true,
			imageUrl: "https://img.clerk.com/default.png",
		});

		const response = await GET(
			new Request("http://localhost/api/v1/organization/icon"),
		);

		expect(getOrganization).toHaveBeenCalledWith({
			organizationId: "org_default",
		});
		expect(response.status).toBe(307);
		expect(response.headers.get("Location")).toBe(
			"https://img.clerk.com/default.png",
		);
	});

	it("redirects to the static favicon when the organization has no image", async () => {
		auth.mockResolvedValue({ orgId: "org_active" });
		getOrganization.mockResolvedValue({
			hasImage: false,
			imageUrl: "https://img.clerk.com/placeholder.png",
		});

		const response = await GET(
			new Request("https://club.example/api/v1/organization/icon"),
		);

		expect(response.status).toBe(307);
		expect(response.headers.get("Location")).toBe(
			"https://club.example/favicon.ico",
		);
	});
});
