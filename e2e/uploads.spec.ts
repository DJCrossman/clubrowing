import { expect, test } from "@playwright/test";
import { signInAs } from "./sign-in";

const PNG = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADElEQVQImWM4w8AAAAJoAM1w/7HYAAAAAElFTkSuQmCC",
	"base64",
);

test("a member uploads a photo and gets its id back", async ({ page }) => {
	await signInAs(page, "member");

	const response = await page.request.post("/api/v1/uploads", {
		multipart: {
			file: { name: "photo.png", mimeType: "image/png", buffer: PNG },
		},
	});

	expect(response.status()).toBe(200);
	expect(await response.json()).toHaveProperty("id");
});

test("an upload without a session is refused", async ({ page }) => {
	const response = await page.request.post("/api/v1/uploads", {
		multipart: {
			file: { name: "photo.png", mimeType: "image/png", buffer: PNG },
		},
	});

	expect(response.status()).toBe(401);
});

test("a file that only claims to be an image is rejected", async ({ page }) => {
	await signInAs(page, "member");

	const response = await page.request.post("/api/v1/uploads", {
		multipart: {
			file: {
				name: "photo.png",
				mimeType: "image/png",
				buffer: Buffer.from("not an image"),
			},
		},
	});

	expect(response.status()).toBe(400);
});
