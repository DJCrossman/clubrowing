"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export function ComposerPicture({ file }: { file: File }) {
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);

	useEffect(() => {
		const url = URL.createObjectURL(file);
		setPreviewUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [file]);

	return (
		previewUrl && (
			<Image
				src={previewUrl}
				alt={file.name}
				fill
				unoptimized
				className="object-cover"
			/>
		)
	);
}
