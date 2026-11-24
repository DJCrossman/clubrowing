"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type React from "react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { ChatHeader } from "@/components/chat/chat-header";
import { PeoplePickerDialog } from "@/components/chat/people-picker-dialog";
import { GroupTabs } from "@/components/group-tabs";
import { NotificationsBanner } from "@/components/notifications-banner";
import { SiteHeader } from "@/components/site-header";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useCurrentUser } from "@/hooks/useAuth";
import { useChatFile } from "@/hooks/useChatFile";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useMentions } from "@/hooks/useMentions";
import { useNotifications } from "@/hooks/useNotifications";
import { getViewableKind } from "@/lib/chat/attachments";
import { fitPhotoToUploadLimit } from "@/lib/fit-photo-to-upload-limit";
import { routes } from "@/lib/routes";
import type { ChatChannel, ChatMessage } from "@/lib/trpc/types";
import { isChatVideo, isPicture, MAX_DM_MEMBERS } from "@/schemas/chat.schema";
import {
	ChatEmptyState,
	DeleteMessageDialog,
	FileDropOverlay,
	FileViewerDialog,
	ForwardDialog,
	MessageComposer,
	type MessageComposerHandle,
	MessageList,
	ThreadPanel,
} from "./components";
import { useChatChannel } from "./hooks/useChatChannel";
import { useFileDrop } from "./hooks/useFileDrop";
import { useSpaceAboveKeyboard } from "./hooks/useSpaceAboveKeyboard";

interface ChatSceneProps {
	channelId: string;
	threadMessageId: string | null;
}

