"use client";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
function UserManagement() {
	const [users] = api.admin.users.useSuspenseQuery();
	const loginAsUser = api.admin.getMagicLink.useMutation();
	const router = useRouter();

	return (
		<Box>
			<Table>
				<TableHead>
					<TableRow>
						<TableCell>Id</TableCell>
						<TableCell>Email</TableCell>
						<TableCell>Actions</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{users.map((user) => (
						<TableRow key={user.id}>
							<TableCell>{user.id}</TableCell>
							<TableCell>{user.email}</TableCell>
							<TableCell>
								<Button
									variant="outlined"
									type="submit"
									onClick={async () => {
										const link = await loginAsUser.mutateAsync({
											id: user.id,
											email: user.email!,
										});

										router.push(link);
									}}
								>
									Login as user
								</Button>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</Box>
	);
}

export default UserManagement;
