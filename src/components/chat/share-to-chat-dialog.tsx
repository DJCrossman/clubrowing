"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ChatTarget } from "@/lib/chat/targets";
import { routes } from "@/lib/routes";
import {
	type ChatTargetFormValues,
	chatTargetFormSchema,
} from "@/schemas/chat.schema";
import { ChatTargetList } from "./chat-target-list";

interface ShareToChatDialogProps {
	open: boolean;
	title: string;
	path: string;
	targets: ChatTarget[];
	isLoadingTargets: boolean;
	onOpenChange: (open: boolean) => void;
	/** Sends the text and answers the chat it went to. */
	onShare: (share: { target: ChatTarget; text: string }) => Promise<string>;
}

export function ShareToChatDialog({
	open,
	title,
	path,
	targets,
	isLoadingTargets,
	onOpenChange,
	onShare,
}: ShareToChatDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="pointer-events-auto z-60 gap-4 rounded-xl sm:max-w-[480px]">
				<DialogHeader>
					<DialogTitle>Share to chat</DialogTitle>
					<DialogDescription className="sr-only">
						Choose a group or person to share {title} with.
					</DialogDescription>
				</DialogHeader>
				{open && (
					<ShareToChatForm
						title={title}
						path={path}
						targets={targets}
						isLoadingTargets={isLoadingTargets}
						onShare={onShare}
						onDone={() => onOpenChange(false)}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

function ShareToChatForm({
	title,
	path,
	targets,
	isLoadingTargets,
	onShare,
	onDone,
}: Omit<ShareToChatDialogProps, "open" | "onOpenChange"> & {
	onDone: () => void;
}) {
	const router = useRouter();
	const form = useForm<ChatTargetFormValues>({
		resolver: zodResolver(chatTargetFormSchema),
		defaultValues: { targetKey: "", note: "" },
	});
	const targetKey = useWatch({ control: form.control, name: "targetKey" });

	return (
		<form
			onSubmit={form.handleSubmit(async ({ targetKey, note }) => {
				const target = targets.find((item) => item.key === targetKey);
				if (!target) return;
				try {
					const url = `${window.location.origin}${path}`;
					const channelId = await onShare({
						target,
						text: note ? `${note}\n${url}` : url,
					});
					onDone();
					toast.success(`Shared to ${target.name}`, {
						action: {
							label: "Open chat",
							onClick: () => router.push(routes.chat.channel(channelId)),
						},
					});
				} catch (error) {
					form.setError("root", {
						message:
							error instanceof Error ? error.message : "Couldn't share this",
					});
				}
			})}
			className="grid gap-4"
		>
			<div className="flex flex-col gap-1 rounded-[10px] border border-input bg-white/[0.03] px-3 py-2.5">
				<p className="text-xs text-muted-foreground">Sharing</p>
				<p className="line-clamp-2 text-sm font-medium">{title}</p>
			</div>
			<div className="grid gap-1.5">
				<p className="text-[13px] font-medium">Send to</p>
				<ChatTargetList
					targets={targets}
					selectedKey={targetKey}
					isLoading={isLoadingTargets}
					onSelect={(key) =>
						form.setValue("targetKey", key, { shouldValidate: true })
					}
				/>
				{form.formState.errors.targetKey && (
					<p className="text-xs text-destructive">
						{form.formState.errors.targetKey.message}
					</p>
				)}
			</div>
			<Input
				placeholder="Add a message (optional)"
				aria-label="Add a message (optional)"
				className="h-9 bg-white/[0.043] dark:bg-white/[0.043]"
				{...form.register("note")}
			/>
			{form.formState.errors.root && (
				<p className="text-xs text-destructive">
					{form.formState.errors.root.message}
				</p>
			)}
			<DialogFooter>
				<Button type="button" variant="outline" onClick={onDone}>
					Cancel
				</Button>
				<Button type="submit" disabled={form.formState.isSubmitting}>
					Share
				</Button>
			</DialogFooter>
		</form>
	);
}
