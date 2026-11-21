import { InitialsAvatar } from "@/components/chat/initials-avatar";
import type { ChatMembers } from "@/lib/trpc/types";
import { cn } from "@/lib/utils";

interface MentionListProps {
	id: string;
	people: ChatMembers;
	highlightedIndex: number;
	onHighlight: (index: number) => void;
	onPick: (person: ChatMembers[number]) => void;
}

export function MentionList({
	id,
	people,
	highlightedIndex,
	onHighlight,
	onPick,
}: MentionListProps) {
	return (
		<div
			id={id}
			role="listbox"
			aria-label="People to mention"
			onMouseDown={(event) => event.preventDefault()}
			className="absolute bottom-full left-0 z-20 mb-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-input bg-card p-1 shadow-md md:w-72 md:max-w-full"
		>
			{people.map((person, index) => (
				// biome-ignore lint/a11y/useKeyWithClickEvents: the message box keeps focus and handles the keys
				<div
					key={person.id}
					id={`${id}-${person.id}`}
					role="option"
					tabIndex={-1}
					aria-label={person.name}
					aria-selected={index === highlightedIndex}
					onMouseEnter={() => onHighlight(index)}
					onClick={() => onPick(person)}
					className={cn(
						"flex min-h-10 cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm select-none",
						index === highlightedIndex && "bg-accent text-accent-foreground",
					)}
				>
					<InitialsAvatar
						initials={person.initials}
						size="sm"
						className="rounded-full"
					/>
					<span className="min-w-0 flex-1 truncate">{person.name}</span>
				</div>
			))}
		</div>
	);
}
