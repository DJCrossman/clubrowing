import { describe, expect, it } from "vitest";
import { blankVideoLocation } from "./blankVideoLocation";

const LOCATION = "+50.4452-104.6189/";
const ftyp = box({
	type: "ftyp",
	body: [Buffer.from("isom"), Buffer.alloc(4)],
});
const mdat = box({ type: "mdat", body: [Buffer.from("frames of the river")] });
const mvhd = box({ type: "mvhd", body: [Buffer.from([1, 2, 3, 4, 5])] });
const XMP_UUID = Buffer.from("be7acfcb97a942e89c71999491e3afac", "hex");
const keys = box({
	type: "keys",
	body: [
		Buffer.alloc(4),
		Buffer.from([0, 0, 0, 2]),
		box({
			type: "mdta",
			body: [Buffer.from("com.apple.quicktime.location.ISO6709")],
		}),
		box({ type: "mdta", body: [Buffer.from("com.apple.quicktime.make")] }),
	],
});
const ilst = box({
	type: "ilst",
	body: [
		box({
			type: "\0\0\0\x01",
			body: [
				box({
					type: "data",
					body: [
						Buffer.from([0, 0, 0, 1]),
						Buffer.alloc(4),
						Buffer.from(LOCATION),
					],
				}),
			],
		}),
		box({
			type: "\0\0\0\x02",
			body: [
				box({
					type: "data",
					body: [
						Buffer.from([0, 0, 0, 1]),
						Buffer.alloc(4),
						Buffer.from("Apple"),
					],
				}),
			],
		}),
	],
});
const hdlr = box({
	type: "hdlr",
	body: [Buffer.alloc(8), Buffer.from("mdta"), Buffer.alloc(12)],
});

