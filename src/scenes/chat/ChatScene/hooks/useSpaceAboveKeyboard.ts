import { useEffect, useState } from "react";

export function useSpaceAboveKeyboard({ isEnabled }: { isEnabled: boolean }) {
	const [space, setSpace] = useState<{ top: number; height: number }>();

	useEffect(() => {
		const viewport = window.visualViewport;
		if (!isEnabled || !viewport) return;
		const measure = () => {
			if (window.innerHeight - viewport.height * viewport.scale <= 100) {
				setSpace(undefined);
				return;
			}
			setSpace((current) => {
				if (
					current?.top === viewport.offsetTop &&
					current.height === viewport.height
				) {
					return current;
				}
				return { top: viewport.offsetTop, height: viewport.height };
			});
		};
		viewport.addEventListener("resize", measure);
		viewport.addEventListener("scroll", measure);
		measure();
		return () => {
			viewport.removeEventListener("resize", measure);
			viewport.removeEventListener("scroll", measure);
		};
	}, [isEnabled]);

	return isEnabled ? space : undefined;
}
