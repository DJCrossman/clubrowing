export function PromptSummary({ prompt }: { prompt: string }) {
	return (
		<div className="space-y-1">
			<p className="text-sm font-medium">Your prompt</p>
			<p className="whitespace-pre-wrap rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
				{prompt}
			</p>
		</div>
	);
}