describe("blankVideoLocation", () => {
	it("empties a QuickTime ©xyz location and leaves the other boxes alone", async () => {
		const original = Buffer.concat([
			ftyp,
			mdat,
			box({
				type: "moov",
				body: [
					mvhd,
					box({
						type: "udta",
						body: [
							box({
								type: "\xa9xyz",
								body: [Buffer.alloc(4), Buffer.from(LOCATION)],
							}),
						],
					}),
				],
			}),
		]);

		const blanked = Buffer.from(
			await (await blankVideoLocation(new Blob([original]))).arrayBuffer(),
		);

		expect(blanked.length).toBe(original.length);
		expect(blanked.includes(LOCATION)).toBe(false);
		expect(blanked.includes("\xa9xyz", 0, "latin1")).toBe(false);
		expect(blanked.includes(Buffer.concat([ftyp, mdat]))).toBe(true);
		expect(blanked.includes(mvhd)).toBe(true);
	});

	it("empties the value of an ISO 6709 location key and keeps the other values", async () => {
		const original = Buffer.concat([
			ftyp,
			box({
				type: "moov",
				body: [
					mvhd,
					box({
						type: "udta",
						body: [
							box({
								type: "meta",
								body: [
									Buffer.alloc(4),
									box({
										type: "hdlr",
										body: [
											Buffer.alloc(8),
											Buffer.from("mdta"),
											Buffer.alloc(12),
										],
									}),
									box({
										type: "keys",
										body: [
											Buffer.alloc(4),
											Buffer.from([0, 0, 0, 2]),
											box({
												type: "mdta",
												body: [
													Buffer.from("com.apple.quicktime.location.ISO6709"),
												],
											}),
											box({
												type: "mdta",
												body: [Buffer.from("com.apple.quicktime.make")],
											}),
										],
									}),
									box({
										type: "ilst",
										body: [
											box({
												type: "\0\0\0\x01",
												body: [
													box({
														type: "data",
														body: [
															Buffer.from([0, 0, 0, 1]),
															Buffer.alloc(4),
															Buffer.from(LOCATION),
														],
													}),
												],
											}),
											box({
												type: "\0\0\0\x02",
												body: [
													box({
														type: "data",
														body: [
															Buffer.from([0, 0, 0, 1]),
															Buffer.alloc(4),
															Buffer.from("Apple"),
														],
													}),
												],
											}),
										],
									}),
								],
							}),
						],
					}),
				],
			}),
			mdat,
		]);

		const blanked = Buffer.from(
			await (await blankVideoLocation(new Blob([original]))).arrayBuffer(),
		);

		expect(blanked.length).toBe(original.length);
		expect(blanked.includes(LOCATION)).toBe(false);
		expect(blanked.includes("Apple")).toBe(true);
		expect(blanked.includes(mvhd)).toBe(true);
		expect(blanked.includes(mdat)).toBe(true);
	});

	it("refuses a file with a box inside moov that runs past its parent", async () => {
		const udta = box({
			type: "udta",
			body: [
				box({
					type: "\xa9xyz",
					body: [Buffer.alloc(4), Buffer.from(LOCATION)],
				}),
			],
		});
		udta.writeUInt32BE(4096, 8);

		await expect(
			blankVideoLocation(
				new Blob([
					Buffer.concat([
						ftyp,
						box({ type: "moov", body: [mvhd, udta] }),
						mdat,
					]),
				]),
			),
		).rejects.toThrow();
	});

	it("empties the location in the iPhone layout, a QuickTime meta right under moov", async () => {
		const original = Buffer.concat([
			ftyp,
			box({
				type: "moov",
				body: [mvhd, box({ type: "meta", body: [hdlr, keys, ilst] })],
			}),
			mdat,
		]);

		const blanked = Buffer.from(
			await (await blankVideoLocation(new Blob([original]))).arrayBuffer(),
		);

		expect(blanked.length).toBe(original.length);
		expect(blanked.includes(LOCATION)).toBe(false);
		expect(blanked.includes("Apple")).toBe(true);
		expect(blanked.includes(mdat)).toBe(true);
	});

	it("empties an XMP_ box in moov's user data", async () => {
		const original = Buffer.concat([
			ftyp,
			box({
				type: "moov",
				body: [
					mvhd,
					box({
						type: "udta",
						body: [
							box({
								type: "XMP_",
								body: [
									Buffer.from(
										`<exif:GPSLatitude>${LOCATION}</exif:GPSLatitude>`,
									),
								],
							}),
						],
					}),
				],
			}),
			mdat,
		]);

		const blanked = Buffer.from(
			await (await blankVideoLocation(new Blob([original]))).arrayBuffer(),
		);

		expect(blanked.length).toBe(original.length);
		expect(blanked.includes(LOCATION)).toBe(false);
		expect(blanked.includes("XMP_")).toBe(false);
		expect(blanked.includes(mvhd)).toBe(true);
	});

	it("empties a top-level XMP uuid box with a 32-bit size and leaves what follows alone", async () => {
		const xmp = box({
			type: "uuid",
			body: [XMP_UUID, Buffer.from(`GPSLatitude="${LOCATION}"`)],
		});
		const original = Buffer.concat([
			ftyp,
			xmp,
			mdat,
			box({ type: "moov", body: [mvhd] }),
		]);

		const blanked = Buffer.from(
			await (await blankVideoLocation(new Blob([original]))).arrayBuffer(),
		);

		expect(blanked.length).toBe(original.length);
		expect(blanked.includes(LOCATION)).toBe(false);
		expect(blanked.subarray(ftyp.length, ftyp.length + 8)).toEqual(
			Buffer.concat([xmp.subarray(0, 4), Buffer.from("free")]),
		);
		expect(
			blanked.includes(
				Buffer.concat([mdat, box({ type: "moov", body: [mvhd] })]),
			),
		).toBe(true);
	});

	it("keeps the whole header of a top-level XMP uuid box with a 64-bit size", async () => {
		const content = Buffer.concat([
			XMP_UUID,
			Buffer.from(`GPSLatitude="${LOCATION}"`),
		]);
		const header = Buffer.alloc(16);
		header.writeUInt32BE(1, 0);
		header.write("uuid", 4, "latin1");
		header.writeBigUInt64BE(BigInt(16 + content.length), 8);
		const original = Buffer.concat([
			ftyp,
			header,
			content,
			mdat,
			box({ type: "moov", body: [mvhd] }),
		]);

		const blanked = Buffer.from(
			await (await blankVideoLocation(new Blob([original]))).arrayBuffer(),
		);

		expect(blanked.length).toBe(original.length);
		expect(blanked.includes(LOCATION)).toBe(false);
		expect(blanked.subarray(ftyp.length, ftyp.length + 16)).toEqual(
			Buffer.concat([
				header.subarray(0, 4),
				Buffer.from("free"),
				header.subarray(8),
			]),
		);
		expect(
			blanked.subarray(ftyp.length + 16, ftyp.length + 16 + content.length),
		).toEqual(Buffer.alloc(content.length));
		expect(blanked.subarray(ftyp.length + 16 + content.length)).toEqual(
			Buffer.concat([mdat, box({ type: "moov", body: [mvhd] })]),
		);
	});

	it("empties the location in a top-level meta box", async () => {
		const original = Buffer.concat([
			ftyp,
			box({ type: "meta", body: [Buffer.alloc(4), hdlr, keys, ilst] }),
			box({ type: "moov", body: [mvhd] }),
			mdat,
		]);

		const blanked = Buffer.from(
			await (await blankVideoLocation(new Blob([original]))).arrayBuffer(),
		);

		expect(blanked.length).toBe(original.length);
		expect(blanked.includes(LOCATION)).toBe(false);
		expect(blanked.includes("Apple")).toBe(true);
	});

	it("refuses a compressed moov", async () => {
		await expect(
			blankVideoLocation(
				new Blob([
					Buffer.concat([
						ftyp,
						box({
							type: "moov",
							body: [box({ type: "cmov", body: [Buffer.alloc(16)] })],
						}),
					]),
				]),
			),
		).rejects.toThrow();
	});

	it("refuses an ilst of numbered keys that comes before its keys", async () => {
		await expect(
			blankVideoLocation(
				new Blob([
					Buffer.concat([
						ftyp,
						box({
							type: "moov",
							body: [mvhd, box({ type: "meta", body: [hdlr, ilst, keys] })],
						}),
					]),
				]),
			),
		).rejects.toThrow();
	});

	it("refuses a box that runs past the end of the file", async () => {
		const truncated = Buffer.from(mdat);
		truncated.writeUInt32BE(4096, 0);

		await expect(
			blankVideoLocation(
				new Blob([
					Buffer.concat([ftyp, box({ type: "moov", body: [mvhd] }), truncated]),
				]),
			),
		).rejects.toThrow();
	});

	it("refuses a WebM", async () => {
		await expect(
			blankVideoLocation(
				new Blob([
					Buffer.concat([
						Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81]),
						Buffer.alloc(64),
					]),
				]),
			),
		).rejects.toThrow();
	});

	it("refuses a file with no moov", async () => {
		await expect(
			blankVideoLocation(new Blob([Buffer.concat([ftyp, mdat])])),
		).rejects.toThrow();
	});
});

function box({ type, body }: { type: string; body: Buffer[] }) {
	const content = Buffer.concat(body);
	const header = Buffer.alloc(8);
	header.writeUInt32BE(8 + content.length, 0);
	header.write(type, 4, "latin1");
	return Buffer.concat([header, content]);
}
