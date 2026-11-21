import { splitTextByMentions } from "@/lib/chat/mentions";
import type { ChatMessage } from "@/lib/trpc/types";
import { cn } from "@/lib/utils";
import { LinkifiedText } from "./LinkifiedText";

export function MessageText({
	text,
	mentions,
}: {
	text: string;
	mentions: ChatMessage["mentions"];
}) {
	return splitTextByMentions({ text, mentions }).map((part, index) => {
		if (part.kind === "text") {
			// biome-ignore lint/suspicious/noArrayIndexKey: parts come from static text
			return <LinkifiedText key={index} text={part.value} />;
		}
		return (
			<mark
				// biome-ignore lint/suspicious/noArrayIndexKey: parts come from static text
				key={index}
				className={cn(
					"rounded px-1 py-px font-medium",
					part.mention.isMe
						? "bg-sidebar-primary text-sidebar-primary-foreground"
						: "bg-white/10 text-foreground",
				)}
			>
				{part.mention.name ? `@${part.mention.name}` : part.value}
			</mark>
		);
	});
}
