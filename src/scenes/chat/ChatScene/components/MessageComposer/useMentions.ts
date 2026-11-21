import {
	type KeyboardEvent,
	type RefObject,
	useCallback,
	useId,
	useRef,
	useState,
} from "react";
import { type UseFormReturn, useWatch } from "react-hook-form";
import { getMentionQuery, locateMentions } from "@/lib/chat/mentions";
import { trpcClient } from "@/lib/trpc/client";
import type { ChatMembers, ChatMessage } from "@/lib/trpc/types";
import type { MessageComposerValues } from "@/schemas/chat.schema";

export function useMentions({
	channelId,
	form,
	textareaRef,
}: {
	channelId: string;
	form: UseFormReturn<MessageComposerValues>;
	textareaRef: RefObject<HTMLTextAreaElement | null>;
}) {
	const listId = useId();
	const picked = useRef<{ userId: string; label: string }[]>([]);
	const [caret, setCaret] = useState<number | null>(null);
	// The list stays closed for a mention until its name is shortened again.
	const [dismissed, setDismissed] = useState<{
		start: number;
		query: string;
	} | null>(null);
	const [highlight, setHighlight] = useState({ key: "", index: 0 });
	const text = useWatch({ control: form.control, name: "text" }) ?? "";
	const mentionQuery = caret === null ? null : getMentionQuery({ text, caret });

	const membersQuery = trpcClient.chat.getMembers.useQuery(
		{ channelId },
		{ enabled: mentionQuery !== null },
	);
	const needle = mentionQuery?.query.toLowerCase() ?? "";
	const suggestions = mentionQuery
		? (membersQuery.data?.data ?? []).filter((person) => {
				const name = person.name.toLowerCase();
				return (
					name.startsWith(needle) ||
					name.split(/\s+/).some((word) => word.startsWith(needle))
				);
			})
		: [];
	const isOpen =
		!!mentionQuery &&
		suggestions.length > 0 &&
		!(
			dismissed?.start === mentionQuery.start &&
			mentionQuery.query.startsWith(dismissed.query)
		);
	const highlightKey = mentionQuery
		? `${mentionQuery.start}:${mentionQuery.query}`
		: "";
	const highlightedIndex =
		highlight.key === highlightKey
			? Math.max(0, Math.min(highlight.index, suggestions.length - 1))
			: 0;
	const highlighted = isOpen ? suggestions[highlightedIndex] : undefined;

	const startEditing = useCallback((message: ChatMessage) => {
		const text = message.text ?? "";
		for (const { userId, start, length } of message.mentions) {
			picked.current.push({ userId, label: text.slice(start, start + length) });
		}
		setDismissed(getMentionQuery({ text, caret: text.length }));
	}, []);

	const pick = (person: ChatMembers[number]) => {
		const element = textareaRef.current;
		if (!mentionQuery || caret === null) return;
		const label = `@${person.name}`;
		const value = form.getValues("text");
		const position = mentionQuery.start + label.length + 1;
		picked.current.push({ userId: person.id, label });
		form.setValue(
			"text",
			`${value.slice(0, mentionQuery.start)}${label} ${value.slice(caret)}`,
			{ shouldDirty: true },
		);
		setDismissed({ start: mentionQuery.start, query: person.name });
		setCaret(position);
		element?.focus();
		element?.setSelectionRange(position, position);
	};

	return {
		isOpen,
		suggestions,
		highlightedIndex,
		listId,
		activeOptionId: highlighted ? `${listId}-${highlighted.id}` : undefined,
		pick,
		highlightAt: (index: number) => setHighlight({ key: highlightKey, index }),
		onSelect: (event: { currentTarget: HTMLTextAreaElement }) => {
			const { value, selectionStart } = event.currentTarget;
			setCaret(selectionStart);
			if (!getMentionQuery({ text: value, caret: selectionStart })) {
				setDismissed(null);
			}
		},
		onBlur: () => setCaret(null),
		onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => {
			if (!mentionQuery || !isOpen || !highlighted) return false;
			if (event.nativeEvent.isComposing) return false;
			if (event.key === "ArrowDown" || event.key === "ArrowUp") {
				event.preventDefault();
				const step = event.key === "ArrowDown" ? 1 : -1;
				const index =
					(highlightedIndex + step + suggestions.length) % suggestions.length;
				setHighlight({ key: highlightKey, index });
				document
					.getElementById(`${listId}-${suggestions[index].id}`)
					?.scrollIntoView({ block: "nearest" });
				return true;
			}
			if ((event.key === "Enter" || event.key === "Tab") && !event.shiftKey) {
				event.preventDefault();
				pick(highlighted);
				return true;
			}
			if (event.key === "Escape") {
				event.preventDefault();
				setDismissed(mentionQuery);
				return true;
			}
			return false;
		},
		startMention: () => {
			const element = textareaRef.current;
			const value = form.getValues("text");
			const start = element?.selectionStart ?? value.length;
			const end = element?.selectionEnd ?? value.length;
			const inserted = start > 0 && !/\s/.test(value[start - 1]) ? " @" : "@";
			const position = start + inserted.length;
			form.setValue(
				"text",
				`${value.slice(0, start)}${inserted}${value.slice(end)}`,
				{ shouldDirty: true },
			);
			setCaret(position);
			element?.focus();
			element?.setSelectionRange(position, position);
		},
		startEditing,
		locate: (text: string) => locateMentions({ text, picked: picked.current }),
	};
}
