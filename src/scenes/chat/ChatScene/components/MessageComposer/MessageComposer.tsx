"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
	IconArrowBackUp,
	IconAt,
	IconCheck,
	IconGif,
	IconLoader2,
	IconMoodSmile,
	IconPencil,
	IconPlus,
	IconSend,
	IconX,
} from "@tabler/icons-react";
import { type ComponentProps, useEffect, useId, useRef } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ChatMessage } from "@/lib/trpc/types";
import { cn } from "@/lib/utils";
import {
	type MessageComposerValues,
	messageComposerSchema,
} from "@/schemas/chat.schema";
import { getMessagePreviewText } from "../../utils/messageFormatting";
import { EmojiPicker } from "../EmojiPicker/EmojiPicker";
import { GifPicker } from "../GifPicker/GifPicker";
import { ComposerFileStrip } from "./ComposerFileStrip";

export type ComposerSubmission = {
	text?: string;
	gif?: string;
	files: File[];
	alsoSendToChannel: boolean;
};

interface MessageComposerProps {
	placeholder: string;
	alsoSendToLabel?: string;
	quotedMessage?: ChatMessage | null;
	onCancelQuote?: () => void;
	onSubmit: (submission: ComposerSubmission) => Promise<unknown>;
	editingMessage?: ChatMessage | null;
	onCancelEdit?: () => void;
	onSaveEdit?: (message: ChatMessage, text: string) => Promise<unknown>;
	onEditLastMessage?: () => void;
}

