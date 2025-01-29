import { withDevOnly } from "~/app/_utils/withDevOnly";
import DevDashboardComponent from "./DevDashboardComponent";

function DevDashboard() {
	return <DevDashboardComponent />;
}

export default withDevOnly(DevDashboard);
