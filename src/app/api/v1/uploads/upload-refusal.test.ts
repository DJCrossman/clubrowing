import { describe, expect, it, vi } from "vitest";
import type { Context } from "@/server/domain/common/context";

vi.mock("@/lib/env", () => ({ envVars: { MEMBER_DAILY_UPLOAD_LIMIT: 30 } }));

const { findUploadRefusal } = await import("./upload-refusal");

describe("findUploadRefusal", () => {
	it("lets a member store a file that fits", async () => {
		const db = uploads({ storedBytes: 100 * 1024 * 1024 });

		expect(await findUploadRefusal({ db, userId: "user_1", size: 1 })).toBe(
			null,
		);
	});

	it("names the member's daily count first", async () => {
		const db = uploads({ memberUploads: 30, clubUploads: 1500 });

		expect(await findUploadRefusal({ db, userId: "user_1", size: 1 })).toBe(
			"member-daily-count",
		);
	});

	it("names the club's 30-day count", async () => {
		const db = uploads({ clubUploads: 1500 });

		expect(await findUploadRefusal({ db, userId: "user_1", size: 1 })).toBe(
			"club-monthly-count",
		);
	});

	it("names stored bytes, summed over every row, pending videos included", async () => {
		const db = uploads({ storedBytes: 800 * 1024 * 1024 });

		expect(await findUploadRefusal({ db, userId: "user_1", size: 1 })).toBe(
			"stored-bytes",
		);
		expect(db.upload.aggregate).toHaveBeenCalledWith({ _sum: { size: true } });
	});
});

function uploads({
	memberUploads = 0,
	clubUploads = 0,
	storedBytes = 0,
}: {
	memberUploads?: number;
	clubUploads?: number;
	storedBytes?: number;
}) {
	return {
		upload: {
			count: vi.fn(async ({ where }: { where: { userId?: string } }) =>
				where.userId ? memberUploads : clubUploads,
			),
			aggregate: vi.fn(async () => ({ _sum: { size: storedBytes } })),
		},
	} as unknown as Context["db"] & {
		upload: { aggregate: ReturnType<typeof vi.fn> };
	};
}
