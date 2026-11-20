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
const aggregate = vi.fn();
const findMany = vi.fn();
const findFirst = vi.fn();
const deleteMany = vi.fn();
const after = vi.fn();

vi.mock("@/lib/env", () => ({ envVars: env }));
vi.mock("@/lib/auth", () => ({ requireAuth }));
vi.mock("@vercel/blob", () => ({ put, del }));
vi.mock("@/lib/db", () => ({
	db: {
		upload: { count, create, aggregate, findMany, findFirst, deleteMany },
	},
}));
vi.mock("next/server", async (importOriginal) => ({
	...(await importOriginal<typeof import("next/server")>()),
	after,
}));

const { POST } = await import("./route");

const userId = "user_123";

describe("POST /api/v1/uploads", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		env.BLOB_READ_WRITE_TOKEN = "blob-token";
		requireAuth.mockResolvedValue(userId);
		count.mockResolvedValue(0);
		aggregate.mockResolvedValue({ _sum: { size: null } });
		put.mockResolvedValue({ url: "https://storage.test/uploads/photo.webp" });
		create.mockResolvedValue({ id: "upl_1" });
		findMany.mockResolvedValue([]);
		findFirst.mockResolvedValue({ id: "upl_file" });
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

	it("refuses an empty file", async () => {
		const response = await POST(
			uploadRequest(Buffer.alloc(0), { name: "empty.txt", kind: "file" }),
		);

		expect(response.status).toBe(400);
		expect(put).not.toHaveBeenCalled();
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

	it("refuses an upload that would fill the club's storage", async () => {
		aggregate.mockResolvedValue({ _sum: { size: 800 * 1024 * 1024 - 10 } });

		const response = await POST(
			uploadRequest(Buffer.from("eleven byte"), {
				name: "notes.txt",
				kind: "file",
			}),
		);

		expect(response.status).toBe(507);
		expect((await response.json()).error).toContain(
			"deleting old messages with photos or files",
		);
		expect(put).not.toHaveBeenCalled();
	});

	it("accepts an upload that still fits in the club's storage", async () => {
		aggregate.mockResolvedValue({ _sum: { size: 800 * 1024 * 1024 - 11 } });

		const response = await POST(
			uploadRequest(Buffer.from("eleven byte"), {
				name: "notes.txt",
				kind: "file",
			}),
		);

		expect(response.status).toBe(200);
		expect(put).toHaveBeenCalled();
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

	it("shrinks a photo to a long edge of 2560 pixels", async () => {
		await POST(uploadRequest(await png(3000, 2000)));

		const [, stored] = put.mock.calls[0];
		const metadata = await sharp(stored).metadata();
		expect(metadata.width).toBe(2560);
		expect(metadata.height).toBeLessThan(2560);
	});

	it("keeps a photo under the size cap at its full size", async () => {
		await POST(uploadRequest(await png(1200, 800)));

		const [, stored] = put.mock.calls[0];
		const metadata = await sharp(stored).metadata();
		expect(metadata.width).toBe(1200);
		expect(metadata.height).toBe(800);
	});

	it("stores a screenshot as a private WebP no bigger than 800 pixels", async () => {
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
		expect(metadata.width).toBeLessThanOrEqual(800);
		expect(metadata.height).toBeLessThanOrEqual(800);
		expect(create).toHaveBeenCalledWith({
			data: {
				userId,
				url: "https://storage.test/uploads/photo.webp",
				size: stored.length,
			},
		});
	});

	it("records no name for a photo", async () => {
		await POST(uploadRequest(await png(10, 10), { name: "boats.png" }));

		expect(create.mock.calls[0][0].data).not.toHaveProperty("name");
	});

	it("stores a file unchanged as a private download and records its name", async () => {
		const pdf = Buffer.from("%PDF-1.7\n\u0000\u00ffregatta entries");

		const response = await POST(
			uploadRequest(pdf, {
				name: "Regatta entries.pdf",
				type: "application/pdf",
				kind: "file",
			}),
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ id: "upl_1" });
		const [pathname, stored, options] = put.mock.calls[0];
		expect(pathname.startsWith(`uploads/${userId}/`)).toBe(true);
		expect(Buffer.compare(stored, pdf)).toBe(0);
		expect(options).toMatchObject({
			access: "private",
			addRandomSuffix: true,
			contentType: "application/octet-stream",
		});
		expect(create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				size: pdf.length,
				name: "Regatta entries.pdf",
			}),
		});
	});

	it("makes an unsafe file name safe", async () => {
		await POST(
			uploadRequest(Buffer.from("minutes"), {
				name: `../../etc\\ra\u0000ce\u0007  minutes\t${"x".repeat(200)}.txt`,
				kind: "file",
			}),
		);

		const { name } = create.mock.calls[0][0].data;
		expect(name).not.toMatch(/[/\\\p{Cc}\p{Cf}]/u);
		expect(name).not.toMatch(/\s{2}/);
		expect(name.length).toBeLessThanOrEqual(120);
		expect(name).toContain("race minutes");
	});

	it("strips the direction controls that disguise an extension", async () => {
		// The test DOM's multipart encoding mangles non-ASCII names, so the form
		// reaches the route directly.
		const formData = new FormData();
		formData.append(
			"file",
			new File(["minutes"], "minutes\u202Efdp.txt\u2066\u200F"),
		);
		formData.append("kind", "file");

		await POST({ formData: async () => formData } as Request);

		expect(create.mock.calls[0][0].data.name).toBe("minutesfdp.txt");
	});

	it("refuses a program by its name", async () => {
		const response = await POST(
			uploadRequest(Buffer.from("setup"), { name: "Setup.EXE", kind: "file" }),
		);

		expect(response.status).toBe(400);
		expect((await response.json()).error).toBe(
			"Programs, scripts and web pages can't be shared here.",
		);
		expect(put).not.toHaveBeenCalled();
	});

	it.each([
		["a program", Buffer.from("MZ\u0090\u0000program"), "minutes.pdf"],
		["a shebang script", Buffer.from("#!/bin/sh\nrm -rf ~"), "minutes.txt"],
		["a web page by name", Buffer.from("Regatta results"), "results.html"],
		[
			"a web page under a text name",
			Buffer.from("\uFEFF  \n<!DOCTYPE HTML><p>results</p>"),
			"results.txt",
		],
		[
			"an SVG behind an XML declaration",
			Buffer.from(
				'<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"/>',
			),
			"logo.txt",
		],
	])("refuses %s", async (_, bytes, name) => {
		const response = await POST(uploadRequest(bytes, { name, kind: "file" }));

		expect(response.status).toBe(400);
		expect(put).not.toHaveBeenCalled();
	});

	it.each([
		["a PDF", Buffer.from("%PDF-1.7\nregatta entries"), "entries.pdf"],
		["a plain text file", Buffer.from("Boats out at 6"), "notes.txt"],
		[
			"a ZIP",
			Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]),
			"photos.zip",
		],
	])("accepts %s", async (_, bytes, name) => {
		const response = await POST(uploadRequest(bytes, { name, kind: "file" }));

		expect(response.status).toBe(200);
		expect(put).toHaveBeenCalled();
	});

	it("refuses a JPEG sent as a file", async () => {
		const jpeg = await sharp({
			create: { width: 40, height: 30, channels: 3, background: "#336699" },
		})
			.jpeg()
			.toBuffer();

		const response = await POST(
			uploadRequest(jpeg, { name: "boats.dat", kind: "file" }),
		);

		expect(response.status).toBe(400);
		expect((await response.json()).error).toContain("as a photo");
		expect(put).not.toHaveBeenCalled();
	});

	it("refuses a HEIC name sent as a file", async () => {
		const response = await POST(
			uploadRequest(Buffer.from("not decodable"), {
				name: "IMG_0001.HEIC",
				kind: "file",
			}),
		);

		expect(response.status).toBe(400);
		expect((await response.json()).error).toContain("as a photo");
	});

	it("cuts a long name between whole characters", async () => {
		const formData = new FormData();
		formData.append(
			"file",
			new File(["minutes"], `${"x".repeat(119)}\u{1F6A3} regatta minutes.txt`),
		);
		formData.append("kind", "file");

		await POST({ formData: async () => formData } as Request);

		const { name } = create.mock.calls[0][0].data;
		expect(name.isWellFormed()).toBe(true);
		expect(() => encodeURIComponent(name)).not.toThrow();
		expect([...name].length).toBeLessThanOrEqual(120);
	});

	it("refuses a disk image and a compressed SVG by name", async () => {
		const iso = await POST(
			uploadRequest(Buffer.from("plain bytes"), {
				name: "installer.iso",
				kind: "file",
			}),
		);
		const svgz = await POST(
			uploadRequest(Buffer.from("plain bytes"), {
				name: "logo.svgz",
				kind: "file",
			}),
		);

		expect(iso.status).toBe(400);
		expect(svgz.status).toBe(400);
		expect(put).not.toHaveBeenCalled();
	});

	it("names a file whose name is nothing but unsafe characters", async () => {
		await POST(
			uploadRequest(Buffer.from("minutes"), { name: "/\u0007/", kind: "file" }),
		);

		expect(create.mock.calls[0][0].data.name).toBe("file");
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

	it("stores a preview of the member's own unattached file as a photo no bigger than 720 pixels", async () => {
		const response = await POST(
			uploadRequest(await png(1600, 1200), {
				kind: "preview",
				previewOf: "upl_file",
			}),
		);

		expect(response.status).toBe(200);
		expect(findFirst).toHaveBeenCalledWith({
			where: {
				id: "upl_file",
				userId,
				name: { not: null },
				messageId: null,
				activity: null,
				preview: null,
			},
			select: { id: true },
		});
		const [pathname, stored, options] = put.mock.calls[0];
		expect(pathname).toBe(`uploads/${userId}/photo.webp`);
		expect(options).toMatchObject({
			access: "private",
			contentType: "image/webp",
		});
		const metadata = await sharp(stored).metadata();
		expect(metadata.format).toBe("webp");
		expect(metadata.width).toBe(720);
		expect(metadata.height).toBe(540);
		expect(create).toHaveBeenCalledWith({
			data: {
				userId,
				url: "https://storage.test/uploads/photo.webp",
				size: stored.length,
				previewOfId: "upl_file",
			},
		});
	});

	it("refuses a preview that names no file", async () => {
		const response = await POST(
			uploadRequest(await png(10, 10), { kind: "preview" }),
		);

		expect(response.status).toBe(400);
		expect((await response.json()).error).toBe(
			"That preview can't be added. Try adding the file again.",
		);
		expect(findFirst).not.toHaveBeenCalled();
		expect(put).not.toHaveBeenCalled();
		expect(create).not.toHaveBeenCalled();
	});

	it("refuses a preview of a file the member can't add one to", async () => {
		// The lookup above only finds the member's own unattached file without a
		// preview, so another member's file, a photo, an attached file and a file
		// that already has one all come back empty.
		findFirst.mockResolvedValue(null);

		const response = await POST(
			uploadRequest(await png(10, 10), {
				kind: "preview",
				previewOf: "upl_file",
			}),
		);

		expect(response.status).toBe(400);
		expect(put).not.toHaveBeenCalled();
		expect(create).not.toHaveBeenCalled();
	});

	it("checks the limits before looking up a preview's file", async () => {
		count.mockImplementation(({ where }) => (where.userId ? 30 : 0));

		const response = await POST(
			uploadRequest(await png(10, 10), {
				kind: "preview",
				previewOf: "upl_file",
			}),
		);

		expect(response.status).toBe(429);
		expect(findFirst).not.toHaveBeenCalled();
	});

	it("removes the stored photo when its row cannot be saved", async () => {
		create.mockRejectedValue(new Error("database unavailable"));
		vi.spyOn(console, "error").mockImplementation(() => {});

		const response = await POST(uploadRequest(await png(10, 10)));

		expect(response.status).toBe(500);
		expect(del).toHaveBeenCalledWith("https://storage.test/uploads/photo.webp");
	});

	it("removes orphaned photos after a successful upload", async () => {
		findMany.mockResolvedValueOnce([
			{ id: "upl_old", url: "https://storage.test/uploads/old.webp" },
			{ id: "upl_gone", url: "https://storage.test/uploads/gone.webp" },
		]);

		const response = await POST(uploadRequest(await png(10, 10)));
		await after.mock.calls[0][0]();

		expect(response.status).toBe(200);
		expect(findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					OR: [
						expect.objectContaining({
							messageId: null,
							activity: null,
							previewOf: null,
						}),
						{ message: { deletedAt: { not: null } } },
					],
				},
			}),
		);
		expect(del).toHaveBeenCalledWith([
			"https://storage.test/uploads/old.webp",
			"https://storage.test/uploads/gone.webp",
		]);
		expect(deleteMany).toHaveBeenCalledWith({
			where: { id: { in: ["upl_old", "upl_gone"] } },
		});
	});

	it("removes the previews of orphaned files with them", async () => {
		findMany
			.mockResolvedValueOnce([
				{ id: "upl_old", url: "https://storage.test/uploads/old" },
			])
			.mockResolvedValueOnce([
				{ id: "upl_preview", url: "https://storage.test/uploads/preview.webp" },
			]);

		await POST(uploadRequest(await png(10, 10)));
		await after.mock.calls[0][0]();

		expect(findMany).toHaveBeenLastCalledWith({
			where: { previewOfId: { in: ["upl_old"] } },
			select: { id: true, url: true },
		});
		expect(del).toHaveBeenCalledWith([
			"https://storage.test/uploads/old",
			"https://storage.test/uploads/preview.webp",
		]);
		expect(deleteMany).toHaveBeenCalledWith({
			where: { id: { in: ["upl_old", "upl_preview"] } },
		});
		expect(findMany.mock.invocationCallOrder[1]).toBeLessThan(
			deleteMany.mock.invocationCallOrder[0],
		);
	});

	it("still answers 200 when removing orphaned photos fails", async () => {
		findMany.mockRejectedValue(new Error("database unavailable"));
		vi.spyOn(console, "error").mockImplementation(() => {});

		const response = await POST(uploadRequest(await png(10, 10)));
		await after.mock.calls[0][0]();

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ id: "upl_1" });
		expect(console.error).toHaveBeenCalled();
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
		previewOf,
	}: { name?: string; type?: string; kind?: string; previewOf?: string } = {},
) {
	const formData = new FormData();
	formData.append("file", new File([new Uint8Array(bytes)], name, { type }));
	if (kind) {
		formData.append("kind", kind);
	}
	if (previewOf) {
		formData.append("previewOf", previewOf);
	}
	return new Request("http://localhost/api/v1/uploads", {
		method: "POST",
		body: formData,
	});
}
