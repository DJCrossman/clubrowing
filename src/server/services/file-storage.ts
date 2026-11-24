import { BlobNotFoundError, del, head } from "@vercel/blob";

export type StoredFile = { url: string; size: number; contentType: string };

export type FileStorage = {
	findFile: (url: string) => Promise<StoredFile | null>;
	deleteFile: (url: string) => Promise<void>;
	deleteFiles: (urls: string[]) => Promise<void>;
};

export function createFileStorage(): FileStorage {
	return {
		findFile: async (url) => {
			try {
				return await head(url);
			} catch (error) {
				if (error instanceof BlobNotFoundError) {
					return null;
				}
				throw error;
			}
		},
		deleteFile: (url) => del(url),
		deleteFiles: (urls) => del(urls),
	};
}
