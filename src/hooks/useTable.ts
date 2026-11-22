import type {
	OnChangeFn,
	PaginationState,
	SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { useDebounce } from "@/components/ui/multi-select";

const DEFAULT_PAGE_SIZE = 20;

export interface TableState<TFilters extends object = Record<string, never>> {
	pagination: PaginationState;
	sorting: SortingState;
	filters: Partial<TFilters>;
	searchInput: string;
	page: number;
	pageSize: number;
	sortBy: string | undefined;
	order: "asc" | "desc" | undefined;
	search: string | undefined;
	onPaginationChange: OnChangeFn<PaginationState>;
	onSortingChange: OnChangeFn<SortingState>;
	onFiltersChange: (filters: Partial<TFilters>) => void;
	onSearchChange: (search: string) => void;
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
	const [searchInput, setSearchInput] = useState("");
	const search = useDebounce(searchInput.trim(), 300);
	const sort = sorting[0];

	return {
		pagination,
		sorting,
		filters,
		searchInput,
		page: pagination.pageIndex + 1,
		pageSize: pagination.pageSize,
		sortBy: sort?.id,
		order: sort && (sort.desc ? "desc" : "asc"),
		search: search || undefined,
		onPaginationChange: setPagination,
		onSortingChange: setSorting,
		onFiltersChange: (changed) => {
			setFilters((prev) => ({ ...prev, ...changed }));
			setPagination((prev) => ({ ...prev, pageIndex: 0 }));
		},
		onSearchChange: (changed) => {
			setSearchInput(changed);
			setPagination((prev) => ({ ...prev, pageIndex: 0 }));
		},
	};
}
