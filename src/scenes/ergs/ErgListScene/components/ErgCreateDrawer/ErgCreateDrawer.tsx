"use client";

import {
	Drawer,
	DrawerCloseButton,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import type { Athletes } from "@/lib/trpc/types";
import type { CreateErg } from "@/schemas";
import { ErgForm } from "../ErgForm/ErgForm";

interface ErgCreateDrawerProps {
	isOpen: boolean;
	athletes?: Athletes;
	onClose: () => void;
	onSubmit: (data: CreateErg) => Promise<void> | void;
}

export const ErgCreateDrawer = ({
	isOpen,
	athletes,
	onClose,
	onSubmit,
}: ErgCreateDrawerProps) => {
	const handleSubmit = async (data: CreateErg) => {
		await onSubmit(data);
		onClose();
	};

	return (
		<Drawer
			open={isOpen}
			onOpenChange={(open) => !open && onClose()}
			direction="right"
		>
			<DrawerContent>
				<DrawerHeader className="flex flex-row items-center justify-between border-b">
					<div>
						<DrawerTitle>Add ERG</DrawerTitle>
						<DrawerDescription>
							Create a new ergometer profile
						</DrawerDescription>
					</div>
					<DrawerCloseButton />
				</DrawerHeader>
				<div className="flex-1 overflow-y-auto p-6">
					<ErgForm
						athletes={athletes}
						onSubmit={handleSubmit}
						onCancel={onClose}
					/>
				</div>
			</DrawerContent>
		</Drawer>
	);
};
