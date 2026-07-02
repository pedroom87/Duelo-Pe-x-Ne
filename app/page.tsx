import Dashboard from "@/components/dashboard/Dashboard";
import { getVersionInfo } from "@/lib/version";

export default async function Home() {
  const versionInfo = await getVersionInfo();

  return <Dashboard versionInfo={versionInfo} />;
}
