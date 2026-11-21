import { describe, expect, it } from "vitest";
import type { ChatUser } from "./chat-user-names";
import {
	collectMessageUserIds,
	type MessageRow,
	mapForwardedMessage,
	mapQuotedMessage,
	mapToMessageDto,
	resolveForwardSourceId,
} from "./map-to-message-dto";

const at = (minute: number) => new Date(Date.UTC(2026, 9, 23, 6, minute));
const user = (id: string, name: string, initials: string): ChatUser => ({
	id,
	name,
	initials,
});
const sarah = user("user_sarah", "Sarah Chen", "SC");
const mike = user("user_mike", "Mike Lee", "ML");
const priya = user("user_priya", "Priya Shah", "PS");
const tom = user("user_tom", "Tom Ward", "TW");
const users = new Map([sarah, mike, priya, tom].map((u) => [u.id, u]));

const messageRow = (overrides: Partial<MessageRow> = {}): MessageRow => ({
	id: "msg_1",
	channelId: "chan_everyone",
	authorUserId: sarah.id,
	parentId: null,
	text: "Water's flat, see you at 6",
	gif: null,
	gifId: null,
	quotedMessageId: null,
	forwardedFromId: null,
	createdAt: at(0),
	updatedAt: at(0),
	editedAt: null,
	deletedAt: null,
	reactions: [],
	mentions: [],
	quotedMessage: null,
	forwardedFrom: null,
	replies: [],
	attachments: [],
	...overrides,
});

const viewer = { userId: sarah.id, isAdmin: false };

describe("resolveForwardSourceId", () => {
	it("forwards an original message as itself and a forward as its original", () => {
		expect(resolveForwardSourceId({ id: "msg_1", forwardedFromId: null })).toBe(
			"msg_1",
		);
		expect(
			resolveForwardSourceId({ id: "msg_2", forwardedFromId: "msg_1" }),
		).toBe("msg_1");
	});
});

describe("mapForwardedMessage", () => {
	const original = (
		channel: {
			kind: "everyone" | "group" | "direct_message";
			groupId: string | null;
		},
		deletedAt: Date | null = null,
	): MessageRow["forwardedFrom"] => ({
		id: "msg_original",
		text: "Regatta entries close Friday",
		gif: null,
		gifId: null,
		deletedAt,
		createdAt: at(1),
		authorUserId: mike.id,
		channel,
		attachments: [{ name: null }, { name: "Entry form.pdf" }, { name: null }],
	});

	it("labels the source channel and resolves the original author", () => {
		expect(
			mapForwardedMessage(original({ kind: "everyone", groupId: null }), users),
		).toEqual({
			id: "msg_original",
			channelName: "Everyone",
			author: mike,
			text: "Regatta entries close Friday",
			gif: null,
			gifId: null,
			photoCount: 2,
			fileCount: 1,
			fileName: "Entry form.pdf",
			createdAt: at(1).toISOString(),
			deleted: false,
		});
	});

	it("names direct message sources without revealing who was in them", () => {
		expect(
			mapForwardedMessage(
				original({ kind: "direct_message", groupId: null }),
				users,
			)?.channelName,
		).toBe("a direct message");
	});

	it("carries the original's GIF id beside its title, and neither once deleted", () => {
		const live = original({ kind: "everyone", groupId: null });
		const removed = original({ kind: "everyone", groupId: null }, at(5));
		const gif = { gif: "Rowing hard", gifId: "xT9IgG50Fb7Mi0prBC" };
		expect(
			mapForwardedMessage(live && { ...live, ...gif }, users),
		).toMatchObject(gif);
		expect(
			mapForwardedMessage(removed && { ...removed, ...gif }, users),
		).toMatchObject({ gif: null, gifId: null });
	});

	it("hides the content of a deleted original", () => {
		expect(
			mapForwardedMessage(
				original({ kind: "everyone", groupId: null }, at(5)),
				users,
			),
		).toMatchObject({
			deleted: true,
			text: null,
			gif: null,
			photoCount: 0,
			fileCount: 0,
			fileName: null,
		});
	});
});

describe("mapQuotedMessage", () => {
	it("maps the quoted author and hides deleted text", () => {
		const quoted = {
			id: "msg_q",
			text: "Who has the trailer keys?",
			gif: null,
			deletedAt: null,
			authorUserId: priya.id,
			attachments: [
				{ name: null },
				{ name: "Trailer checklist.docx" },
				{ name: "Keys.txt" },
			],
		};
		expect(mapQuotedMessage(quoted, users)).toMatchObject({
			author: priya,
			text: "Who has the trailer keys?",
			photoCount: 1,
			fileCount: 2,
			fileName: "Trailer checklist.docx",
			deleted: false,
		});
		expect(
			mapQuotedMessage({ ...quoted, deletedAt: at(3) }, users),
		).toMatchObject({
			deleted: true,
			text: null,
			photoCount: 0,
			fileCount: 0,
			fileName: null,
		});
	});

	it("falls back to a placeholder for someone who is no longer around", () => {
		expect(
			mapQuotedMessage(
				{
					id: "msg_q",
					text: "Hi",
					gif: null,
					deletedAt: null,
					authorUserId: "user_gone",
					attachments: [],
				},
				users,
			)?.author,
		).toEqual({
			id: "user_gone",
			name: "Former member",
			initials: "?",
		});
	});
});

