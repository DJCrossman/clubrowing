import type {
	OnChangeFn,
	PaginationState,
	SortingState,
} from "@tanstack/react-table";
import { useState } from "react";

const DEFAULT_PAGE_SIZE = 20;

export interface TableState<TFilters extends object> {
	pagination: PaginationState;
	sorting: SortingState;
	filters: Partial<TFilters>;
	page: number;
	pageSize: number;
	sortBy: string | undefined;
	order: "asc" | "desc" | undefined;
	onPaginationChange: OnChangeFn<PaginationState>;
	onSortingChange: OnChangeFn<SortingState>;
	onFiltersChange: (filters: Partial<TFilters>) => void;
}

export function useTable<
	TFilters extends object = Record<string, never>,
>(): TableState<TFilters> {
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: DEFAULT_PAGE_SIZE,
	});
	const [sorting, setSorting] = useState<SortingState>([]);
	const [filters, setFilters] = useState<Partial<TFilters>>({});
	const sort = sorting[0];

	return {
		pagination,
		sorting,
		filters,
		page: pagination.pageIndex + 1,
		pageSize: pagination.pageSize,
		sortBy: sort?.id,
		order: sort && (sort.desc ? "desc" : "asc"),
		onPaginationChange: setPagination,
		onSortingChange: setSorting,
		onFiltersChange: (changed) => {
			setFilters((prev) => ({ ...prev, ...changed }));
			setPagination((prev) => ({ ...prev, pageIndex: 0 }));
		},
	};
}
