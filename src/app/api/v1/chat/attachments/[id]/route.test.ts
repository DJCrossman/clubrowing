import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DomainError } from "@/server/domain/common/domain-error";

const env = {
	BLOB_READ_WRITE_TOKEN: "blob-token" as string | undefined,
};
const get = vi.fn();
const findAccessibleMessage = vi.fn();
const db = {
	athlete: { findUnique: vi.fn() },
	upload: { findUnique: vi.fn() },
};
const createRequestContext = vi.fn();

vi.mock("@/lib/env", () => ({ envVars: env }));
vi.mock("@vercel/blob", () => ({ get }));
vi.mock("@/server/infra/trpc/request-context", () => ({
	createRequestContext,
}));
vi.mock("@/server/domain/chat/common/chat-access", () => ({
	findAccessibleMessage,
}));

const { GET } = await import("./route");

const user = { id: "user_123", isAdmin: false };
const storedUrl = "https://storage.test/uploads/user_123/photo-abc.webp";

describe("GET /api/v1/chat/attachments/[id]", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		env.BLOB_READ_WRITE_TOKEN = "blob-token";
		createRequestContext.mockResolvedValue({ user, db });
		db.athlete.findUnique.mockResolvedValue({ id: "ath_1", memberships: [] });
		db.upload.findUnique.mockResolvedValue({
			url: storedUrl,
			name: null,
			messageId: "msg_1",
		});
		findAccessibleMessage.mockResolvedValue({ id: "msg_1", deletedAt: null });
		get.mockResolvedValue({
			statusCode: 200,
			stream: new Blob([new Uint8Array([1, 2, 3])]).stream(),
			headers: new Headers(),
			blob: { contentType: "image/webp", etag: '"etag-1"' },
		});
	});

	it("rejects a signed-out request", async () => {
		createRequestContext.mockResolvedValue({ user: null, db });

		const response = await GET(...photoRequest());

		expect(response.status).toBe(401);
		expect(get).not.toHaveBeenCalled();
	});

	it("refuses when photo storage is not configured", async () => {
		env.BLOB_READ_WRITE_TOKEN = undefined;

		const response = await GET(...photoRequest());

		expect(response.status).toBe(503);
		expect((await response.json()).error).toBeTruthy();
	});

	it("hides a photo from someone who is neither an athlete nor an admin", async () => {
		db.athlete.findUnique.mockResolvedValue(null);

		await expectUnavailable(await GET(...photoRequest()));
	});

	it("answers 404 for an unknown photo", async () => {
		db.upload.findUnique.mockResolvedValue(null);

		await expectUnavailable(await GET(...photoRequest()));
	});

	it("answers 404 for a photo that is not attached to a message", async () => {
		db.upload.findUnique.mockResolvedValue({ url: storedUrl, messageId: null });

		await expectUnavailable(await GET(...photoRequest()));
	});

	it("answers 404 when the viewer cannot read the message", async () => {
		findAccessibleMessage.mockRejectedValue(
			new DomainError("NOT_FOUND", "Message not found"),
		);

		await expectUnavailable(await GET(...photoRequest()));
	});

	it("answers 404 for a photo on a deleted message", async () => {
		findAccessibleMessage.mockResolvedValue({
			id: "msg_1",
			deletedAt: new Date(),
		});

		await expectUnavailable(await GET(...photoRequest()));
	});

	it("answers 404 for a video, which only plays from storage", async () => {
		db.upload.findUnique.mockResolvedValue({
			url: "https://storage.test/uploads/user_123/video-abc.mp4",
			name: "Regatta.mp4",
			contentType: "video/mp4",
			pending: false,
			messageId: "msg_1",
		});

		await expectUnavailable(await GET(...photoRequest()));
		expect(get).not.toHaveBeenCalled();
	});

	it("answers 404 when the stored file is missing", async () => {
		get.mockResolvedValue(null);

		await expectUnavailable(await GET(...photoRequest()));
	});

	it("returns the photo with a private cache header", async () => {
		const response = await GET(...photoRequest());

		expect(response.status).toBe(200);
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(
			new Uint8Array([1, 2, 3]),
		);
		expect(response.headers.get("Content-Type")).toBe("image/webp");
		expect(response.headers.get("ETag")).toBeTruthy();
		expect(response.headers.get("Cache-Control")).toContain("private");
		expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
		expect(get).toHaveBeenCalledWith(
			storedUrl,
			expect.objectContaining({ access: "private" }),
		);
		expect(findAccessibleMessage).toHaveBeenCalledWith(db, "msg_1", user);
	});

	it("lets an admin without an athlete see a photo", async () => {
		createRequestContext.mockResolvedValue({
			user: { ...user, isAdmin: true },
			db,
		});
		db.athlete.findUnique.mockResolvedValue(null);

		const response = await GET(...photoRequest());

		expect(response.status).toBe(200);
	});

	it("answers 304 when the browser already has the photo", async () => {
		get.mockResolvedValue({
			statusCode: 304,
			stream: null,
			headers: new Headers(),
			blob: { contentType: null, etag: '"etag-1"' },
		});

		const response = await GET(
			...photoRequest({ headers: { "If-None-Match": '"etag-1"' } }),
		);

		expect(response.status).toBe(304);
		expect(get).toHaveBeenCalledWith(storedUrl, {
			access: "private",
			ifNoneMatch: '"etag-1"',
		});
	});

	it("returns a thumbnail no bigger than 720 pixels", async () => {
		const full = await sharp({
			create: { width: 2000, height: 1500, channels: 3, background: "#336699" },
		})
			.webp()
			.toBuffer();
		get.mockResolvedValue({
			statusCode: 200,
			stream: new Blob([new Uint8Array(full)]).stream(),
			headers: new Headers(),
			blob: { contentType: "image/webp", etag: '"etag-1"' },
		});

		const response = await GET(
			...photoRequest({
				search: "?size=thumbnail",
				headers: { "If-None-Match": '"etag-1"' },
			}),
		);

		expect(response.status).toBe(200);
		const metadata = await sharp(
			Buffer.from(await response.arrayBuffer()),
		).metadata();
		expect(metadata.format).toBe("webp");
		expect(Math.max(metadata.width, metadata.height)).toBeLessThanOrEqual(720);
		expect(response.headers.get("Cache-Control")).toContain("private");
		expect(response.headers.get("ETag")).toBeNull();
		expect(get).toHaveBeenCalledWith(storedUrl, {
			access: "private",
			ifNoneMatch: undefined,
		});
	});

	it("streams the full photo for any other size", async () => {
		const response = await GET(...photoRequest({ search: "?size=large" }));

		expect(response.status).toBe(200);
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(
			new Uint8Array([1, 2, 3]),
		);
		expect(response.headers.get("ETag")).toBeTruthy();
	});

	it("sends a file only as a download that names it", async () => {
		db.upload.findUnique.mockResolvedValue({
			url: storedUrl,
			name: 'Régate "results".html',
			messageId: "msg_1",
		});

		const response = await GET(...photoRequest());

		expect(response.status).toBe(200);
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(
			new Uint8Array([1, 2, 3]),
		);
		expect(response.headers.get("Content-Type")).toBe(
			"application/octet-stream",
		);
		expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
		expect(response.headers.get("Content-Security-Policy")).toBe("sandbox");
		expect(response.headers.get("Cache-Control")).toContain("private");
		const disposition = response.headers.get("Content-Disposition") ?? "";
		expect(disposition.startsWith("attachment;")).toBe(true);
		expect(disposition).toContain('filename="R_gate _results_.html"');
		expect(disposition).toContain(
			`filename*=UTF-8''${encodeURIComponent('Régate "results".html')}`,
		);
	});

	it("still downloads a file when a thumbnail is asked for", async () => {
		db.upload.findUnique.mockResolvedValue({
			url: storedUrl,
			name: "entries.pdf",
			messageId: "msg_1",
		});

		const response = await GET(
			...photoRequest({
				search: "?size=thumbnail",
				headers: { "If-None-Match": '"etag-1"' },
			}),
		);

		expect(response.status).toBe(200);
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(
			new Uint8Array([1, 2, 3]),
		);
		expect(response.headers.get("Content-Type")).toBe(
			"application/octet-stream",
		);
		expect(response.headers.get("Content-Disposition")).toContain("attachment");
		expect(get).toHaveBeenCalledWith(storedUrl, {
			access: "private",
			ifNoneMatch: '"etag-1"',
		});
	});

	it("shows a file's preview to whoever can read the file's message", async () => {
		db.upload.findUnique.mockResolvedValue({
			url: storedUrl,
			name: null,
			messageId: null,
			previewOf: { messageId: "msg_1" },
		});

		const response = await GET(...photoRequest());

		expect(response.status).toBe(200);
		expect(new Uint8Array(await response.arrayBuffer())).toEqual(
			new Uint8Array([1, 2, 3]),
		);
		expect(response.headers.get("Content-Type")).toBe("image/webp");
		expect(response.headers.get("Content-Disposition")).toBeNull();
		expect(response.headers.get("ETag")).toBeTruthy();
		expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
		expect(findAccessibleMessage).toHaveBeenCalledWith(db, "msg_1", user);
	});

	it("answers 404 for a preview of a file that is not attached to a message", async () => {
		db.upload.findUnique.mockResolvedValue({
			url: storedUrl,
			name: null,
			messageId: null,
			previewOf: { messageId: null },
		});

		await expectUnavailable(await GET(...photoRequest()));
		expect(findAccessibleMessage).not.toHaveBeenCalled();
	});

	it("answers 404 for a preview of a file whose message was deleted", async () => {
		db.upload.findUnique.mockResolvedValue({
			url: storedUrl,
			name: null,
			messageId: null,
			previewOf: { messageId: "msg_1" },
		});
		findAccessibleMessage.mockResolvedValue({ deletedAt: new Date() });

		await expectUnavailable(await GET(...photoRequest()));
		expect(findAccessibleMessage).toHaveBeenCalledWith(db, "msg_1", user);
	});

	it("answers 404 for a preview when the viewer cannot read the file's message", async () => {
		db.upload.findUnique.mockResolvedValue({
			url: storedUrl,
			name: null,
			messageId: null,
			previewOf: { messageId: "msg_1" },
		});
		findAccessibleMessage.mockRejectedValue(
			new DomainError("NOT_FOUND", "Message not found"),
		);

		await expectUnavailable(await GET(...photoRequest()));
	});

	it("answers 500 when loading fails unexpectedly", async () => {
		get.mockRejectedValue(new Error("storage unavailable"));
		vi.spyOn(console, "error").mockImplementation(() => {});

		const response = await GET(...photoRequest());

		expect(response.status).toBe(500);
		expect((await response.json()).error).toBeTruthy();
	});
});

function photoRequest({
	headers,
	search = "",
}: {
	headers?: HeadersInit;
	search?: string;
} = {}) {
	return [
		new Request(`http://localhost/api/v1/chat/attachments/upl_1${search}`, {
			headers,
		}),
		{ params: Promise.resolve({ id: "upl_1" }) },
	] as const;
}

async function expectUnavailable(response: Response) {
	expect(response.status).toBe(404);
	expect((await response.json()).error).toBe("That file isn't available.");
}
