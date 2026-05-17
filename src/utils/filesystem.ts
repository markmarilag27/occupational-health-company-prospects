import { access, mkdir, stat } from "node:fs/promises";
import { dirname } from "node:path";

export async function ensureDirectoriesExist(paths: string[]): Promise<void> {
	for (const path of paths) {
		await mkdir(path, { recursive: true });
	}
}

export async function ensureParentDirectory(filePath: string): Promise<void> {
	await mkdir(dirname(filePath), { recursive: true });
}

export async function inputFileExists(filePath: string): Promise<boolean> {
	try {
		await access(filePath);
		const fileStat = await stat(filePath);
		return fileStat.isFile();
	} catch {
		return false;
	}
}
