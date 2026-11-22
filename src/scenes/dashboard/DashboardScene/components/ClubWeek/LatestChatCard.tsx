import Link from "next/link";
import { InitialsAvatar } from "@/components/chat/initials-avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { routes } from "@/lib/routes";
import type { ChatMessage } from "@/lib/trpc/types";
import {
	formatMessageTime,
	getMessagePreviewText,
} from "@/scenes/chat/ChatScene/utils/messageFormatting";
import { ClubWeekCard } from "./ClubWeekCard";

interface LatestChatCardProps {
	channelId: string | undefined;
	messages: ChatMessage[];
	isLoading: boolean;
}

export const LatestChatCard = ({
	channelId,
	messages,
	isLoading,
}: LatestChatCardProps) => {
	const chatHref = channelId ? routes.chat.channel(channelId) : undefined;

	return (
		<ClubWeekCard
			title="Latest in chat"
			className="gap-1"
			action={
				chatHref && (
					<Button
						variant="outline"
						size="sm"
						className="h-7 text-xs"
						render={<Link href={chatHref} />}
					>
						Open chat
					</Button>
				)
			}
		>
			<LatestMessages
				chatHref={chatHref}
				isLoading={isLoading}
				messages={messages}
			/>
		</ClubWeekCard>
	);
};

const LatestMessages = ({
	chatHref,
	isLoading,
	messages,
}: {
	chatHref: string | undefined;
	isLoading: boolean;
	messages: ChatMessage[];
}) => {
	if (!chatHref || isLoading) {
		return <Skeleton className="h-24 w-full" />;
	}
	if (messages.length === 0) {
		return (
			<p className="text-[13px] text-muted-foreground">
				No messages yet. Say hello to the group.
			</p>
		);
	}
	return (
		<ul className="flex flex-col">
			{messages.map((message) => (
				<li key={message.id}>
					<Link
						href={chatHref}
						className="-mx-1.5 flex gap-2.5 rounded-lg px-1.5 py-1 hover:bg-muted"
					>
						<InitialsAvatar
							initials={message.author.initials}
							name={message.author.name}
							size="sm"
							className="size-7"
						/>
						<span className="flex min-w-0 flex-1 flex-col">
							<span className="flex items-baseline gap-2">
								<span className="truncate text-[13px] font-semibold">
									{message.author.name}
								</span>
								<span className="text-xs whitespace-nowrap text-muted-foreground">
									{formatMessageTime(message.createdAt)}
								</span>
							</span>
							<span className="truncate text-[13px] text-foreground/80">
								{message.forwarded && !message.text
									? `Forwarded: ${getMessagePreviewText(message)}`
									: getMessagePreviewText(message)}
							</span>
						</span>
					</Link>
				</li>
			))}
		</ul>
	);
};