describe("mapToMessageDto", () => {
	it("groups reactions by emoji with names and my reaction", () => {
		const dto = mapToMessageDto(
			messageRow({
				reactions: [
					{ emoji: "✅", userId: mike.id },
					{ emoji: "👀", userId: priya.id },
					{ emoji: "✅", userId: sarah.id },
				],
			}),
			viewer,
			users,
		);
		expect(dto.reactions).toEqual([
			{ emoji: "✅", count: 2, names: ["Mike Lee", "You"], reactedByMe: true },
			{ emoji: "👀", count: 1, names: ["Priya Shah"], reactedByMe: false },
		]);
	});

	it("summarizes replies with up to three distinct reply authors", () => {
		const dto = mapToMessageDto(
			messageRow({
				replies: [
					{ createdAt: at(30), authorUserId: tom.id },
					{ createdAt: at(20), authorUserId: mike.id },
					{ createdAt: at(15), authorUserId: tom.id },
					{ createdAt: at(10), authorUserId: priya.id },
					{ createdAt: at(5), authorUserId: sarah.id },
				],
			}),
			viewer,
			users,
		);
		expect(dto.replyCount).toBe(5);
		expect(dto.lastReplyAt).toBe(at(30).toISOString());
		expect(dto.replyAuthors.map((author) => author.initials)).toEqual([
			"TW",
			"ML",
			"PS",
		]);
	});

	it("lets the author or an admin delete, and hides deleted content", () => {
		const row = messageRow({ reactions: [{ emoji: "🙌", userId: mike.id }] });
		expect(mapToMessageDto(row, viewer, users).canDelete).toBe(true);
		expect(
			mapToMessageDto(row, { userId: priya.id, isAdmin: false }, users)
				.canDelete,
		).toBe(false);
		expect(
			mapToMessageDto(row, { userId: mike.id, isAdmin: true }, users).canDelete,
		).toBe(true);
		expect(
			mapToMessageDto({ ...row, deletedAt: at(9) }, viewer, users),
		).toMatchObject({
			deleted: true,
			canDelete: false,
			text: null,
			reactions: [],
		});
	});

	it("splits attachments into photos and files in order, and none once deleted", () => {
		const row = messageRow({
			attachments: [
				{
					id: "upl_first",
					name: null,
					size: 2000,
					preview: null,
					contentType: null,
					durationMs: null,
					width: null,
					height: null,
				},
				{
					id: "upl_minutes",
					name: "Minutes.pdf",
					size: 5120,
					preview: null,
					contentType: null,
					durationMs: null,
					width: null,
					height: null,
				},
				{
					id: "upl_second",
					name: null,
					size: 3000,
					preview: null,
					contentType: null,
					durationMs: null,
					width: null,
					height: null,
				},
			],
		});
		const dto = mapToMessageDto(row, viewer, users);
		expect(dto.photos).toEqual([
			{
				id: "upl_first",
				url: "/api/v1/chat/attachments/upl_first",
				thumbnailUrl: "/api/v1/chat/attachments/upl_first?size=thumbnail",
			},
			{
				id: "upl_second",
				url: "/api/v1/chat/attachments/upl_second",
				thumbnailUrl: "/api/v1/chat/attachments/upl_second?size=thumbnail",
			},
		]);
		expect(dto.files).toEqual([
			{
				id: "upl_minutes",
				url: "/api/v1/chat/attachments/upl_minutes",
				name: "Minutes.pdf",
				size: 5120,
				previewUrl: null,
			},
		]);
		const deleted = mapToMessageDto(
			{ ...row, deletedAt: at(9) },
			viewer,
			users,
		);
		expect(deleted.photos).toEqual([]);
		expect(deleted.files).toEqual([]);
	});

	it("gives a file its preview picture without counting the preview as a photo", () => {
		const dto = mapToMessageDto(
			messageRow({
				attachments: [
					{
						id: "upl_minutes",
						name: "Minutes.pdf",
						size: 5120,
						contentType: null,
						durationMs: null,
						width: null,
						height: null,
						preview: { id: "upl_minutes_preview" },
					},
				],
			}),
			viewer,
			users,
		);
		expect(dto.files).toEqual([
			{
				id: "upl_minutes",
				url: "/api/v1/chat/attachments/upl_minutes",
				name: "Minutes.pdf",
				size: 5120,
				previewUrl: "/api/v1/chat/attachments/upl_minutes_preview",
			},
		]);
		expect(dto.photos).toEqual([]);
	});

	it("lists a video by itself, never as a file or photo, with its play link and poster", () => {
		const row = messageRow({
			attachments: [
				{
					id: "upl_video",
					name: "Regatta.mp4",
					size: 4_900_000,
					contentType: "video/mp4",
					durationMs: 41000,
					width: 1080,
					height: 1920,
					preview: { id: "upl_poster" },
				},
				{
					id: "upl_clip",
					name: "Erg.webm",
					size: 1000,
					contentType: "video/webm",
					durationMs: null,
					width: null,
					height: null,
					preview: null,
				},
			],
		});
		const dto = mapToMessageDto(row, viewer, users);
		expect(dto.videos).toEqual([
			{
				id: "upl_video",
				name: "Regatta.mp4",
				size: 4_900_000,
				durationMs: 41000,
				width: 1080,
				height: 1920,
				playUrl: "/api/v1/chat/attachments/upl_video/play",
				posterUrl: "/api/v1/chat/attachments/upl_poster",
			},
			{
				id: "upl_clip",
				name: "Erg.webm",
				size: 1000,
				durationMs: null,
				width: null,
				height: null,
				playUrl: "/api/v1/chat/attachments/upl_clip/play",
				posterUrl: null,
			},
		]);
		expect(dto.files).toEqual([]);
		expect(dto.photos).toEqual([]);
		expect(
			mapToMessageDto({ ...row, deletedAt: at(9) }, viewer, users).videos,
		).toEqual([]);
	});

	it("carries the GIF id beside its title, and neither once deleted", () => {
		const row = messageRow({
			text: null,
			gif: "Nailed it",
			gifId: "3o7abKhOpu0NwenH3O",
		});
		expect(mapToMessageDto(row, viewer, users)).toMatchObject({
			gif: "Nailed it",
			gifId: "3o7abKhOpu0NwenH3O",
		});
		expect(
			mapToMessageDto({ ...row, deletedAt: at(9) }, viewer, users),
		).toMatchObject({ gif: null, gifId: null });
	});

	it("keeps an older GIF that has a title but no id", () => {
		expect(
			mapToMessageDto(messageRow({ gif: "nailed it" }), viewer, users),
		).toMatchObject({ gif: "nailed it", gifId: null });
	});

	it("lets only the author edit, and marks an edited message", () => {
		const row = messageRow({ editedAt: at(4) });
		expect(mapToMessageDto(row, viewer, users)).toMatchObject({
			canEdit: true,
			editedAt: at(4).toISOString(),
		});
		expect(
			mapToMessageDto(row, { userId: mike.id, isAdmin: true }, users).canEdit,
		).toBe(false);
		expect(
			mapToMessageDto({ ...row, deletedAt: at(9) }, viewer, users),
		).toMatchObject({ canEdit: false, editedAt: null });
	});

	it("names each mention by the person's current name and marks mine", () => {
		const row = messageRow({
			text: "@Mike L and @Sarah Chen, boat at 6",
			mentions: [
				{ userId: mike.id, start: 0, length: 7 },
				{ userId: sarah.id, start: 12, length: 11 },
			],
		});
		expect(mapToMessageDto(row, viewer, users).mentions).toEqual([
			{ userId: mike.id, start: 0, length: 7, name: "Mike Lee", isMe: false },
			{
				userId: sarah.id,
				start: 12,
				length: 11,
				name: "Sarah Chen",
				isMe: true,
			},
		]);
	});

	it("leaves a mention unnamed when the person can't be found", () => {
		const row = messageRow({
			text: "@Gone Person hi",
			mentions: [{ userId: "user_gone", start: 0, length: 12 }],
		});
		expect(mapToMessageDto(row, viewer, users).mentions).toEqual([
			{ userId: "user_gone", start: 0, length: 12, name: null, isMe: false },
		]);
	});

	it("drops mentions from a deleted message", () => {
		const row = messageRow({
			deletedAt: at(9),
			mentions: [{ userId: mike.id, start: 0, length: 7 }],
		});
		expect(mapToMessageDto(row, viewer, users).mentions).toEqual([]);
	});
});

describe("collectMessageUserIds", () => {
	it("collects authors from reactions, replies, quotes and forwards", () => {
		const ids = collectMessageUserIds([
			messageRow({
				reactions: [{ emoji: "✅", userId: mike.id }],
				replies: [{ createdAt: at(1), authorUserId: tom.id }],
				quotedMessage: {
					id: "q",
					text: "x",
					gif: null,
					deletedAt: null,
					authorUserId: priya.id,
					attachments: [],
				},
			}),
		]);
		expect(new Set(ids)).toEqual(
			new Set([sarah.id, mike.id, tom.id, priya.id]),
		);
	});

	it("collects the people mentioned", () => {
		const ids = collectMessageUserIds([
			messageRow({ mentions: [{ userId: tom.id, start: 0, length: 9 }] }),
		]);
		expect(ids).toContain(tom.id);
	});
});
