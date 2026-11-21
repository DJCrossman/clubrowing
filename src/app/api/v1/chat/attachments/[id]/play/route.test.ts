import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const env = {
	BLOB_READ_WRITE_TOKEN: "blob-token" as string | undefined,
};
const issueSignedToken = vi.fn();
const presignUrl = vi.fn();
const findAccessibleMessage = vi.fn();
const db = {
	athlete: { findUnique: vi.fn() },
	upload: { findUnique: vi.fn() },
	video_playback: {
		findFirst: vi.fn(),
		aggregate: vi.fn(),
		findMany: vi.fn(),
		create: vi.fn(),
	},
};
const createTRPCContext = vi.fn();

vi.mock("@/lib/env", () => ({ envVars: env }));
vi.mock("@vercel/blob", () => ({ issueSignedToken, presignUrl }));
vi.mock("@/server/context", () => ({ createTRPCContext }));
vi.mock("@/server/routers/chat/common/chat-access", () => ({
	findAccessibleMessage,
}));

const { GET } = await import("./route");

const user = { id: "user_123", isAdmin: false };
const pathname = "uploads/user_sender/video-abc.mp4";
const storedUrl = `http://127.0.0.1:13003/api/blob/blob/dummy/${pathname}`;
const signedToken = {
	delegationToken: "delegation",
	clientSigningToken: "signing",
	validUntil: 0,
};
const size = 5 * 1024 * 1024;

