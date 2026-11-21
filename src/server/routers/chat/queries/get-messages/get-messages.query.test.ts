import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ViewerContext } from "@/server/context";

const findAccessibleChannel = vi.fn();
const loadMessageDtos = vi.fn();

vi.mock("@/server/routers/chat/common/chat-access", () => ({
	findAccessibleChannel,
	getVisibleFrom: () => null,
}));
vi.mock("@/server/routers/chat/common/load-message-dtos", () => ({
	loadMessageDtos,
}));

const { getMessagesQuery } = await import("./get-messages.query");

const gigabyte = 1024 * 1024 * 1024;
const oldestPlay = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
const db = {
	message: { findMany: vi.fn() },
	channel_read: { findUnique: vi.fn() },
	video_playback: { aggregate: vi.fn(), findMany: vi.fn() },
};
const ctx = {
	db,
	user: { id: "user_me", isAdmin: false },
} as unknown as ViewerContext;
const input = { channelId: "chan_everyone", limit: 50 };
const videoMessage = {
	id: "msg_video",
	attachments: [{ size: 5_000_000, contentType: "video/mp4" }],
};
const fileMessage = {
	id: "msg_file",
	attachments: [{ size: 5_000, contentType: null }],
};

describe("getMessagesQuery and paused videos", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		db.channel_read.findUnique.mockResolvedValue(null);
		loadMessageDtos.mockImplementation(async (_ctx, rows) =>
			rows.map(({ id }: { id: string }) => ({ id })),
		);
		db.video_playback.aggregate.mockResolvedValue({
			_sum: { bytes: 6 * gigabyte },
		});
		db.video_playback.findMany.mockResolvedValue([
			{ bytes: 1 * gigabyte, createdAt: oldestPlay },
			{ bytes: 5 * gigabyte, createdAt: new Date() },
		]);
	});

	it("says until when videos are paused when the page holds a video and the allowance is used up", async () => {
		db.message.findMany.mockResolvedValue([videoMessage, fileMessage]);

		const result = await getMessagesQuery(input, ctx);

		expect(result.videosPausedUntil).toBe(
			new Date(oldestPlay.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
		);
	});

	it("does not look at the allowance for a page without videos", async () => {
		db.message.findMany.mockResolvedValue([fileMessage]);

		const result = await getMessagesQuery(input, ctx);

		expect(result.videosPausedUntil).toBe(null);
		expect(db.video_playback.aggregate).not.toHaveBeenCalled();
	});

	it("still returns the messages when the allowance lookup fails", async () => {
		db.message.findMany.mockResolvedValue([videoMessage]);
		db.video_playback.aggregate.mockRejectedValue(new Error("db down"));
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.spyOn(console, "log").mockImplementation(() => {});

		const result = await getMessagesQuery(input, ctx);

		expect(result.data).toEqual([{ id: "msg_video" }]);
		expect(result.videosPausedUntil).toBe(null);
	});
});
