import { WorkspaceProvider } from "@/lib/client/workspace-context";
import { AppShell } from "@/components/layout/AppShell";

export default function AppRouteGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <AppShell>{children}</AppShell>
    </WorkspaceProvider>
  );
}
