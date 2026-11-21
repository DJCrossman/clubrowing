import { useLayoutEffect, useRef } from "react";
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
	const listRef = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		const list = listRef.current;
		const composer = list?.offsetParent;
		if (!list || !composer) return;
		let frame = 0;
		// The list never grows past the top of the screen. The message box moves
		// when the keyboard opens, after the viewport has reported it, so the room
		// is read on every frame while the list is open. 12 px keeps the 6 px gap
		// under the list and leaves 6 px above it.
		const measure = () => {
			list.style.setProperty(
				"--room-above",
				`${composer.getBoundingClientRect().top - (window.visualViewport?.offsetTop ?? 0) - 12}px`,
			);
			frame = requestAnimationFrame(measure);
		};
		measure();
		return () => cancelAnimationFrame(frame);
	}, []);

	return (
		<div
			ref={listRef}
			id={id}
			role="listbox"
			aria-label="People to mention"
			onMouseDown={(event) => event.preventDefault()}
			className="absolute bottom-full left-0 z-20 mb-1.5 max-h-[min(14rem,var(--room-above,100vh))] w-full overflow-y-auto rounded-xl border border-input bg-card p-1 shadow-md md:w-72 md:max-w-full"
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
