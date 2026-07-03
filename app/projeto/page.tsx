import { getVersionInfo } from "@/lib/version";
import { ProjetoContent } from "./ProjetoContent";

export default async function Projeto() {
  const versionInfo = await getVersionInfo();

  return <ProjetoContent versionInfo={versionInfo} />;
}
