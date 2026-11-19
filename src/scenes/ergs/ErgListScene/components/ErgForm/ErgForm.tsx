"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type SubmitHandler, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { Athletes } from "@/lib/trpc/types";
import { type CreateErg, createErgSchema } from "@/schemas";

const manufacturerItems = { concept2: "Concept2" };
const ownershipItems = {
	club: "Club",
	personal: "Personal",
};

interface ErgFormProps {
	athletes?: Athletes;
	onSubmit: SubmitHandler<CreateErg>;
	onCancel?: (() => void) | string;
	defaultValues?: Partial<CreateErg>;
}

export function ErgForm({
	athletes = [],
	onSubmit,
	onCancel: cancelLinkOrAction,
	defaultValues,
}: ErgFormProps) {
	const form = useForm<CreateErg>({
		resolver: zodResolver(createErgSchema),
		defaultValues: defaultValues || {
			name: "",
			manufacturer: "concept2",
			firmwareVersion: "",
			hardwareVersion: "",
			serialNumber: "",
			dataCode: "",
			ownership: "club",
			ownerId: null,
		},
	});
	const ownership = form.watch("ownership");

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Erg Name</FormLabel>
							<FormControl>
								<Input placeholder="Enter erg name" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="manufacturer"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Manufacturer</FormLabel>
							<Select
								items={manufacturerItems}
								onValueChange={field.onChange}
								defaultValue={field.value}
							>
								<FormControl>
									<SelectTrigger>
										<SelectValue placeholder="Select manufacturer" />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									<SelectItem value="concept2">Concept2</SelectItem>
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="ownership"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Ownership</FormLabel>
							<Select
								items={ownershipItems}
								onValueChange={field.onChange}
								value={field.value}
							>
								<FormControl>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
								</FormControl>
								<SelectContent>
									<SelectItem value="club">Club</SelectItem>
									<SelectItem value="personal">Personal</SelectItem>
								</SelectContent>
							</Select>
							<FormMessage />
						</FormItem>
					)}
				/>

				{ownership === "personal" && (
					<FormField
						control={form.control}
						name="ownerId"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Owner</FormLabel>
								<Select
									items={Object.fromEntries(
										athletes.map((athlete) => [
											athlete.id,
											`${athlete.firstName} ${athlete.lastName}`,
										]),
									)}
									onValueChange={field.onChange}
									value={field.value}
								>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder="Select owner" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										{athletes.map((athlete) => (
											<SelectItem key={athlete.id} value={athlete.id}>
												{athlete.firstName} {athlete.lastName}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}

				<FormField
					control={form.control}
					name="serialNumber"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Serial Number (Optional)</FormLabel>
							<FormControl>
								<Input placeholder="Enter serial number" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="firmwareVersion"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Firmware Version (Optional)</FormLabel>
							<FormControl>
								<Input placeholder="e.g., 6.15.0" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="hardwareVersion"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Hardware Version (Optional)</FormLabel>
							<FormControl>
								<Input placeholder="e.g., PM5" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="dataCode"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Data Code (Optional)</FormLabel>
							<FormControl>
								<Input placeholder="Enter data code" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="flex gap-4">
					<Button type="submit" className="flex-1">
						Save
					</Button>
					{typeof cancelLinkOrAction === "function" && (
						<Button
							variant="outline"
							className="flex-1"
							type="button"
							onClick={cancelLinkOrAction}
						>
							Cancel
						</Button>
					)}
				</div>
			</form>
		</Form>
	);
}
