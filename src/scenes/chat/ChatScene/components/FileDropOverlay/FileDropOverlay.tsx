import { IconUpload } from "@tabler/icons-react";

export function FileDropOverlay() {
	return (
		<div className="pointer-events-none absolute inset-0 z-20 bg-background/80 p-3">
			<div className="flex size-full flex-col items-center justify-center gap-2 rounded-[10px] border-2 border-dashed border-ring text-center">
				<div className="flex size-12 items-center justify-center rounded-xl bg-muted">
					<IconUpload className="size-[22px]" />
				</div>
				<p className="text-[15px] font-semibold">
					Drop files to add them to your message
				</p>
			</div>
		</div>
	);
}