describe("GET /api/v1/chat/attachments/[id]/play", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		env.BLOB_READ_WRITE_TOKEN = "blob-token";
		createTRPCContext.mockResolvedValue({ user, db });
		db.athlete.findUnique.mockResolvedValue({ id: "ath_1", memberships: [] });
		db.upload.findUnique.mockResolvedValue({
			userId: "user_sender",
			url: storedUrl,
			name: "Regatta.mp4",
			size,
			contentType: "video/mp4",
			pending: false,
			messageId: "msg_1",
		});
		findAccessibleMessage.mockResolvedValue({ id: "msg_1", deletedAt: null });
		db.video_playback.findFirst.mockResolvedValue(null);
		db.video_playback.aggregate.mockResolvedValue({ _sum: { bytes: null } });
		db.video_playback.findMany.mockResolvedValue([]);
		db.video_playback.create.mockImplementation(async () => ({
			createdAt: new Date(),
		}));
		issueSignedToken.mockResolvedValue(signedToken);
		presignUrl.mockResolvedValue({
			presignedUrl: `https://store.private.blob.vercel-storage.com/${pathname}?vercel-blob-delegation=d&vercel-blob-signature=s`,
		});
	});

	it("rejects a signed-out request", async () => {
		createTRPCContext.mockResolvedValue({ user: null, db });

		const response = await GET(...playRequest());

		expect(response.status).toBe(401);
		expect(issueSignedToken).not.toHaveBeenCalled();
	});

	it("refuses when storage is not configured", async () => {
		env.BLOB_READ_WRITE_TOKEN = undefined;

		const response = await GET(...playRequest());

		expect(response.status).toBe(503);
	});

	it("answers 404 when the viewer cannot read the message", async () => {
		findAccessibleMessage.mockRejectedValue(
			new TRPCError({ code: "NOT_FOUND", message: "Message not found" }),
		);

		await expectUnavailable(await GET(...playRequest()));
	});

	it("answers 404 for a video on a deleted message", async () => {
		findAccessibleMessage.mockResolvedValue({
			id: "msg_1",
			deletedAt: new Date(),
		});

		await expectUnavailable(await GET(...playRequest()));
	});

	it("answers 404 for a photo or file", async () => {
		db.upload.findUnique.mockResolvedValue({
			userId: "user_sender",
			url: storedUrl,
			name: "Minutes.pdf",
			size,
			contentType: null,
			pending: false,
			messageId: "msg_1",
		});

		await expectUnavailable(await GET(...playRequest()));
	});

	it("answers 404 for a video that hasn't finished uploading", async () => {
		db.upload.findUnique.mockResolvedValue({
			userId: "user_sender",
			url: pathname,
			name: "Regatta.mp4",
			size,
			contentType: "video/mp4",
			pending: true,
			messageId: "msg_1",
		});

		await expectUnavailable(await GET(...playRequest()));
	});

	it("counts a play and redirects to a short-lived link that is never cached", async () => {
		const before = Date.now();

		const response = await GET(...playRequest());

		expect(response.status).toBe(302);
		expect(response.headers.get("Cache-Control")).toBe("private, no-store");
		expect(db.video_playback.create).toHaveBeenCalledWith({
			data: { uploadId: "upl_1", userId: user.id, bytes: size },
			select: { createdAt: true },
		});
		const [{ validUntil, ...tokenOptions }] = issueSignedToken.mock.calls[0];
		expect(tokenOptions).toEqual({ pathname, operations: ["get"] });
		expect(Math.abs(validUntil - before - 15 * 60 * 1000)).toBeLessThan(5000);
		expect(presignUrl).toHaveBeenCalledWith(signedToken, {
			operation: "get",
			pathname,
			access: "private",
			validUntil,
		});
	});

	it("keeps the stored URL's origin and path and carries the signature", async () => {
		const response = await GET(...playRequest());

		const link = new URL(response.headers.get("Location") ?? "");
		expect(`${link.origin}${link.pathname}`).toBe(storedUrl);
		expect(link.searchParams.get("vercel-blob-delegation")).toBe("d");
		expect(link.searchParams.get("vercel-blob-signature")).toBe("s");
		expect(link.searchParams.has("download")).toBe(false);
	});

	it("passes a download request through to the link", async () => {
		const response = await GET(...playRequest("?download=1"));

		const link = new URL(response.headers.get("Location") ?? "");
		expect(link.searchParams.get("download")).toBe("1");
	});

	it("counts the play before it signs a link", async () => {
		await GET(...playRequest());

		expect(db.video_playback.create.mock.invocationCallOrder[0]).toBeLessThan(
			issueSignedToken.mock.invocationCallOrder[0],
		);
	});

	it("does not count a replay within 10 minutes, and its link ends with the counted play's", async () => {
		const countedAt = new Date(Date.now() - 6 * 60 * 1000);
		db.video_playback.findFirst.mockResolvedValue({ createdAt: countedAt });
		const before = Date.now();

		const response = await GET(...playRequest());

		expect(response.status).toBe(302);
		expect(db.video_playback.create).not.toHaveBeenCalled();
		expect(db.video_playback.aggregate).not.toHaveBeenCalled();
		const [{ where, orderBy }] = db.video_playback.findFirst.mock.calls[0];
		expect(where).toMatchObject({ uploadId: "upl_1", userId: user.id });
		expect(orderBy).toEqual({ createdAt: "desc" });
		expect(
			Math.abs(before - 10 * 60 * 1000 - where.createdAt.gte.getTime()),
		).toBeLessThan(5000);
		expect(issueSignedToken.mock.calls[0][0].validUntil).toBe(
			countedAt.getTime() + 15 * 60 * 1000,
		);
		expect(presignUrl.mock.calls[0][1].validUntil).toBe(
			countedAt.getTime() + 15 * 60 * 1000,
		);
	});

	it("pauses playback once the last 30 days' allowance is used up", async () => {
		const oldest = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
		db.video_playback.aggregate.mockResolvedValue({
			_sum: { bytes: 6 * 1024 * 1024 * 1024 },
		});
		db.video_playback.findMany.mockResolvedValue([
			{ bytes: size, createdAt: oldest },
			{ bytes: 6 * 1024 * 1024 * 1024 - size, createdAt: new Date() },
		]);

		const response = await GET(...playRequest());

		expect(response.status).toBe(429);
		expect(await response.json()).toEqual({
			error: expect.any(String),
			resumesAt: new Date(
				oldest.getTime() + 30 * 24 * 60 * 60 * 1000,
			).toISOString(),
		});
		expect(db.video_playback.create).not.toHaveBeenCalled();
		expect(issueSignedToken).not.toHaveBeenCalled();
	});

	it("answers 500 when the link can't be signed", async () => {
		issueSignedToken.mockRejectedValue(new Error("store unavailable"));
		vi.spyOn(console, "error").mockImplementation(() => {});

		const response = await GET(...playRequest());

		expect(response.status).toBe(500);
		expect((await response.json()).error).toBeTruthy();
	});
});

function playRequest(search = "") {
	return [
		new Request(`http://localhost/api/v1/chat/attachments/upl_1/play${search}`),
		{ params: Promise.resolve({ id: "upl_1" }) },
	] as const;
}

async function expectUnavailable(response: Response) {
	expect(response.status).toBe(404);
	expect(issueSignedToken).not.toHaveBeenCalled();
	expect(db.video_playback.create).not.toHaveBeenCalled();
}
