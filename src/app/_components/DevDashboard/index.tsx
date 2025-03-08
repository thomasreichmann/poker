import { Suspense } from "react";
import DevDashboardModal from "~/app/_components/DevDashboard/DevDashboardModal";
import UserManagement from "~/app/_components/DevDashboard/UserManagement";
import { withDevOnly } from "~/app/_utils/withDevOnly";
import { api, HydrateClient } from "~/trpc/server";

/**
 * Essa estrutura é estupida, não faz sentido algum o modal e o conteudo dele serem separados
 * entre um server component e um client component.
 * Mas como eu não quero mais gastar o pouco tempo que eu dedico para o projeto nisso.
 */
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
