import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";
import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { envVars } from "@/lib/env";
import { createServerCaller } from "@/trpc/caller";

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await params;
		const caller = await createServerCaller();
		const activity = await caller.activities.getActivityById({ id });
		if (!activity?.hasScreenshot) {
			return NextResponse.json(
				{ error: "That screenshot isn't available." },
				{ status: 404 },
			);
		}

		if (!envVars.BLOB_READ_WRITE_TOKEN) {
			return NextResponse.json(
				{ error: "Photo storage isn't set up on this server yet." },
				{ status: 503 },
			);
		}

		const row = await db.activity.findUnique({
			where: { id },
			select: { screenshot: { select: { url: true } } },
		});
		const result =
			row?.screenshot &&
			(await get(row.screenshot.url, {
				access: "private",
				ifNoneMatch: request.headers.get("If-None-Match") ?? undefined,
			}));
		if (!result) {
			return NextResponse.json(
				{ error: "That screenshot isn't available." },
				{ status: 404 },
			);
		}
		if (result.statusCode === 304) {
			return new Response(null, { status: 304 });
		}

		return new Response(result.stream, {
			headers: {
				"Content-Type": result.blob.contentType,
				ETag: result.blob.etag,
				// An activity's screenshot is attached once and never replaced, so a device needs to download it only once.
				"Cache-Control": "private, max-age=31536000, immutable",
				"X-Content-Type-Options": "nosniff",
			},
		});
	} catch (error) {
		if (error instanceof TRPCError) {
			return NextResponse.json(
				{ error: error.message },
				{ status: getHTTPStatusCodeFromError(error) },
			);
		}
		console.error("Error loading screenshot:", error);
		return NextResponse.json(
			{ error: "The screenshot couldn't be loaded. Try again." },
			{ status: 500 },
		);
	}
}
