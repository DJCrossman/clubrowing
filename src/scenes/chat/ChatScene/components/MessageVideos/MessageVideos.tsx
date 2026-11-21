"use client";

import { IconDownload } from "@tabler/icons-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpcClient } from "@/lib/trpc/client";
import type { ChatMessage } from "@/lib/trpc/types";
import { formatLastReply } from "../../utils/messageFormatting";

interface MessageVideosProps {
	videos: ChatMessage["videos"];
	pausedUntil: string | null;
}

export function MessageVideos({ videos, pausedUntil }: MessageVideosProps) {
	const utils = trpcClient.useUtils();
	const [failedIds, setFailedIds] = useState<string[]>([]);

	return (
		<ul className="flex w-full max-w-80 flex-col gap-2">
			{videos.map((video) => {
				const aspectRatio =
					video.width && video.height ? video.width / video.height : 16 / 9;
				const isFailed = failedIds.includes(video.id);
				return (
					<li key={video.id} className="flex flex-col gap-1">
						<div
							className="relative overflow-hidden rounded-[10px] bg-black"
							style={{
								aspectRatio,
								width: `min(100%, 15rem, ${20 * aspectRatio}rem)`,
							}}
						>
							{pausedUntil && (
								<>
									{video.posterUrl && (
										<Image
											src={video.posterUrl}
											alt=""
											fill
											unoptimized
											loading="lazy"
											className="object-contain opacity-50"
										/>
									)}
									<p className="absolute inset-x-0 bottom-0 bg-black/75 px-3 py-2 text-[13px] text-white">
										Videos are paused until {formatLastReply(pausedUntil)}.
									</p>
								</>
							)}
							{!pausedUntil && isFailed && (
								<div className="flex size-full flex-col items-center justify-center gap-2 p-3 text-center">
									<p className="text-[13px] text-white">
										This video can't play here.
									</p>
									<div className="flex flex-wrap justify-center gap-2">
										<Button
											type="button"
											variant="secondary"
											size="sm"
											onClick={() =>
												setFailedIds((current) =>
													current.filter((id) => id !== video.id),
												)
											}
										>
											Try again
										</Button>
										<Button
											variant="outline"
											size="sm"
											render={
												<a
													href={`${video.playUrl}?download=1`}
													download={video.name}
												>
													<IconDownload aria-hidden />
													Download
												</a>
											}
										/>
									</div>
								</div>
							)}
							{!pausedUntil && !isFailed && (
								// biome-ignore lint/a11y/useMediaCaption: members' clips come without captions
								<video
									controls
									playsInline
									preload="none"
									poster={video.posterUrl ?? undefined}
									src={video.playUrl}
									aria-label={video.name}
									onError={() => {
										setFailedIds((current) => [...current, video.id]);
										// Playback may have been paused since the page loaded.
										void utils.chat.getMessages.invalidate();
									}}
									className="size-full object-contain"
								/>
							)}
						</div>
						<p className="flex min-w-0 items-baseline gap-2">
							<span className="truncate text-sm" title={video.name}>
								{video.name}
							</span>
							<span className="shrink-0 text-xs text-muted-foreground">
								{video.size < 1024 * 1024
									? `${Math.ceil(video.size / 1024)} KB`
									: `${(video.size / 1024 / 1024).toFixed(1)} MB`}
								{video.durationMs !== null &&
									` · ${Math.floor(video.durationMs / 60_000)}:${String(
										Math.floor(video.durationMs / 1000) % 60,
									).padStart(2, "0")}`}
							</span>
						</p>
					</li>
				);
			})}
		</ul>
	);
}
