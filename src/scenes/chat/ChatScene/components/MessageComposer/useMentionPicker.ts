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
import type { ChatMembers, ChatMessage } from "@/lib/trpc/types";
import type { MessageComposerValues } from "@/schemas/chat.schema";

export function useMentionPicker({
	members,
	form,
	textareaRef,
	onMentioningChange,
}: {
	members: ChatMembers;
	form: UseFormReturn<MessageComposerValues>;
	textareaRef: RefObject<HTMLTextAreaElement | null>;
	onMentioningChange: (isMentioning: boolean) => void;
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

	const needle = mentionQuery?.query.toLowerCase() ?? "";
	const suggestions = mentionQuery
		? members.filter((person) => {
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
		const nextValue = `${value.slice(0, mentionQuery.start)}${label} ${value.slice(caret)}`;
		picked.current.push({ userId: person.id, label });
		form.setValue("text", nextValue, { shouldDirty: true });
		setDismissed({ start: mentionQuery.start, query: person.name });
		setCaret(position);
		onMentioningChange(
			getMentionQuery({ text: nextValue, caret: position }) !== null,
		);
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
			// The form's text, not the box's: Escape ending an edit resets the form
			// in this same keypress, before the box shows the draft.
			onMentioningChange(
				getMentionQuery({
					text: form.getValues("text"),
					caret: selectionStart,
				}) !== null,
			);
		},
		onBlur: () => {
			setCaret(null);
			onMentioningChange(false);
		},
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
			const nextValue = `${value.slice(0, start)}${inserted}${value.slice(end)}`;
			form.setValue("text", nextValue, { shouldDirty: true });
			setCaret(position);
			onMentioningChange(
				getMentionQuery({ text: nextValue, caret: position }) !== null,
			);
			element?.focus();
			element?.setSelectionRange(position, position);
		},
		startEditing,
		locate: (text: string) => locateMentions({ text, picked: picked.current }),
		hasMentionAtCaret: (text: string) =>
			caret !== null && getMentionQuery({ text, caret }) !== null,
	};
}
