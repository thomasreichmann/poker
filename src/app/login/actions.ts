"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "~/supabase/server";

// Defining TypeScript interface for login and signup inputs
interface AuthData {
	email: string;
	password: string;
}

export async function login(data: AuthData): Promise<string | null> {
	const supabase = await createClient();

	// Directly use the `data` object for sign in
	const { error } = await supabase.auth.signInWithPassword({
		email: data.email,
		password: data.password,
	});

	if (error) {
		return error.message;
	}

	// Redirect to the home page
	revalidatePath("/", "layout");
	redirect("/");
}

export async function signup(data: AuthData): Promise<string | null> {
	const supabase = await createClient();

	// Directly use the `data` object for sign up
	const { error } = await supabase.auth.signUp({
		email: data.email,
		password: data.password,
	});

	if (error) {
		return error.message;
	}

	revalidatePath("/");
	redirect("/");
}