export const ChatScene = ({ channelId, threadMessageId }: ChatSceneProps) => {
	const router = useRouter();
	const isMobile = useIsMobile();
	const spaceAboveKeyboard = useSpaceAboveKeyboard({ isEnabled: isMobile });
	const [quote, setQuote] = useState<ChatMessage | null>(null);
	const [editing, setEditing] = useState<ChatMessage | null>(null);
	const [forwardingMessage, setForwardingMessage] =
		useState<ChatMessage | null>(null);
	const [isAddingPeople, setIsAddingPeople] = useState(false);
	const [shareHistory, setShareHistory] = useState(true);
	const [deletingMessage, setDeletingMessage] = useState<ChatMessage | null>(
		null,
	);
	const [videoUploadProgress, setVideoUploadProgress] = useState<number | null>(
		null,
	);
	const [viewing, setViewing] = useState<{
		fileId: string;
		threadMessageId: string | null;
	} | null>(null);
	const [mentioningChannelId, setMentioningChannelId] = useState<string | null>(
		null,
	);
	const [mentioningThreadId, setMentioningThreadId] = useState<string | null>(
		null,
	);
	const composerRef = useRef<MessageComposerHandle>(null);
	const {
		channels,
		channel,
		messages,
		firstUnreadMessageId,
		videosPausedUntil,
		messagesQuery,
		threadQuery,
		membersQuery,
		refreshMessages,
		sendMessage,
		replyInThread,
		toggleReaction,
		markUnread,
		startDm,
		addDmMembers,
		leaveDm,
		forwardMessage,
		deleteMessage,
		editMessage,
	} = useChatChannel({
		channelId,
		threadMessageId,
		loadMembers: !!forwardingMessage || isAddingPeople,
	});
	// A file opened from a thread closes with the thread, however it closes.
	if (viewing?.threadMessageId && viewing.threadMessageId !== threadMessageId) {
		setViewing(null);
	}
	const viewingFile =
		[
			...messages,
			...(threadQuery.data
				? [threadQuery.data.root, ...threadQuery.data.replies]
				: []),
		]
			.flatMap((message) => message.files)
			.find((file) => file.id === viewing?.fileId) ?? null;
	const chatFile = useChatFile({
		url: viewingFile?.url ?? null,
		kind: viewingFile && getViewableKind(viewingFile.name),
	});
	const uploadAttachments = useMutation({ mutationFn: uploadFiles });
	const notifications = useNotifications();
	const { isAdmin } = useCurrentUser();
	const quotedMessage = quote?.channelId === channelId ? quote : null;
	const editingMessage = editing?.channelId === channelId ? editing : null;
	const channelName = channel?.name ?? "";
	const isUnavailable = messagesQuery.error?.data?.code === "NOT_FOUND";
	// A composer that goes away without a blur, as when Escape closes the
	// thread drawer, can't report that its mention ended.
	if (
		mentioningChannelId &&
		(mentioningChannelId !== channelId || isUnavailable)
	) {
		setMentioningChannelId(null);
	}
	if (mentioningThreadId && mentioningThreadId !== threadQuery.data?.root.id) {
		setMentioningThreadId(null);
	}
	const channelMentions = useMentions({
		channelId,
		isEnabled: mentioningChannelId === channelId,
	});
	const threadMentions = useMentions({
		channelId: threadQuery.data?.root.channelId ?? channelId,
		isEnabled: mentioningThreadId === threadQuery.data?.root.id,
	});
	const fileDrop = useFileDrop({
		isDisabled: !!editingMessage || isUnavailable,
		onDrop: (files) => composerRef.current?.addFiles(files),
	});

	return (
		<SidebarProvider
			style={
				{
					"--sidebar-width": "calc(var(--spacing) * 72)",
					"--header-height": "calc(var(--spacing) * 12)",
				} as React.CSSProperties
			}
		>
			<AppSidebar variant="inset" />
			<SidebarInset
				className="h-svh overflow-hidden md:h-[calc(100svh-1rem)]"
				style={
					spaceAboveKeyboard && {
						...spaceAboveKeyboard,
						paddingBottom: 0,
						zIndex: 30,
					}
				}
			>
				<SiteHeader breadcrumbs={getBreadcrumbs(channel, isAdmin)} />
				<ChatHeader
					channel={channel}
					notificationPreferences={notifications.preferences}
					isLoadingNotifications={notifications.isLoading}
					onNotificationPreferenceChange={notifications.setPreference}
					onAddPeople={() => {
						setShareHistory(true);
						setIsAddingPeople(true);
					}}
					onLeave={() =>
						leaveDm.mutate(
							{ channelId },
							{
								onSuccess: () => {
									toast.success("You left the conversation");
									router.push(routes.chat.everyone());
								},
							},
						)
					}
				>
					{channel?.groupId && (
						<GroupTabs
							groupId={channel.groupId}
							channelId={channel.id}
							active="chat"
						/>
					)}
				</ChatHeader>
				<NotificationsBanner
					isLoading={notifications.isLoading}
					isError={notifications.isError}
					isSupported={notifications.supported}
					isConfigured={notifications.configured}
					permission={notifications.permission}
					isSubscribed={notifications.subscribed}
					isEnabling={notifications.isPending}
					onEnable={notifications.enable}
					className="mx-4 mt-3 w-auto lg:mx-6"
				/>
				<div className="flex min-h-0 flex-1">
					<section
						ref={fileDrop.targetRef}
						aria-label={channelName || "Chat"}
						className="relative flex min-w-0 flex-1 flex-col"
					>
						{isUnavailable ? (
							<ChatEmptyState
								title="This conversation isn't available"
								description="It may have been removed, or you don't have access to it."
							/>
						) : (
							<>
								{fileDrop.isDraggingFiles && <FileDropOverlay />}
								<MessageList
									messages={messages}
									isLoading={messagesQuery.isPending}
									hasOlder={messagesQuery.hasNextPage}
									isLoadingOlder={messagesQuery.isFetchingNextPage}
									highlightedMessageId={threadMessageId}
									editingMessageId={editingMessage?.id}
									firstUnreadMessageId={firstUnreadMessageId}
									videosPausedUntil={videosPausedUntil}
									isKeyboardOpen={!!spaceAboveKeyboard}
									emptyState={
										channel?.kind === "direct_message" ? (
											<ChatEmptyState
												title={`Start a conversation with ${channel.name}`}
												description={
													channel.memberCount > 2
														? "Messages here are only visible to the people in this conversation."
														: "Messages here are only visible to the two of you."
												}
											/>
										) : (
											<ChatEmptyState
												title="No messages yet"
												description={`Be the first to post in ${channelName || "this channel"}.`}
											/>
										)
									}
									onVideoError={() => void refreshMessages()}
									onLoadOlder={() => messagesQuery.fetchNextPage()}
									onOpenThread={(message) =>
										router.push(routes.chat.thread(channelId, message.id), {
											scroll: false,
										})
									}
									onQuote={setQuote}
									onMarkUnread={(message) =>
										markUnread.mutate(
											{ messageId: message.id },
											{ onSuccess: () => toast.success("Marked as unread") },
										)
									}
									onToggleReaction={(message, emoji) =>
										toggleReaction.mutate({ messageId: message.id, emoji })
									}
									onForward={setForwardingMessage}
									onDelete={setDeletingMessage}
									onEdit={setEditing}
									onOpenFile={(file) =>
										setViewing({ fileId: file.id, threadMessageId: null })
									}
								/>
								<div className="shrink-0 px-4 pt-2 pb-5 lg:px-6">
									<MessageComposer
										key={channelId}
										ref={composerRef}
										placeholder={`Message ${channelName}`.trim()}
										quotedMessage={quotedMessage}
										videoUploadProgress={videoUploadProgress}
										editingMessage={editingMessage}
										mentionableMembers={channelMentions.members}
										onCancelQuote={() => setQuote(null)}
										onCancelEdit={() => setEditing(null)}
										onSaveEdit={(message, text, mentions) =>
											editMessage.mutateAsync({
												messageId: message.id,
												text,
												mentions,
											})
										}
										onEditLastMessage={() =>
											setEditing(
												messages.findLast((message) => message.canEdit) ?? null,
											)
										}
										onSubmit={async ({ text, gif, files, mentions }) => {
											const attachmentIds = files.length
												? await uploadAttachments
														.mutateAsync({
															files,
															onVideoProgress: setVideoUploadProgress,
														})
														.catch((error: Error) => {
															toast.error(error.message);
															throw error;
														})
														.finally(() => setVideoUploadProgress(null))
												: undefined;
											await sendMessage.mutateAsync({
												channelId,
												text,
												gif,
												quotedMessageId: quotedMessage?.id,
												attachmentIds,
												mentions,
											});
											setQuote(null);
										}}
										onMentioningChange={(isMentioning) =>
											setMentioningChannelId(isMentioning ? channelId : null)
										}
									/>
								</div>
							</>
						)}
					</section>
					{threadMessageId && (
						<ThreadPanel
							channelName={channelName}
							thread={threadQuery.data}
							isLoading={threadQuery.isPending}
							isUnavailable={threadQuery.isError && !threadQuery.data}
							isMobile={isMobile}
							videosPausedUntil={videosPausedUntil}
							mentionableMembers={threadMentions.members}
							onVideoError={() => void refreshMessages()}
							onClose={() =>
								router.push(routes.chat.channel(channelId), { scroll: false })
							}
							onReply={({ text, gif, alsoSendToChannel, mentions }) =>
								replyInThread.mutateAsync({
									messageId: threadMessageId,
									text,
									gif,
									alsoSendToChannel,
									mentions,
								})
							}
							onToggleReaction={(message, emoji) =>
								toggleReaction.mutate({ messageId: message.id, emoji })
							}
							onForward={setForwardingMessage}
							onDelete={setDeletingMessage}
							onSaveEdit={(message, text, mentions) =>
								editMessage.mutateAsync({
									messageId: message.id,
									text,
									mentions,
								})
							}
							onOpenFile={(file) =>
								setViewing({ fileId: file.id, threadMessageId })
							}
							onMentioningChange={(isMentioning) =>
								setMentioningThreadId(
									isMentioning ? (threadQuery.data?.root.id ?? null) : null,
								)
							}
						/>
					)}
				</div>
			</SidebarInset>
			<ForwardDialog
				message={forwardingMessage}
				sourceChannelName={channelName}
				channels={channels}
				members={membersQuery.data?.data ?? []}
				isLoadingMembers={membersQuery.isPending}
				onClose={() => setForwardingMessage(null)}
				onForward={async ({ messageId, target, note }) => {
					const targetChannelId =
						"channelId" in target
							? target.channelId
							: (await startDm.mutateAsync({ userIds: [target.userId] }))
									.channelId;
					await forwardMessage.mutateAsync({
						messageId,
						targetChannelId,
						note: note || undefined,
					});
					setForwardingMessage(null);
					toast.success(`Forwarded to ${target.name}`);
					router.push(routes.chat.channel(targetChannelId));
				}}
			/>
			<FileViewerDialog
				file={viewingFile}
				isOpening={chatFile.isOpening}
				isFailed={chatFile.isFailed}
				pdfDocument={chatFile.pdfDocument}
				sheet={chatFile.sheet}
				onClose={() => setViewing(null)}
			/>
			{channel?.kind === "direct_message" && (
				<PeoplePickerDialog
					open={isAddingPeople}
					onOpenChange={setIsAddingPeople}
					title="Add people"
					members={membersQuery.data?.data ?? []}
					isLoadingMembers={membersQuery.isPending}
					description="Choose people to add to this conversation"
					maxSelectable={MAX_DM_MEMBERS - channel.memberCount}
					excludeUserIds={channel.members.map((member) => member.id)}
					confirmLabel={(count) =>
						count === 1 ? "Add 1 person" : `Add ${count} people`
					}
					onConfirm={async (userIds) => {
						await addDmMembers.mutateAsync({
							channelId,
							userIds,
							shareHistory,
						});
						setIsAddingPeople(false);
						toast.success(
							userIds.length === 1
								? "Added 1 person"
								: `Added ${userIds.length} people`,
						);
					}}
				>
					<Label className="flex items-center gap-2 border-t px-3 py-2.5 text-sm font-normal">
						<Checkbox
							checked={shareHistory}
							onCheckedChange={(checked) => setShareHistory(checked === true)}
						/>
						Show them earlier messages
					</Label>
				</PeoplePickerDialog>
			)}
			<DeleteMessageDialog
				isOpen={!!deletingMessage}
				isDeleting={deleteMessage.isPending}
				onClose={() => setDeletingMessage(null)}
				onConfirm={() => {
					if (!deletingMessage) return;
					deleteMessage.mutate(
						{ messageId: deletingMessage.id },
						{
							onSuccess: () => {
								setDeletingMessage(null);
								toast.success("Message deleted");
							},
						},
					);
				}}
			/>
		</SidebarProvider>
	);
};

