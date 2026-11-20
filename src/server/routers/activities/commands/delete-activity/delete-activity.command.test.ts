import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "@/server/context";

const del = vi.fn();

vi.mock("@vercel/blob", () => ({ del }));

const { deleteActivityCommand } = await import("./delete-activity.command");

describe("deleteActivityCommand", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("removes the screenshot's file and row with the activity", async () => {
		const { db, ctx } = createContext({
			screenshot: { id: "upl_1", url: "https://storage.test/photo.webp" },
		});

		await deleteActivityCommand({ id: "act_1" }, ctx);

		expect(db.activity.delete).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: "act_1" } }),
		);
		expect(del).toHaveBeenCalledWith(["https://storage.test/photo.webp"]);
		expect(db.upload.deleteMany).toHaveBeenCalledWith({
			where: { id: { in: ["upl_1"] } },
		});
	});

	it("deletes an activity without a screenshot and touches no storage", async () => {
		const { db, ctx } = createContext({ screenshot: null });

		await deleteActivityCommand({ id: "act_1" }, ctx);

		expect(db.activity.delete).toHaveBeenCalled();
		expect(del).not.toHaveBeenCalled();
		expect(db.upload.deleteMany).not.toHaveBeenCalled();
	});

	it("still resolves when removing the screenshot fails", async () => {
		const { ctx } = createContext({
			screenshot: { id: "upl_1", url: "https://storage.test/photo.webp" },
		});
		del.mockRejectedValue(new Error("storage down"));
		vi.spyOn(console, "error").mockImplementation(() => {});

		await expect(
			deleteActivityCommand({ id: "act_1" }, ctx),
		).resolves.toBeUndefined();
	});
});

function createContext({
	screenshot,
}: {
	screenshot: { id: string; url: string } | null;
}) {
	const db = {
		activity: { delete: vi.fn(async () => ({ screenshot })) },
		upload: { deleteMany: vi.fn(async () => ({ count: 1 })) },
	};
	return { db, ctx: { db } as unknown as Context };
}
