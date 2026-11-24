import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedContext } from "@/domain/common/context";
import { attachActivityScreenshotCommand } from "./attach-activity-screenshot.command";

const input = { id: "act_1", uploadId: "upl_1" };

describe("attachActivityScreenshotCommand", () => {
	it("attaches the member's own unused upload", async () => {
		const { db, ctx } = createContext({});

		await attachActivityScreenshotCommand(input, ctx);

		expect(db.activity.updateMany).toHaveBeenCalledWith({
			where: { id: "act_1", screenshotId: null },
			data: { screenshotId: "upl_1" },
		});
	});

	it("refuses an activity that does not exist", async () => {
		const { db, ctx } = createContext({ activity: null });

		await expect(
			attachActivityScreenshotCommand(input, ctx),
		).rejects.toMatchObject({
			code: "NOT_FOUND",
			message: "Activity not found",
		});
		expect(db.activity.updateMany).not.toHaveBeenCalled();
	});

	it("refuses another athlete's activity before looking at the upload", async () => {
		const { db, ctx } = createContext({ activity: { athleteId: "ath_other" } });

		await expect(
			attachActivityScreenshotCommand(input, ctx),
		).rejects.toMatchObject({
			code: "FORBIDDEN",
			message: "Cannot attach a screenshot to another athlete's activity",
		});
		expect(db.upload.findUnique).not.toHaveBeenCalled();
		expect(db.activity.updateMany).not.toHaveBeenCalled();
	});

	it("refuses an upload that does not exist", async () => {
		const { db, ctx } = createContext({ upload: null });

		await expect(
			attachActivityScreenshotCommand(input, ctx),
		).rejects.toMatchObject({
			code: "BAD_REQUEST",
			message: "That photo can't be used. Add it again.",
		});
		expect(db.activity.updateMany).not.toHaveBeenCalled();
	});

	it("refuses another member's upload", async () => {
		const { db, ctx } = createContext({
			upload: { userId: "user_other", activity: null },
		});

		await expect(
			attachActivityScreenshotCommand(input, ctx),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(db.activity.updateMany).not.toHaveBeenCalled();
	});

	it("refuses an upload another activity already shows", async () => {
		const { db, ctx } = createContext({
			upload: { userId: "user_me", activity: { id: "act_2" } },
		});

		await expect(
			attachActivityScreenshotCommand(input, ctx),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(db.activity.updateMany).not.toHaveBeenCalled();
	});

	it("refuses an upload a chat message already holds", async () => {
		const { db, ctx } = createContext({
			upload: { userId: "user_me", messageId: "msg_1", activity: null },
		});

		await expect(
			attachActivityScreenshotCommand(input, ctx),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(db.activity.updateMany).not.toHaveBeenCalled();
	});

	it("refuses a file, which is stored as sent and is not a photo", async () => {
		const { db, ctx } = createContext({
			upload: { userId: "user_me", name: "race-plan.pdf", activity: null },
		});

		await expect(
			attachActivityScreenshotCommand(input, ctx),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(db.activity.updateMany).not.toHaveBeenCalled();
	});

	it("refuses a file's preview", async () => {
		const { db, ctx } = createContext({
			upload: { userId: "user_me", previewOfId: "upl_file", activity: null },
		});

		await expect(
			attachActivityScreenshotCommand(input, ctx),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(db.activity.updateMany).not.toHaveBeenCalled();
	});

	it("refuses a video", async () => {
		const { db, ctx } = createContext({
			upload: { userId: "user_me", contentType: "video/mp4", activity: null },
		});

		await expect(
			attachActivityScreenshotCommand(input, ctx),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(db.activity.updateMany).not.toHaveBeenCalled();
	});

	it("refuses an upload that hasn't finished", async () => {
		const { db, ctx } = createContext({
			upload: { userId: "user_me", pending: true, activity: null },
		});

		await expect(
			attachActivityScreenshotCommand(input, ctx),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });
		expect(db.activity.updateMany).not.toHaveBeenCalled();
	});

	it("refuses when the activity already has a screenshot", async () => {
		const { ctx } = createContext({ updatedCount: 0 });

		await expect(
			attachActivityScreenshotCommand(input, ctx),
		).rejects.toMatchObject({
			code: "CONFLICT",
			message: "This activity already has a screenshot.",
		});
	});
});

function createContext({
	activity = { athleteId: "ath_me" },
	upload = { userId: "user_me", activity: null },
	updatedCount = 1,
}: {
	activity?: { athleteId: string } | null;
	upload?: {
		userId: string;
		messageId?: string | null;
		name?: string | null;
		previewOfId?: string | null;
		contentType?: string | null;
		pending?: boolean;
		activity: { id: string } | null;
	} | null;
	updatedCount?: number;
}) {
	const db = {
		upload: { findUnique: vi.fn(async () => upload) },
		activity: {
			findUnique: vi.fn(async () => activity),
			updateMany: vi.fn(async () => ({ count: updatedCount })),
		},
	};
	return {
		db,
		ctx: {
			db,
			user: { id: "user_me", isAdmin: false },
			athlete: { id: "ath_me" },
		} as unknown as AuthenticatedContext,
	};
}
