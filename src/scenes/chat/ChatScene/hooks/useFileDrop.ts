import { useEffect, useEffectEvent, useRef, useState } from "react";

// A photo or avatar dragged from this page carries a file too. Drags that start
// in the page are marked with this type so only files from outside count.
const PAGE_DRAG_TYPE = "application/x-rrc-page-drag";

export function useFileDrop({
	isDisabled,
	onDrop,
}: {
	isDisabled: boolean;
	onDrop: (files: File[]) => void;
}) {
	const targetRef = useRef<HTMLElement>(null);
	const enteredElements = useRef<EventTarget[]>([]);
	const [isDraggingFiles, setIsDraggingFiles] = useState(false);

	const enter = useEffectEvent((event: DragEvent) => {
		if (!event.target || !targetRef.current?.contains(event.target as Node)) {
			return;
		}
		enteredElements.current = [...enteredElements.current, event.target];
		if (!isDisabled && isBringingFilesIn(event)) setIsDraggingFiles(true);
	});

	const drop = useEffectEvent((event: DragEvent) => {
		enteredElements.current = [];
		setIsDraggingFiles(false);
		if (!isBringingFilesIn(event)) return;
		// Without this the browser opens the file in place of the app.
		event.preventDefault();
		if (isDisabled || !targetRef.current?.contains(event.target as Node)) {
			return;
		}
		onDrop([...(event.dataTransfer?.files ?? [])]);
	});

	useEffect(() => {
		const markPageDrag = (event: DragEvent) =>
			event.dataTransfer?.setData(PAGE_DRAG_TYPE, "1");
		const allowDrop = (event: DragEvent) => {
			if (isBringingFilesIn(event)) event.preventDefault();
		};
		// The pointer enters a child before it leaves the previous one, so the
		// drag has left the target only once every entered element has been left.
		const leave = (event: DragEvent) => {
			const stillEntered = enteredElements.current.filter((element) =>
				targetRef.current?.contains(element as Node),
			);
			const left = stillEntered.indexOf(event.target as EventTarget);
			if (left !== -1) stillEntered.splice(left, 1);
			enteredElements.current = stillEntered;
			if (!stillEntered.length) setIsDraggingFiles(false);
		};
		window.addEventListener("dragstart", markPageDrag);
		window.addEventListener("dragenter", enter);
		window.addEventListener("dragover", allowDrop);
		window.addEventListener("dragleave", leave);
		window.addEventListener("drop", drop);
		return () => {
			window.removeEventListener("dragstart", markPageDrag);
			window.removeEventListener("dragenter", enter);
			window.removeEventListener("dragover", allowDrop);
			window.removeEventListener("dragleave", leave);
			window.removeEventListener("drop", drop);
		};
	}, []);

	return { targetRef, isDraggingFiles };
}

function isBringingFilesIn(event: DragEvent) {
	const types = event.dataTransfer?.types ?? [];
	return types.includes("Files") && !types.includes(PAGE_DRAG_TYPE);
}
