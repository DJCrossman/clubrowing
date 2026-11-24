import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const env = { BLOB_READ_WRITE_TOKEN: "blob-token" as string | undefined };
const getActivityById = vi.fn();
const findUnique = vi.fn();
const get = vi.fn();

vi.mock("@/lib/env", () => ({ envVars: env }));
vi.mock("@/server/infra/trpc/caller", () => ({
	createServerCaller: async () => ({ activities: { getActivityById } }),
}));
vi.mock("@/lib/db", () => ({ db: { activity: { findUnique } } }));
vi.mock("@vercel/blob", () => ({ get }));

const { GET } = await import("./route");

const storedUrl =
	"https://abc123.private.blob.vercel-storage.com/uploads/user_1/photo-x.webp";

describe("GET /api/v1/activities/[id]/screenshot", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		env.BLOB_READ_WRITE_TOKEN = "blob-token";
		getActivityById.mockResolvedValue({ id: "act_1", hasScreenshot: true });
		findUnique.mockResolvedValue({ screenshot: { url: storedUrl } });
		get.mockResolvedValue({
			statusCode: 200,
			stream: new Blob(["photo-bytes"]).stream(),
			blob: { contentType: "image/webp", etag: '"etag-1"' },
		});
	});

	it("answers 401 when signed out", async () => {
		getActivityById.mockRejectedValue(
			new TRPCError({
				code: "UNAUTHORIZED",
				message: "Authentication required",
			}),
		);

		const response = await GET(...screenshotRequest());

		expect(response.status).toBe(401);
		expect(get).not.toHaveBeenCalled();
	});

	it("answers 403 for another member's activity", async () => {
		getActivityById.mockRejectedValue(
			new TRPCError({
				code: "FORBIDDEN",
				message: "Cannot view another athlete's activity",
			}),
		);

		const response = await GET(...screenshotRequest());

		expect(response.status).toBe(403);
		expect(get).not.toHaveBeenCalled();
	});

	it("answers 404 for a missing activity", async () => {
		getActivityById.mockResolvedValue(null);

		const response = await GET(...screenshotRequest());

		expect(response.status).toBe(404);
		expect(get).not.toHaveBeenCalled();
	});

	it("answers 404 for an activity without a screenshot", async () => {
		getActivityById.mockResolvedValue({ id: "act_1", hasScreenshot: false });

		const response = await GET(...screenshotRequest());

		expect(response.status).toBe(404);
		expect(get).not.toHaveBeenCalled();
	});

	it("answers 503 when photo storage is not configured", async () => {
		env.BLOB_READ_WRITE_TOKEN = undefined;

		const response = await GET(...screenshotRequest());

		expect(response.status).toBe(503);
		expect((await response.json()).error).toBe(
			"Photo storage isn't set up on this server yet.",
		);
	});

	it("streams the stored photo", async () => {
		const response = await GET(...screenshotRequest());

		expect(response.status).toBe(200);
		expect(await response.text()).toBe("photo-bytes");
		expect(get).toHaveBeenCalledWith(storedUrl, {
			access: "private",
			ifNoneMatch: undefined,
		});
		expect(response.headers.get("Cache-Control")).toBe(
			"private, max-age=31536000, immutable",
		);
		expect(response.headers.get("Content-Type")).toBe("image/webp");
		expect(response.headers.get("ETag")).toBe('"etag-1"');
		expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
	});

	it("passes a 304 through when the browser already has the photo", async () => {
		get.mockResolvedValue({ statusCode: 304, stream: null, blob: {} });

		const response = await GET(
			...screenshotRequest({ "If-None-Match": '"etag-1"' }),
		);

		expect(response.status).toBe(304);
		expect(get).toHaveBeenCalledWith(storedUrl, {
			access: "private",
			ifNoneMatch: '"etag-1"',
		});
	});

	it("answers 404 when the stored file is gone", async () => {
		get.mockResolvedValue(null);

		const response = await GET(...screenshotRequest());

		expect(response.status).toBe(404);
	});
});

function screenshotRequest(headers: Record<string, string> = {}) {
	return [
		new Request("http://localhost/api/v1/activities/act_1/screenshot", {
			headers,
		}),
		{ params: Promise.resolve({ id: "act_1" }) },
	] as const;
}
