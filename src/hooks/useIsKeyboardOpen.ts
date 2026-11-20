import * as React from "react";

const MIN_KEYBOARD_HEIGHT = 100;

export function useIsKeyboardOpen() {
	const [isKeyboardOpen, setIsKeyboardOpen] = React.useState(false);

	React.useEffect(() => {
		const viewport = window.visualViewport;
		if (!viewport) return;
		const onResize = () => {
			setIsKeyboardOpen(
				window.innerHeight - viewport.height * viewport.scale >
					MIN_KEYBOARD_HEIGHT,
			);
		};
		viewport.addEventListener("resize", onResize);
		onResize();
		return () => viewport.removeEventListener("resize", onResize);
	}, []);

	return isKeyboardOpen;
}
