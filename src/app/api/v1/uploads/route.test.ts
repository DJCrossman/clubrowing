import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

const env = {
	BLOB_READ_WRITE_TOKEN: "blob-token" as string | undefined,
	MEMBER_DAILY_UPLOAD_LIMIT: 30,
};
const requireAuth = vi.fn();
const put = vi.fn();
const del = vi.fn();
const count = vi.fn();
const create = vi.fn();

vi.mock("@/lib/env", () => ({ envVars: env }));
vi.mock("@/lib/auth", () => ({ requireAuth }));
vi.mock("@vercel/blob", () => ({ put, del }));
vi.mock("@/lib/db", () => ({ db: { upload: { count, create } } }));

const { POST } = await import("./route");

const userId = "user_123";

describe("POST /api/v1/uploads", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		env.BLOB_READ_WRITE_TOKEN = "blob-token";
		requireAuth.mockResolvedValue(userId);
		count.mockResolvedValue(0);
		put.mockResolvedValue({ url: "https://storage.test/uploads/photo.webp" });
		create.mockResolvedValue({ id: "upl_1" });
	});

	it("rejects a signed-out request", async () => {
		requireAuth.mockRejectedValue(new Error("Unauthorized"));

		const response = await POST(uploadRequest(await png(10, 10)));

		expect(response.status).toBe(401);
	});

	it("refuses when photo storage is not configured", async () => {
		env.BLOB_READ_WRITE_TOKEN = undefined;

		const response = await POST(uploadRequest(await png(10, 10)));

		expect(response.status).toBe(503);
		expect((await response.json()).error).toBeTruthy();
	});

	it("refuses a request without a file", async () => {
		const response = await POST(
			new Request("http://localhost/api/v1/uploads", {
				method: "POST",
				body: new FormData(),
			}),
		);

		expect(response.status).toBe(400);
	});

	it("refuses a request that is not a form upload", async () => {
		const response = await POST(
			new Request("http://localhost/api/v1/uploads", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ file: "photo.png" }),
			}),
		);

		expect(response.status).toBe(400);
	});

	it("refuses a file over 4 MB", async () => {
		const response = await POST(
			uploadRequest(Buffer.alloc(4 * 1024 * 1024 + 1)),
		);

		expect(response.status).toBe(413);
		expect(put).not.toHaveBeenCalled();
	});

	it("refuses a member who has reached the daily limit", async () => {
		count.mockImplementation(({ where }) => (where.userId ? 30 : 0));

		const response = await POST(uploadRequest(await png(10, 10)));

		expect(response.status).toBe(429);
		expect((await response.json()).error).toContain("today");
		expect(put).not.toHaveBeenCalled();
	});

	it("refuses when the club has reached its 30-day limit", async () => {
		count.mockImplementation(({ where }) => (where.userId ? 0 : 1500));

		const response = await POST(uploadRequest(await png(10, 10)));

		expect(response.status).toBe(429);
		expect((await response.json()).error).toContain("club");
		expect(put).not.toHaveBeenCalled();
	});

	it("refuses a text file posing as a PNG", async () => {
		const response = await POST(uploadRequest(Buffer.from("not a photo")));

		expect(response.status).toBe(400);
		expect(put).not.toHaveBeenCalled();
	});

	it("refuses an SVG", async () => {
		const svg = Buffer.from(
			'<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',
		);

		const response = await POST(
			uploadRequest(svg, { name: "photo.svg", type: "image/svg+xml" }),
		);

		expect(response.status).toBe(400);
		expect(put).not.toHaveBeenCalled();
	});

	it("keeps a photo at its full size", async () => {
		await POST(uploadRequest(await png(3000, 2000)));

		const [, stored] = put.mock.calls[0];
		const metadata = await sharp(stored).metadata();
		expect(metadata.width).toBe(3000);
		expect(metadata.height).toBe(2000);
	});

	it("stores a screenshot as a private WebP no bigger than 1600 pixels", async () => {
		const response = await POST(
			uploadRequest(await png(3000, 2000), { kind: "screenshot" }),
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ id: "upl_1" });
		const [pathname, stored, options] = put.mock.calls[0];
		expect(pathname.startsWith(`uploads/${userId}/`)).toBe(true);
		expect(options).toMatchObject({
			access: "private",
			contentType: "image/webp",
		});
		const metadata = await sharp(stored).metadata();
		expect(metadata.format).toBe("webp");
		expect(metadata.width).toBeLessThanOrEqual(1600);
		expect(metadata.height).toBeLessThanOrEqual(1600);
		expect(create).toHaveBeenCalledWith({
			data: {
				userId,
				url: "https://storage.test/uploads/photo.webp",
				size: stored.length,
			},
		});
	});

	it("drops EXIF data from a JPEG", async () => {
		const jpeg = await sharp({
			create: { width: 40, height: 30, channels: 3, background: "#336699" },
		})
			.jpeg()
			.withExif({ IFD0: { Copyright: "Regina Rowing Club" } })
			.toBuffer();
		expect((await sharp(jpeg).metadata()).exif).toBeDefined();

		const response = await POST(
			uploadRequest(jpeg, { name: "photo.jpg", type: "image/jpeg" }),
		);

		expect(response.status).toBe(200);
		const [, stored] = put.mock.calls[0];
		expect((await sharp(stored).metadata()).exif).toBeUndefined();
	});

	it("turns a sideways photo upright before dropping its orientation", async () => {
		const sideways = await sharp({
			create: { width: 40, height: 20, channels: 3, background: "#336699" },
		})
			.jpeg()
			.withMetadata({ orientation: 6 })
			.toBuffer();

		await POST(
			uploadRequest(sideways, { name: "photo.jpg", type: "image/jpeg" }),
		);

		const [, stored] = put.mock.calls[0];
		const metadata = await sharp(stored).metadata();
		expect(metadata.width).toBe(20);
		expect(metadata.height).toBe(40);
	});

	it("removes the stored photo when its row cannot be saved", async () => {
		create.mockRejectedValue(new Error("database unavailable"));
		vi.spyOn(console, "error").mockImplementation(() => {});

		const response = await POST(uploadRequest(await png(10, 10)));

		expect(response.status).toBe(500);
		expect(del).toHaveBeenCalledWith("https://storage.test/uploads/photo.webp");
	});
});

async function png(width: number, height: number) {
	return sharp({
		create: { width, height, channels: 3, background: "#336699" },
	})
		.png()
		.toBuffer();
}

function uploadRequest(
	bytes: Buffer,
	{
		name = "photo.png",
		type = "image/png",
		kind,
	}: { name?: string; type?: string; kind?: string } = {},
) {
	const formData = new FormData();
	formData.append("file", new File([new Uint8Array(bytes)], name, { type }));
	if (kind) {
		formData.append("kind", kind);
	}
	return new Request("http://localhost/api/v1/uploads", {
		method: "POST",
		body: formData,
	});
}
