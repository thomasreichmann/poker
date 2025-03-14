"use server";

import { revalidatePath } from "next/cache";

export async function revalidate(path: string, type: "layout" | "page") {
	revalidatePath(path, type);
}
