// @ts-check
import eslint from "@eslint/js";
// @ts-ignore
import nextPlugin from "@next/eslint-plugin-next";
// @ts-ignore
import drizzlePlugin from "eslint-plugin-drizzle";
import tseslint from "typescript-eslint";

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	{
		files: ["**/*.{js,jsx,ts,tsx}"],
		plugins: {
			"@next/next": nextPlugin,
			drizzle: drizzlePlugin,
		},
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				project: true,
			},
			globals: {
				process: "readonly",
			},
		},
		rules: {
			"@typescript-eslint/array-type": "off",
			"@typescript-eslint/consistent-type-definitions": "off",
			"@typescript-eslint/consistent-type-imports": [
				"warn",
				{
					prefer: "type-imports",
					fixStyle: "inline-type-imports",
				},
			],
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{
					argsIgnorePattern: "^_|^(props|ctx)$",
				},
			],
			"@typescript-eslint/require-await": "off",
			"@typescript-eslint/no-empty-object-type": "off",
			"@typescript-eslint/no-misused-promises": [
				"error",
				{
					checksVoidReturn: {
						attributes: false,
					},
				},
			],
			"drizzle/enforce-delete-with-where": [
				"error",
				{
					drizzleObjectName: ["db", "ctx.db"],
				},
			],
			"drizzle/enforce-update-with-where": [
				"error",
				{
					drizzleObjectName: ["db", "ctx.db"],
				},
			],
		},
	},
);
