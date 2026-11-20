import Papa from "papaparse";
import readXlsxFile from "read-excel-file/web-worker";

export type SheetRequest = { kind: "xlsx" | "csv"; bytes: ArrayBuffer };

export type SheetReply =
	| { status: "failed" }
	| {
			status: "ready";
			rows: string[][];
			hasMoreRows: boolean;
			hasMoreColumns: boolean;
			sheetName: string | null;
			hasMoreSheets: boolean;
	  };

const MAX_ROWS = 200;
const MAX_COLUMNS = 50;
const MAX_CELL_LENGTH = 200;
const MAX_ZIP_ENTRIES = 1000;
const MAX_UNPACKED_BYTES = 50 * 1024 * 1024;

self.addEventListener("message", async (event: MessageEvent<SheetRequest>) => {
	try {
		self.postMessage(await readSheet(event.data));
	} catch {
		self.postMessage({ status: "failed" } satisfies SheetReply);
	}
});

async function readSheet({ kind, bytes }: SheetRequest): Promise<SheetReply> {
	const data = new Uint8Array(bytes);
	if (kind === "xlsx") {
		if (!isSmallEnoughToUnpack(data)) return { status: "failed" };
		const sheets = await readXlsxFile(data);
		return {
			status: "ready",
			...getShownPart(sheets[0].data),
			sheetName: sheets[0].sheet,
			hasMoreSheets: sheets.length > 1,
		};
	}
	if (data.subarray(0, 1024).includes(0)) return { status: "failed" };
	const parsed = Papa.parse<unknown[]>(new TextDecoder().decode(data), {
		preview: MAX_ROWS + 1,
		skipEmptyLines: true,
	});
	return {
		status: "ready",
		...getShownPart(parsed.data),
		sheetName: null,
		hasMoreSheets: false,
	};
}

function getShownPart(rows: unknown[][]) {
	const shownRows = rows.slice(0, MAX_ROWS);
	const columnCount = Math.min(
		Math.max(0, ...shownRows.map((row) => row.length)),
		MAX_COLUMNS,
	);
	return {
		rows: shownRows.map((row) =>
			Array.from({ length: columnCount }, (_, column) => {
				const value = row[column];
				if (value === null || value === undefined) return "";
				if (value instanceof Date) return value.toISOString().slice(0, 10);
				return String(value).slice(0, MAX_CELL_LENGTH);
			}),
		),
		hasMoreRows: rows.length > MAX_ROWS,
		hasMoreColumns: shownRows.some((row) => row.length > MAX_COLUMNS),
	};
}

// The unpacker reserves exactly the size each directory record claims before
// inflating into it, so the claimed sizes bound the memory it can take.
function isSmallEnoughToUnpack(data: Uint8Array): boolean {
	const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
	let end = -1;
	for (
		let index = data.length - 22;
		index >= 0 && data.length - index <= 65_557;
		index--
	) {
		if (view.getUint32(index, true) === 0x06054b50) {
			end = index;
			break;
		}
	}
	if (end < 0) return false;
	const entryCount = view.getUint16(end + 8, true);
	const directorySize = view.getUint32(end + 12, true);
	const directoryOffset = view.getUint32(end + 16, true);
	if (
		entryCount === 0xffff ||
		directorySize === 0xffffffff ||
		directoryOffset === 0xffffffff
	) {
		return false;
	}
	if (entryCount > MAX_ZIP_ENTRIES) return false;
	const directoryEnd = directoryOffset + directorySize;
	if (directoryEnd > data.length) return false;
	let position = directoryOffset;
	let unpackedSize = 0;
	for (let entry = 0; entry < entryCount; entry++) {
		if (position + 46 > directoryEnd) return false;
		if (view.getUint32(position, true) !== 0x02014b50) return false;
		const size = view.getUint32(position + 24, true);
		if (size === 0xffffffff) return false;
		unpackedSize += size;
		if (unpackedSize > MAX_UNPACKED_BYTES) return false;
		position +=
			46 +
			view.getUint16(position + 28, true) +
			view.getUint16(position + 30, true) +
			view.getUint16(position + 32, true);
	}
	return position <= directoryEnd;
}
