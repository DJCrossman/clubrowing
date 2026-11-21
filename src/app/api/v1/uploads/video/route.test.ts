// @vitest-environment node
import { getPayloadFromClientToken } from "@vercel/blob/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const env = {
	BLOB_READ_WRITE_TOKEN: "blob-token" as string | undefined,
	MEMBER_DAILY_UPLOAD_LIMIT: 30,
};
const requireAuth = vi.fn();
const count = vi.fn();
const aggregate = vi.fn();
const create = vi.fn();
const after = vi.fn();

vi.mock("@/lib/env", () => ({ envVars: env }));
vi.mock("@/lib/auth", () => ({ requireAuth }));
vi.mock("@/lib/db", () => ({ db: { upload: { count, aggregate, create } } }));
vi.mock("next/server", async (importOriginal) => ({
	...(await importOriginal<typeof import("next/server")>()),
	after,
}));
// Signed locally by the SDK; nothing reaches a file store.
process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_teststore_secret";

const { POST } = await import("./route");

const userId = "user_123";

describe("POST /api/v1/uploads/video", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		env.BLOB_READ_WRITE_TOKEN = "blob-token";
		requireAuth.mockResolvedValue(userId);
		count.mockResolvedValue(0);
		aggregate.mockResolvedValue({ _sum: { size: null } });
		create.mockResolvedValue({ id: "upl_video" });
	});

	it("rejects a signed-out request", async () => {
		requireAuth.mockRejectedValue(new Error("Unauthorized"));

		const response = await POST(videoRequest());

		expect(response.status).toBe(401);
	});

	it("refuses when storage is not configured", async () => {
		env.BLOB_READ_WRITE_TOKEN = undefined;

		const response = await POST(videoRequest());

		expect(response.status).toBe(503);
		expect((await response.json()).error).toBeTruthy();
	});

	it("refuses a request without a name and size", async () => {
		const response = await POST(
			new Request("http://localhost/api/v1/uploads/video", {
				method: "POST",
				body: "not json",
			}),
		);

		expect(response.status).toBe(400);
		expect(create).not.toHaveBeenCalled();
	});

	it("refuses a video over 20 MB", async () => {
		const response = await POST(videoRequest({ size: 20 * 1024 * 1024 + 1 }));

		expect(response.status).toBe(413);
		expect((await response.json()).error).toBe(
			"That video is too large. The limit is 20 MB.",
		);
		expect(create).not.toHaveBeenCalled();
	});

	it("refuses a kind of video that can't be played everywhere", async () => {
		const response = await POST(videoRequest({ name: "clip.avi" }));

		expect(response.status).toBe(415);
		expect((await response.json()).error).toBe(
			"That kind of video can't be shared here. Try an MP4, MOV or WebM file.",
		);
		expect(create).not.toHaveBeenCalled();
	});

	it("refuses a member who has reached the daily limit, in its own words", async () => {
		count.mockImplementation(({ where }) => (where.userId ? 30 : 0));

		const response = await POST(videoRequest());

		expect(response.status).toBe(429);
		expect((await response.json()).error).toBe(
			"You've reached today's upload limit. Try again tomorrow.",
		);
		expect(create).not.toHaveBeenCalled();
		expect(after).not.toHaveBeenCalled();
	});

	it("refuses when the club has reached its 30-day limit", async () => {
		count.mockImplementation(({ where }) => (where.userId ? 0 : 1500));

		const response = await POST(videoRequest());

		expect(response.status).toBe(429);
		expect((await response.json()).error).toBe(
			"The club has reached its upload limit for now. Try again later.",
		);
		expect(create).not.toHaveBeenCalled();
	});

	it("refuses a video that would fill the club's storage, and cleans up", async () => {
		aggregate.mockImplementation(({ where }) => ({
			_sum: { size: where?.contentType ? 0 : 790 * 1024 * 1024 },
		}));

		const response = await POST(videoRequest({ size: 11 * 1024 * 1024 }));

		expect(response.status).toBe(507);
		expect((await response.json()).error).toBe(
			"The club's file storage is full. An admin can make room by deleting old messages with photos, files or videos.",
		);
		expect(create).not.toHaveBeenCalled();
		expect(after).toHaveBeenCalledOnce();
	});

	it("refuses a video that would fill the club's video storage, and cleans up", async () => {
		aggregate.mockResolvedValue({ _sum: { size: 490 * 1024 * 1024 } });

		const response = await POST(videoRequest({ size: 11 * 1024 * 1024 }));

		expect(response.status).toBe(507);
		expect((await response.json()).error).toBe(
			"The club's video storage is full. An admin can make room by deleting old messages with videos.",
		);
		expect(create).not.toHaveBeenCalled();
		expect(after).toHaveBeenCalledOnce();
	});

	it("counts every video row, pending ones included", async () => {
		await POST(videoRequest());

		expect(aggregate).toHaveBeenCalledWith({
			where: { contentType: { not: null } },
			_sum: { size: true },
		});
	});

	it.each([
		"clip.constructor",
		"clip.valueOf",
		"clip.hasOwnProperty",
	])("refuses %s as an unknown kind of video, not a failure", async (name) => {
		const response = await POST(videoRequest({ name }));

		expect(response.status).toBe(415);
		expect(create).not.toHaveBeenCalled();
	});

	it("writes a pending row at a pathname the server chose", async () => {
		const response = await POST(
			videoRequest({ name: " Regatta\u0000 start.MOV ", durationMs: 41000 }),
		);
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(create).toHaveBeenCalledWith({
			data: {
				userId,
				url: body.pathname,
				size: 5 * 1024 * 1024,
				name: "Regatta start.MOV",
				contentType: "video/mp4",
				durationMs: 41000,
				pending: true,
			},
		});
		expect(body.pathname).toMatch(
			/^uploads\/user_123\/video-[0-9a-f-]{36}\.mov$/,
		);
		expect(body).toMatchObject({ id: "upl_video", contentType: "video/mp4" });
		expect(after).toHaveBeenCalledOnce();
	});

	it("saves the clip's pixel size", async () => {
		await POST(videoRequest({ width: 1080, height: 1920 }));

		expect(create.mock.calls[0][0].data).toMatchObject({
			width: 1080,
			height: 1920,
		});
	});

	it("refuses a pixel size no clip has", async () => {
		const response = await POST(videoRequest({ width: 0, height: 20_000 }));

		expect(response.status).toBe(400);
		expect(create).not.toHaveBeenCalled();
	});

	it("stores a WebM as video/webm", async () => {
		const body = await (await POST(videoRequest({ name: "erg.webm" }))).json();

		expect(body.contentType).toBe("video/webm");
		expect(create.mock.calls[0][0].data.contentType).toBe("video/webm");
	});

	it("grants an upload of only that file, type and size, for 15 minutes", async () => {
		const before = Date.now();

		const body = await (await POST(videoRequest())).json();
		const payload = getPayloadFromClientToken(body.clientToken);

		expect(body.clientToken).toMatch(/^vercel_blob_client_teststore_/);
		expect(payload).toMatchObject({
			pathname: body.pathname,
			allowedContentTypes: ["video/mp4"],
			maximumSizeInBytes: 5 * 1024 * 1024,
			addRandomSuffix: false,
		});
		expect(Math.abs(payload.validUntil - before - 15 * 60 * 1000)).toBeLessThan(
			5000,
		);
		expect(JSON.stringify(payload)).not.toContain("secret");
	});
});

function videoRequest({
	name = "clip.mp4",
	size = 5 * 1024 * 1024,
	durationMs,
	width,
	height,
}: {
	name?: string;
	size?: number;
	durationMs?: number;
	width?: number;
	height?: number;
} = {}) {
	return new Request("http://localhost/api/v1/uploads/video", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name, size, durationMs, width, height }),
	});
}
