import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const updateUserMetadata = vi.fn();

vi.mock("@/lib/env", () => ({
	envVars: { NEXT_PUBLIC_DEFAULT_ORGANIZATION_ID: "org_club" },
}));
vi.mock("@clerk/nextjs/server", () => ({
	clerkClient: async () => ({
		users: { getUser, updateUserMetadata },
	}),
}));

const { ensureDefaultOrganization } = await import("./default-organization");

beforeEach(() => {
	getUser.mockReset();
	updateUserMetadata.mockReset();
});

describe("ensureDefaultOrganization", () => {
	it("returns the user's default organization without changing it", async () => {
		getUser.mockResolvedValue({
			publicMetadata: { defaultOrganizationId: "org_other" },
		});

		expect(await ensureDefaultOrganization("user_tagged")).toBe("org_other");
		expect(updateUserMetadata).not.toHaveBeenCalled();
	});

	it("gives a user without one the club's organization", async () => {
		getUser.mockResolvedValue({ publicMetadata: {} });

		expect(await ensureDefaultOrganization("user_new")).toBe("org_club");
		expect(updateUserMetadata).toHaveBeenCalledWith("user_new", {
			publicMetadata: { defaultOrganizationId: "org_club" },
		});
	});

	it("replaces a default organization that isn't a string", async () => {
		getUser.mockResolvedValue({
			publicMetadata: { defaultOrganizationId: 42 },
		});

		expect(await ensureDefaultOrganization("user_garbled")).toBe("org_club");
		expect(updateUserMetadata).toHaveBeenCalledWith("user_garbled", {
			publicMetadata: { defaultOrganizationId: "org_club" },
		});
	});

	it("looks the user up once", async () => {
		getUser.mockResolvedValue({ publicMetadata: {} });

		await ensureDefaultOrganization("user_repeat");
		await ensureDefaultOrganization("user_repeat");

		expect(getUser).toHaveBeenCalledTimes(1);
		expect(updateUserMetadata).toHaveBeenCalledTimes(1);
	});
});
