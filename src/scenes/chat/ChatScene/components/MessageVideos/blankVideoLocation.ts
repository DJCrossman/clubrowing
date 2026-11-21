type BoxHeader = { size: number; headerSize: number; type: string };

const XMP_UUID = "be7acfcb97a942e89c71999491e3afac";
const MAX_INDEX_BYTES = 16 * 1024 * 1024;
const CONTAINERS = new Set(["moov", "trak", "udta", "meta"]);

export async function blankVideoLocation(file: Blob) {
	const patches: { offset: number; bytes: Uint8Array<ArrayBuffer> }[] = [];
	let hasMoov = false;
	for (let offset = 0; offset + 8 <= file.size; ) {
		const header = new Uint8Array(
			await file.slice(offset, offset + 32).arrayBuffer(),
		);
		const { size, headerSize, type } = readBoxHeader({
			view: new DataView(header.buffer),
			offset: 0,
			remaining: file.size - offset,
		});
		if (size < headerSize || offset + size > file.size) {
			throw new Error("The video file is damaged.");
		}
		if (type === "moov" || type === "meta") {
			if ((type === "moov" && hasMoov) || size > MAX_INDEX_BYTES) {
				throw new Error("The video's index can't be read.");
			}
			hasMoov ||= type === "moov";
			const bytes = new Uint8Array(
				await file.slice(offset, offset + size).arrayBuffer(),
			);
			blankInside({ bytes, start: 0, end: bytes.length });
			patches.push({ offset, bytes });
		}
		if (
			type === "uuid" &&
			Array.from(header.subarray(headerSize, headerSize + 16), (byte) =>
				byte.toString(16).padStart(2, "0"),
			).join("") === XMP_UUID
		) {
			const bytes = new Uint8Array(size);
			bytes.set(header.subarray(0, headerSize));
			bytes.set(new TextEncoder().encode("free"), 4);
			patches.push({ offset, bytes });
		}
		offset += size;
	}
	if (!hasMoov) throw new Error("The video has no index.");
	const parts: BlobPart[] = [];
	let at = 0;
	for (const patch of patches) {
		parts.push(file.slice(at, patch.offset), patch.bytes);
		at = patch.offset + patch.bytes.length;
	}
	parts.push(file.slice(at));
	return new Blob(parts, { type: file.type });
}

function blankInside({
	bytes,
	start,
	end,
}: {
	bytes: Uint8Array;
	start: number;
	end: number;
}) {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const latin1 = new TextDecoder("latin1");
	let locationKeys: Set<number> | null = null;
	for (let offset = start; offset + 8 <= end; ) {
		const { size, headerSize, type } = readBoxHeader({
			view,
			offset,
			remaining: end - offset,
		});
		// A box that doesn't fit could hide a location this walk would miss.
		if (size < headerSize || offset + size > end) {
			throw new Error("The video's index is damaged.");
		}
		const body = offset + headerSize;
		// A compressed index can't be searched for a location.
		if (type === "cmov") throw new Error("The video's index is compressed.");
		if (
			type === "\xa9xyz" ||
			type === "loci" ||
			type === "XMP_" ||
			(type === "uuid" &&
				Array.from(bytes.subarray(body, body + 16), (byte) =>
					byte.toString(16).padStart(2, "0"),
				).join("") === XMP_UUID)
		) {
			// Renamed to free space and emptied: same length, so no offset moves.
			bytes.set(new TextEncoder().encode("free"), offset + 4);
			bytes.fill(0, body, offset + size);
		} else if (type === "keys") {
			locationKeys = new Set();
			const count = view.getUint32(body + 4);
			for (
				let index = 1, entry = body + 8;
				index <= count && entry + 8 <= offset + size;
				index++
			) {
				const entrySize = view.getUint32(entry);
				if (entrySize < 8 || entry + entrySize > offset + size) {
					throw new Error("The video's index is damaged.");
				}
				if (
					/location/i.test(
						latin1.decode(bytes.subarray(entry + 8, entry + entrySize)),
					)
				) {
					locationKeys.add(index);
				}
				entry += entrySize;
			}
		} else if (type === "ilst") {
			blankItems({
				bytes,
				view,
				start: body,
				end: offset + size,
				locationKeys,
			});
		} else if (CONTAINERS.has(type)) {
			// QuickTime's meta has no version and flags; ISO's does. Its first child is hdlr either way.
			const skip =
				type === "meta" &&
				latin1.decode(bytes.subarray(body + 4, body + 8)) !== "hdlr"
					? 4
					: 0;
			blankInside({ bytes, start: body + skip, end: offset + size });
		}
		offset += size;
	}
}

function blankItems({
	bytes,
	view,
	start,
	end,
	locationKeys,
}: {
	bytes: Uint8Array;
	view: DataView;
	start: number;
	end: number;
	locationKeys: Set<number> | null;
}) {
	for (let item = start; item + 8 <= end; ) {
		const itemSize = view.getUint32(item);
		if (itemSize < 8 || item + itemSize > end) {
			throw new Error("The video's index is damaged.");
		}
		// An item numbered by a key that hasn't been read yet could be a location.
		if (!locationKeys && view.getUint8(item + 4) === 0) {
			throw new Error("The video's metadata is out of order.");
		}
		if (
			locationKeys?.has(view.getUint32(item + 4)) ||
			new TextDecoder("latin1").decode(bytes.subarray(item + 4, item + 8)) ===
				"\xa9xyz"
		) {
			for (let data = item + 8; data + 16 <= item + itemSize; ) {
				const dataSize = view.getUint32(data);
				if (dataSize < 16 || data + dataSize > item + itemSize) {
					throw new Error("The video's index is damaged.");
				}
				bytes.fill(0, data + 16, data + dataSize);
				data += dataSize;
			}
		}
		item += itemSize;
	}
}

function readBoxHeader({
	view,
	offset,
	remaining,
}: {
	view: DataView;
	offset: number;
	remaining: number;
}): BoxHeader {
	const size32 = view.getUint32(offset);
	const type = String.fromCharCode(
		view.getUint8(offset + 4),
		view.getUint8(offset + 5),
		view.getUint8(offset + 6),
		view.getUint8(offset + 7),
	);
	if (size32 === 1) {
		return {
			size: Number(view.getBigUint64(offset + 8)),
			headerSize: 16,
			type,
		};
	}
	if (size32 === 0) return { size: remaining, headerSize: 8, type };
	return { size: size32, headerSize: 8, type };
}
