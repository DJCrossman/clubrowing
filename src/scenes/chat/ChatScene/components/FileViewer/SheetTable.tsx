"use client";

import { useSheetRows } from "./useSheetRows";

interface SheetTableProps {
	url: string;
	kind: "xlsx" | "csv";
}

export function SheetTable({ url, kind }: SheetTableProps) {
	const sheet = useSheetRows({ url, kind });

	return (
		<>
			{sheet.status === "opening" && (
				<p className="text-sm text-muted-foreground">Opening…</p>
			)}
			{sheet.status === "failed" && (
				<p className="text-sm text-muted-foreground">
					This file can't be shown here. Download it to open it on your device.
				</p>
			)}
			{sheet.status === "ready" && sheet.rows.length === 0 && (
				<p className="text-sm text-muted-foreground">This file has no rows.</p>
			)}
			{sheet.status === "ready" && sheet.rows.length > 0 && (
				<div className="flex h-full flex-col gap-2">
					{sheet.hasMoreSheets && (
						<p className="shrink-0 text-sm text-muted-foreground">
							Showing the first sheet, {sheet.sheetName}. Download the file to
							see the others.
						</p>
					)}
					{sheet.hasMoreRows && (
						<p className="shrink-0 text-sm text-muted-foreground">
							Showing the first {sheet.rows.length} rows. Download the file to
							see the rest.
						</p>
					)}
					{sheet.hasMoreColumns && (
						<p className="shrink-0 text-sm text-muted-foreground">
							Showing the first {sheet.rows[0]?.length} columns. Download the
							file to see the rest.
						</p>
					)}
					<div className="min-h-0 overflow-auto rounded-md border bg-background">
						<table className="w-max min-w-full border-separate border-spacing-0 text-sm">
							<thead>
								<tr>
									{Array.from(
										{ length: sheet.rows[0]?.length ?? 0 },
										(_, index) => index,
									).map((column) => (
										<th
											key={column}
											scope="col"
											title={sheet.rows[0][column]}
											className="sticky top-0 border-r border-b bg-muted px-3 py-2 text-left font-medium last:border-r-0"
										>
											<div className="max-w-60 truncate">
												{sheet.rows[0][column]}
											</div>
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{Array.from(
									{ length: Math.max(sheet.rows.length - 1, 0) },
									(_, index) => index + 1,
								).map((rowNumber) => (
									<tr key={rowNumber}>
										{Array.from(
											{ length: sheet.rows[rowNumber].length },
											(_, index) => index,
										).map((column) => (
											<td
												key={column}
												title={sheet.rows[rowNumber][column]}
												className="border-r border-b px-3 py-1.5 last:border-r-0"
											>
												<div className="max-w-60 truncate">
													{sheet.rows[rowNumber][column]}
												</div>
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</>
	);
}