function getBreadcrumbs(channel: ChatChannel | undefined, isAdmin: boolean) {
	if (!channel) {
		return [{ label: "Chat" }];
	}
	if (channel.kind === "direct_message") {
		return [
			{ label: "Members", href: isAdmin ? routes.members.list() : undefined },
			{ label: channel.name },
		];
	}
	return [
		{ label: "Groups", href: routes.groups.list() },
		{ label: channel.name },
	];
}

async function uploadFiles({
	files,
	onVideoProgress,
}: {
	files: File[];
	onVideoProgress: (fraction: number) => void;
}) {
	const attachmentIds: string[] = [];
	const videoBytes = files
		.filter(isChatVideo)
		.reduce((total, file) => total + file.size, 0);
	let uploadedVideoBytes = 0;
	for (const file of files) {
		if (isChatVideo(file)) {
			onVideoProgress(uploadedVideoBytes / videoBytes);
			const { uploadVideo } = await import(
				"./components/MessageVideos/uploadVideo"
			).catch(() => {
				throw new Error(
					"We couldn't upload your file. Check your connection and try again.",
				);
			});
			attachmentIds.push(
				await uploadVideo({
					file,
					onProgress: (loaded) =>
						onVideoProgress((uploadedVideoBytes + loaded) / videoBytes),
				}),
			);
			uploadedVideoBytes += file.size;
			continue;
		}
		const body = new FormData();
		if (isPicture(file)) {
			body.append(
				"file",
				await fitPhotoToUploadLimit({ file, longEdge: 2560 }),
			);
		} else {
			body.append("file", file);
			body.append("kind", "file");
		}
		const response = await fetch("/api/v1/uploads", {
			method: "POST",
			body,
		}).catch(() => {
			throw new Error(
				"We couldn't upload your file. Check your connection and try again.",
			);
		});
		const result: { id?: string; error?: string } = await response
			.json()
			.catch(() => ({}));
		if (!response.ok || !result.id) {
			throw new Error(
				result.error ?? "We couldn't upload your file. Try again.",
			);
		}
		attachmentIds.push(result.id);
		if (getViewableKind(file.name) === "pdf") {
			try {
				const { makePdfPreview } = await import(
					"./components/FileViewer/makePdfPreview"
				);
				const picture = await makePdfPreview(file);
				if (picture) {
					const preview = new FormData();
					preview.append("file", picture, "preview.jpg");
					preview.append("kind", "preview");
					preview.append("previewOf", result.id);
					await fetch("/api/v1/uploads", { method: "POST", body: preview });
				}
			} catch {
				// The file is sent without its first-page picture rather than not at all.
			}
		}
	}
	return attachmentIds;
}
