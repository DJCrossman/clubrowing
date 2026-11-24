import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ViewerContext } from "@/domain/common/context";

const head = vi.fn();
const findAccessibleChannel = vi.fn();
const loadMessageDtos = vi.fn();
const notifyChannelAfterResponse = vi.fn();

vi.mock("@vercel/blob", () => ({ head }));
vi.mock("@/domain/chat/common/chat-access", () => ({
	findAccessibleChannel,
}));
vi.mock("@/domain/chat/common/load-message-dtos", () => ({
	loadMessageDtos,
}));
vi.mock("@/domain/chat/common/message-mentions", () => ({
	selectChannelMentions: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/domain/chat/common/message-notifications", () => ({
	notifyChannelAfterResponse,
}));

const { sendMessageCommand } = await import("./send-message.command");

const pathname = "uploads/user_me/video-abc.mp4";
const storedUrl = `https://store.private.blob.vercel-storage.com/${pathname}`;
const pendingVideo = {
	id: "upl_video",
	url: pathname,
	size: 5_000_000,
	contentType: "video/mp4",
};
const db = {
	upload: { findMany: vi.fn(), update: vi.fn() },
	message: { create: vi.fn() },
};
const ctx = {
	db,
	user: { id: "user_me", isAdmin: false },
} as unknown as ViewerContext;
const input = {
	channelId: "chan_everyone",
	attachmentIds: ["upl_video", "upl_photo"],
};

describe("sendMessageCommand with a video", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		db.upload.findMany.mockResolvedValue([pendingVideo]);
		db.message.create.mockResolvedValue({ id: "msg_1" });
		loadMessageDtos.mockResolvedValue([{ id: "msg_1" }]);
		head.mockResolvedValue({
			url: storedUrl,
			size: 4_900_000,
			contentType: "video/mp4",
		});
	});

	it("confirms the sender's own pending uploads with storage, then attaches only confirmed ones", async () => {
		await sendMessageCommand(input, ctx);

		expect(db.upload.findMany).toHaveBeenCalledWith({
			where: {
				id: { in: ["upl_video", "upl_photo"] },
				userId: "user_me",
				pending: true,
			},
			select: { id: true, url: true, size: true, contentType: true },
		});
		expect(head).toHaveBeenCalledWith(pathname);
		expect(db.upload.update).toHaveBeenCalledWith({
			where: { id: "upl_video" },
			data: { url: storedUrl, size: 4_900_000, pending: false },
		});
		expect(db.message.create.mock.calls[0][0].data.attachments.connect).toEqual(
			[
				expect.objectContaining({ id: "upl_video", pending: false }),
				expect.objectContaining({ id: "upl_photo", pending: false }),
			],
		);
		expect(db.upload.update.mock.invocationCallOrder[0]).toBeLessThan(
			db.message.create.mock.invocationCallOrder[0],
		);
	});

	it("refuses a video whose file never reached storage", async () => {
		head.mockRejectedValue(new Error("not found"));

		await expectRefused();
	});

	it("refuses a video larger than the size it was allowed", async () => {
		head.mockResolvedValue({
			url: storedUrl,
			size: 5_000_001,
			contentType: "video/mp4",
		});

		await expectRefused();
	});

	it("refuses a video stored as another type", async () => {
		head.mockResolvedValue({
			url: storedUrl,
			size: 4_900_000,
			contentType: "text/html",
		});

		await expectRefused();
	});

	it("asks storage nothing when no upload is pending", async () => {
		db.upload.findMany.mockResolvedValue([]);

		await sendMessageCommand(input, ctx);

		expect(head).not.toHaveBeenCalled();
		expect(db.message.create).toHaveBeenCalled();
	});

	it("looks nothing up for a message without attachments", async () => {
		await sendMessageCommand({ channelId: "chan_everyone", text: "Hi" }, ctx);

		expect(db.upload.findMany).not.toHaveBeenCalled();
	});
});

async function expectRefused() {
	await expect(sendMessageCommand(input, ctx)).rejects.toMatchObject({
		code: "BAD_REQUEST",
		message: "That video didn't finish uploading. Try adding it again.",
	});
	expect(db.upload.update).not.toHaveBeenCalled();
	expect(db.message.create).not.toHaveBeenCalled();
}
