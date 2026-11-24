import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedContext } from "@/server/context";

const del = vi.fn();

vi.mock("@vercel/blob", () => ({ del }));

const { deleteActivityCommand } = await import("./delete-activity.command");
const { deleteActivityMemberCommand } = await import(
	"./delete-activity.member.command"
);

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

describe("deleteActivityMemberCommand", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deletes the member's own activity", async () => {
		const { db, ctx } = createContext({ screenshot: null });

		await deleteActivityMemberCommand({ id: "act_1" }, ctx);

		expect(db.activity.delete).toHaveBeenCalled();
	});

	it("refuses an activity that does not exist", async () => {
		const { db, ctx } = createContext({ screenshot: null, existing: null });

		await expect(
			deleteActivityMemberCommand({ id: "act_1" }, ctx),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
			message: "Activity not found",
		});
		expect(db.activity.delete).not.toHaveBeenCalled();
	});

	it("refuses another athlete's activity", async () => {
		const { db, ctx } = createContext({
			screenshot: null,
			existing: { athleteId: "ath_other" },
		});

		await expect(
			deleteActivityMemberCommand({ id: "act_1" }, ctx),
		).rejects.toMatchObject({
			code: "FORBIDDEN",
			message: "Cannot delete another athlete's activity",
		});
		expect(db.activity.delete).not.toHaveBeenCalled();
	});
});

function createContext({
	screenshot,
	existing = { athleteId: "ath_me" },
}: {
	screenshot: { id: string; url: string } | null;
	existing?: { athleteId: string } | null;
}) {
	const db = {
		activity: {
			findUnique: vi.fn(async () => existing),
			delete: vi.fn(async () => ({ screenshot })),
		},
		upload: {
			findMany: vi.fn(async () => []),
			deleteMany: vi.fn(async () => ({ count: 1 })),
		},
	};
	return {
		db,
		ctx: { db, athlete: { id: "ath_me" } } as unknown as AuthenticatedContext,
	};
}
