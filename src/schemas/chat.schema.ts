import { z } from "zod";
import { mentionsFitText } from "@/lib/chat/mentions";

export const EVERYONE_CHANNEL_ID = "everyone";
export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_DM_MEMBERS = 9;
export const MAX_MESSAGE_ATTACHMENTS = 4;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;

const messageTextSchema = z
	.string()
	.trim()
	.max(
		MAX_MESSAGE_LENGTH,
		`Messages can be at most ${MAX_MESSAGE_LENGTH} characters`,
	);
const gifSchema = z.object({
	id: z.string().trim().min(1).max(100),
	title: z
		.string()
		.trim()
		.min(1)
		.transform((title) => title.slice(0, 100)),
});
const mentionsSchema = z.array(
	z.object({
		userId: z.string(),
		start: z.number().int().min(0),
		length: z.number().int().min(2),
	}),
);

const hasContent = (value: {
	text?: string;
	gif?: { id: string; title: string };
	attachmentIds?: string[];
}) => !!value.text || !!value.gif || !!value.attachmentIds?.length;
const missingContent = {
	message: "A message needs text or a GIF",
	path: ["text"],
};
const mentionsFit = (value: {
	text?: string;
	mentions?: z.infer<typeof mentionsSchema>;
}) =>
	mentionsFitText({ text: value.text ?? "", mentions: value.mentions ?? [] });
const mismatchedMentions = {
	message: "That mention doesn't match the message",
	path: ["mentions"],
};

export const getMessagesInputSchema = z.object({
	channelId: z.string(),
	cursor: z.string().nullish(),
	limit: z.number().int().min(1).max(100).default(50),
});
export type GetMessagesInput = z.infer<typeof getMessagesInputSchema>;

export const getThreadInputSchema = z.object({ messageId: z.string() });
export type GetThreadInput = z.infer<typeof getThreadInputSchema>;

export const getMembersInputSchema = z
	.object({ channelId: z.string().optional() })
	.optional();
export type GetMembersInput = z.infer<typeof getMembersInputSchema>;

export const sendMessageSchema = z
	.object({
		channelId: z.string(),
		text: messageTextSchema.optional(),
		gif: gifSchema.optional(),
		quotedMessageId: z.string().optional(),
		attachmentIds: z
			.array(z.string())
			.max(
				MAX_MESSAGE_ATTACHMENTS,
				`A message can carry up to ${MAX_MESSAGE_ATTACHMENTS} files`,
			)
			.transform((ids) => [...new Set(ids)])
			.optional(),
		mentions: mentionsSchema.optional(),
	})
	.refine(hasContent, {
		message: "A message needs text, a GIF or a file",
		path: ["text"],
	})
	.refine(mentionsFit, mismatchedMentions);
export type SendMessage = z.infer<typeof sendMessageSchema>;

export const replyInThreadSchema = z
	.object({
		messageId: z.string(),
		text: messageTextSchema.optional(),
		gif: gifSchema.optional(),
		alsoSendToChannel: z.boolean().optional(),
		mentions: mentionsSchema.optional(),
	})
	.refine(hasContent, missingContent)
	.refine(mentionsFit, mismatchedMentions);
export type ReplyInThread = z.infer<typeof replyInThreadSchema>;

export const toggleReactionSchema = z.object({
	messageId: z.string(),
	emoji: z.string().trim().min(1).max(32),
});
export type ToggleReaction = z.infer<typeof toggleReactionSchema>;

export const forwardMessageSchema = z.object({
	messageId: z.string(),
	targetChannelId: z.string(),
	note: messageTextSchema.optional(),
});
export type ForwardMessage = z.infer<typeof forwardMessageSchema>;

export const markReadSchema = z.object({ channelId: z.string() });
export type MarkRead = z.infer<typeof markReadSchema>;

export const markUnreadSchema = z.object({ messageId: z.string() });
export type MarkUnread = z.infer<typeof markUnreadSchema>;

const otherUserIdsSchema = z
	.array(z.string().min(1))
	.min(1, "Choose at least one person")
	.max(
		MAX_DM_MEMBERS - 1,
		`A conversation can have at most ${MAX_DM_MEMBERS} people`,
	)
	.refine(
		(ids) => new Set(ids).size === ids.length,
		"Each person can only be added once",
	);

export const startDmSchema = z.object({ userIds: otherUserIdsSchema });
export type StartDm = z.infer<typeof startDmSchema>;

export const addDmMembersSchema = z.object({
	channelId: z.string(),
	userIds: otherUserIdsSchema,
	shareHistory: z.boolean().default(true),
});
export type AddDmMembers = z.infer<typeof addDmMembersSchema>;

export const leaveDmSchema = z.object({ channelId: z.string() });
export type LeaveDm = z.infer<typeof leaveDmSchema>;

export const deleteMessageSchema = z.object({ messageId: z.string() });
export type DeleteMessage = z.infer<typeof deleteMessageSchema>;

export const editMessageSchema = z
	.object({
		messageId: z.string(),
		text: messageTextSchema.min(1, "A message needs text"),
		mentions: mentionsSchema.optional(),
	})
	.refine(mentionsFit, mismatchedMentions);
export type EditMessage = z.infer<typeof editMessageSchema>;

export const messageComposerSchema = z.object({
	text: messageTextSchema,
	alsoSendToChannel: z.boolean(),
	files: z
		.array(z.instanceof(File))
		.max(
			MAX_MESSAGE_ATTACHMENTS,
			`A message can carry up to ${MAX_MESSAGE_ATTACHMENTS} files`,
		)
		// Pictures are exempt: the browser shrinks them before they are uploaded.
		.refine(
			(files) =>
				files.every(
					(file) =>
						isPicture(file) || isChatVideo(file) || file.size <= MAX_FILE_BYTES,
				),
			"Files can be up to 4 MB",
		)
		.refine(
			(files) =>
				files.every(
					(file) => !isChatVideo(file) || file.size <= MAX_VIDEO_BYTES,
				),
			"Videos can be up to 20 MB",
		),
});
export type MessageComposerValues = z.infer<typeof messageComposerSchema>;

export const chatTargetFormSchema = z.object({
	targetKey: z.string().min(1, "Choose where to send it"),
	note: messageTextSchema,
});
export type ChatTargetFormValues = z.infer<typeof chatTargetFormSchema>;

export function isPicture(file: File) {
	return (
		file.type.startsWith("image/") ||
		/\.(jpg|jpeg|png|webp|gif|heic|heif|avif|tif|tiff|bmp)$/i.test(file.name)
	);
}

export function isChatVideo(file: { name: string }) {
	return /\.(mp4|mov|m4v|webm)$/i.test(file.name);
}
