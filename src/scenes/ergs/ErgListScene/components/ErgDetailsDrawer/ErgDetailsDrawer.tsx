"use client";

import { IconPencil } from "@tabler/icons-react";
import { useState } from "react";
import { ActivityTable } from "@/components/activities";
import { Button } from "@/components/ui/button";
import {
	Drawer,
	DrawerCloseButton,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { useCurrentUser } from "@/hooks/useAuth";
import { formatDistance } from "@/lib/formatters";
import type { Activities, Athletes, Erg } from "@/lib/trpc/types";
import type { CreateErg, UpdateErg } from "@/schemas";
import { ErgForm } from "../ErgForm/ErgForm";

interface ErgDetailsDrawerProps {
	isOpen: boolean;
	erg: Erg | null;
	activities: Activities;
	athletes?: Athletes;
	onClose: () => void;
	onSubmit: (data: UpdateErg) => Promise<void> | void;
	onMark: () => void;
	isMarking: boolean;
}

export const ErgDetailsDrawer = ({
	isOpen,
	erg,
	activities,
	athletes,
	onClose,
	onSubmit,
	onMark,
	isMarking,
}: ErgDetailsDrawerProps) => {
	const [isEditing, setIsEditing] = useState(false);
	const { isAdmin } = useCurrentUser();

	const handleClose = () => {
		setIsEditing(false);
		onClose();
	};

	const handleSubmit = async (data: CreateErg) => {
		if (!erg) return;

		await onSubmit({
			...data,
			id: erg.id,
		});
		setIsEditing(false);
	};

	if (!erg) {
		return null;
	}

	return (
		<Drawer
			open={isOpen}
			onOpenChange={(open) => !open && handleClose()}
			direction="right"
		>
			<DrawerContent>
				<DrawerHeader className="flex flex-row items-center justify-between border-b">
					<div>
						<DrawerTitle>{erg.name}</DrawerTitle>
						<DrawerDescription>
							ERG details and activity history
						</DrawerDescription>
					</div>
					<div className="flex items-center gap-2">
						<DrawerCloseButton />
					</div>
				</DrawerHeader>
				<div className="flex-1 overflow-y-auto p-6 space-y-6">
					{isEditing ? (
						<ErgForm
							athletes={athletes}
							defaultValues={{
								name: erg.name,
								manufacturer: erg.manufacturer,
								serialNumber: erg.serialNumber ?? undefined,
								firmwareVersion: erg.firmwareVersion ?? undefined,
								hardwareVersion: erg.hardwareVersion ?? undefined,
								dataCode: erg.dataCode ?? undefined,
								ownership: erg.ownership,
								ownerId: erg.owner?.id ?? null,
							}}
							onCancel={() => setIsEditing(false)}
							onSubmit={handleSubmit}
						/>
					) : (
						<>
							<div className="flex items-center justify-between mb-4">
								<h2 className="text-xl font-semibold">Details</h2>
								{isAdmin && (
									<Button
										variant="outline"
										size="sm"
										onClick={() => setIsEditing(true)}
									>
										<IconPencil className="h-4 w-4 mr-2" />
										Edit
									</Button>
								)}
							</div>
							<div className="space-y-4">
								<div>
									<strong className="text-sm text-muted-foreground">
										Ownership
									</strong>
									<div className="flex items-center justify-between gap-2">
										<p className="text-base">
											{erg.ownership === "club" && "Club"}
											{erg.ownership === "personal" &&
												`Personal · ${erg.owner?.name}`}
										</p>
										{erg.canMark && (
											<Button
												variant="outline"
												size="sm"
												disabled={isMarking}
												onClick={onMark}
											>
												My erg
											</Button>
										)}
									</div>
								</div>
								<div>
									<strong className="text-sm text-muted-foreground">
										Manufacturer
									</strong>
									<p className="text-base">{erg.manufacturer.toUpperCase()}</p>
								</div>
								<div>
									<strong className="text-sm text-muted-foreground">
										Serial Number
									</strong>
									<p className="text-base">
										{erg.serialNumber || "Not specified"}
									</p>
								</div>
								<div>
									<strong className="text-sm text-muted-foreground">
										Firmware Version
									</strong>
									<p className="text-base">
										{erg.firmwareVersion || "Not specified"}
									</p>
								</div>
								<div>
									<strong className="text-sm text-muted-foreground">
										Hardware Version
									</strong>
									<p className="text-base">
										{erg.hardwareVersion || "Not specified"}
									</p>
								</div>
								<div>
									<strong className="text-sm text-muted-foreground">
										Data Code
									</strong>
									<p className="text-base">{erg.dataCode || "Not specified"}</p>
								</div>
								<div>
									<strong className="text-sm text-muted-foreground">
										Total distance
									</strong>
									<p className="text-base">{formatDistance(erg.meters)}</p>
								</div>
							</div>

							<div className="space-y-4 pt-6 border-t">
								<h2 className="text-xl font-semibold">Activities</h2>
								<ActivityTable
									data={activities}
									showColumns={[
										"startDate",
										"name",
										"athlete.name",
										"isStrava",
										"distance",
									]}
								/>
							</div>
						</>
					)}
				</div>
			</DrawerContent>
		</Drawer>
	);
};
