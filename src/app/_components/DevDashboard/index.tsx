import { Suspense } from "react";
import DevDashboardModal from "~/app/_components/DevDashboard/DevDashboardModal";
import UserManagement from "~/app/_components/DevDashboard/UserManagement";
import { withDevOnly } from "~/app/_utils/withDevOnly";
import { api, HydrateClient } from "~/trpc/server";

async function DevDashboard() {
	await api.admin.users.prefetch();
	return (
		<DevDashboardModal>
			<HydrateClient>
				<Suspense fallback={<div>Loading...</div>}>
					<UserManagement />
				</Suspense>
			</HydrateClient>
		</DevDashboardModal>
	);
}

export default withDevOnly(DevDashboard);
