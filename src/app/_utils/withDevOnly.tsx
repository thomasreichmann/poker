import { type FC } from "react";

export const withDevOnly = <T extends object>(Component: FC<T>): FC<T> => {
	if (process.env.NODE_ENV === "production") {
		return () => null;
	}

	const DevComponent: FC<T> = (props) => <Component {...props} />;
	DevComponent.displayName = `DevOnly(${Component.displayName ?? Component.name ?? "Component"})`;

	return DevComponent;
};