export function MessageComposer({
	placeholder,
	alsoSendToLabel,
	quotedMessage,
	onCancelQuote,
	onSubmit,
	editingMessage,
	onCancelEdit,
	onSaveEdit,
	onEditLastMessage,
}: MessageComposerProps) {
	const alsoSendToId = useId();
	const isThread = !!alsoSendToLabel;
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const draftBeforeEdit = useRef<MessageComposerValues | null>(null);
	const form = useForm<MessageComposerValues>({
		resolver: zodResolver(messageComposerSchema),
		defaultValues: { text: "", alsoSendToChannel: false, files: [] },
	});
	const hasText = !!useWatch({ control: form.control, name: "text" })?.trim();
	const files = useWatch({ control: form.control, name: "files" });
	const canSend = hasText || files.length > 0;
	const isSending = form.formState.isSubmitting && files.length > 0;
	const { ref: registerTextRef, ...textField } = form.register("text");

	useEffect(() => {
		if (quotedMessage) {
			textareaRef.current?.focus();
		}
	}, [quotedMessage]);

	useEffect(() => {
		if (!editingMessage) return;
		draftBeforeEdit.current ??= form.getValues();
		const text = editingMessage.text ?? "";
		form.reset({ text, alsoSendToChannel: false, files: [] });
		textareaRef.current?.focus();
		textareaRef.current?.setSelectionRange(text.length, text.length);
	}, [editingMessage, form]);

	const finishEditing = () => {
		form.reset(
			draftBeforeEdit.current ?? {
				text: "",
				alsoSendToChannel: false,
				files: [],
			},
		);
		draftBeforeEdit.current = null;
		onCancelEdit?.();
	};

	const submit = form.handleSubmit(async (values) => {
		if (!values.text && !values.files.length) return;
		if (editingMessage) {
			await onSaveEdit?.(editingMessage, values.text).then(
				finishEditing,
				() => undefined,
			);
			return;
		}
		if (values.files.length) {
			await onSubmit(values).then(
				() => form.reset({ text: "", alsoSendToChannel: false, files: [] }),
				() => undefined,
			);
			return;
		}
		form.reset({ text: "", alsoSendToChannel: false, files: [] });
		try {
			await onSubmit(values);
		} catch {
			form.reset(values);
		}
	});

	return (
		<div>
			{editingMessage && (
				<div className="flex items-center gap-2 rounded-t-[10px] border border-b-0 border-input bg-card px-2.5 py-1.5 text-[13px] text-muted-foreground">
					<IconPencil className="size-3.5 shrink-0" />
					<p className="min-w-0 flex-1 truncate">
						<span className="font-medium text-foreground">Editing message</span>
						{" · Escape to cancel, Enter to save"}
					</p>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="size-6 text-muted-foreground"
						aria-label="Cancel editing"
						onClick={finishEditing}
					>
						<IconX />
					</Button>
				</div>
			)}
			{quotedMessage && !editingMessage && (
				<div className="flex items-center gap-2 rounded-t-[10px] border border-b-0 border-input bg-card px-2.5 py-1.5 text-[13px] text-muted-foreground">
					<IconArrowBackUp className="size-3.5 shrink-0" />
					<p className="min-w-0 flex-1 truncate">
						Replying to{" "}
						<span className="font-medium text-foreground">
							{quotedMessage.author.name}
						</span>{" "}
						— {getMessagePreviewText(quotedMessage)}
					</p>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="size-6 text-muted-foreground"
						aria-label="Cancel reply"
						onClick={onCancelQuote}
					>
						<IconX />
					</Button>
				</div>
			)}
			<form
				onSubmit={submit}
				className={cn(
					"flex flex-col rounded-[10px] border border-input bg-white/[0.043] focus-within:border-ring",
					(quotedMessage || editingMessage) && "rounded-t-none",
					editingMessage && "border-ring",
				)}
			>
				{files.length > 0 && (
					<ComposerFileStrip
						files={files}
						disabled={isSending}
						onRemove={(index) =>
							form.setValue(
								"files",
								files.filter((_, fileIndex) => fileIndex !== index),
								{ shouldValidate: true },
							)
						}
					/>
				)}
				<Textarea
					{...textField}
					ref={(element) => {
						registerTextRef(element);
						textareaRef.current = element;
					}}
					rows={1}
					readOnly={isSending}
					placeholder={placeholder}
					aria-label={editingMessage ? "Edit message" : placeholder}
					onKeyDown={(event) => {
						if (event.key === "Escape" && editingMessage) {
							finishEditing();
							return;
						}
						if (
							event.key === "ArrowUp" &&
							!editingMessage &&
							!event.currentTarget.value &&
							onEditLastMessage
						) {
							event.preventDefault();
							onEditLastMessage();
							return;
						}
						if (event.key === "Escape" && quotedMessage) {
							onCancelQuote?.();
							return;
						}
						if (
							event.key === "Enter" &&
							!event.shiftKey &&
							!event.nativeEvent.isComposing
						) {
							event.preventDefault();
							if (!isSending) void submit();
						}
					}}
					className={cn(
						"max-h-48 resize-none rounded-none border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 md:text-sm dark:bg-transparent",
						isThread ? "min-h-[42px] px-3 py-2.5" : "min-h-11 px-3.5 py-3",
					)}
				/>
				<div
					className={cn(
						"flex items-center gap-0.5 px-1.5 pb-1.5",
						isThread ? "pt-0.5" : "pt-1",
					)}
				>
					{!isThread && !editingMessage && (
						<>
							<ComposerButton
								label="Add files"
								disabled={isSending}
								onClick={() => fileInputRef.current?.click()}
							>
								<IconPlus />
							</ComposerButton>
							<input
								ref={fileInputRef}
								type="file"
								multiple
								hidden
								aria-label="Choose files"
								onChange={(event) => {
									const chosen = [...(event.target.files ?? [])];
									event.target.value = "";
									if (!chosen.length) return;
									form.setValue("files", [...files, ...chosen], {
										shouldValidate: true,
									});
								}}
							/>
						</>
					)}
					{!editingMessage && (
						<GifPicker
							onSelect={(gif) =>
								onSubmit({
									gif,
									files: [],
									alsoSendToChannel: form.getValues("alsoSendToChannel"),
								})
									.then(() => form.setValue("alsoSendToChannel", false))
									.catch(() => undefined)
							}
						>
							<ComposerButton
								label="Add a GIF"
								className="[&_svg]:size-5"
								disabled={isSending}
							>
								<IconGif />
							</ComposerButton>
						</GifPicker>
					)}
					<EmojiPicker
						align="start"
						restoreFocus={false}
						onSelect={(emoji) => {
							const element = textareaRef.current;
							const value = form.getValues("text");
							const start = element?.selectionStart ?? value.length;
							const end = element?.selectionEnd ?? value.length;
							form.setValue(
								"text",
								`${value.slice(0, start)}${emoji}${value.slice(end)}`,
								{ shouldDirty: true },
							);
							requestAnimationFrame(() => {
								element?.focus();
								element?.setSelectionRange(
									start + emoji.length,
									start + emoji.length,
								);
							});
						}}
					>
						<ComposerButton label="Add emoji" disabled={isSending}>
							<IconMoodSmile />
						</ComposerButton>
					</EmojiPicker>
					{!isThread && !editingMessage && (
						<ComposerButton label="Mention someone (coming soon)" disabled>
							<IconAt />
						</ComposerButton>
					)}
					{alsoSendToLabel && !editingMessage && (
						<Controller
							control={form.control}
							name="alsoSendToChannel"
							render={({ field }) => (
								<div className="ml-1 flex min-w-0 items-center gap-1.5">
									<Checkbox
										id={alsoSendToId}
										checked={field.value}
										onCheckedChange={(checked) =>
											field.onChange(checked === true)
										}
									/>
									<Label
										htmlFor={alsoSendToId}
										className="truncate text-xs font-normal text-muted-foreground"
									>
										{alsoSendToLabel}
									</Label>
								</div>
							)}
						/>
					)}
					<Button
						type="submit"
						size="icon"
						className={cn(
							"ml-auto h-[30px] w-8 rounded-md disabled:opacity-100",
							canSend
								? "bg-primary text-primary-foreground hover:bg-primary/90"
								: "bg-muted text-muted-foreground",
						)}
						disabled={!canSend || isSending}
						aria-busy={isSending}
						aria-label={editingMessage ? "Save edit" : "Send message"}
						title={editingMessage ? "Save" : "Send"}
					>
						{editingMessage && <IconCheck />}
						{!editingMessage && isSending && (
							<IconLoader2 aria-hidden className="animate-spin" />
						)}
						{!editingMessage && !isSending && <IconSend />}
					</Button>
				</div>
				{form.formState.errors.text && (
					<p className="px-3 pb-2 text-xs text-destructive">
						{form.formState.errors.text.message}
					</p>
				)}
				{form.formState.errors.files && (
					<p className="px-3 pb-2 text-xs text-destructive">
						{form.formState.errors.files.message}
					</p>
				)}
			</form>
		</div>
	);
}

function ComposerButton({
	label,
	className,
	...props
}: ComponentProps<typeof Button> & { label: string }) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon"
			aria-label={label}
			title={label}
			className={cn(
				"size-[30px] rounded-md text-muted-foreground [&_svg]:size-[17px]",
				className,
			)}
			{...props}
		/>
	);
}
