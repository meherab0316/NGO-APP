import { useEffect, useState } from "react";
import { AppShell } from "../layout/AppShell";
import { RedirectIfAuthenticated, RequireAuth } from "./guards";
import { CallbackPage } from "../../features/auth/CallbackPage";
import { ErrorPage } from "../../features/auth/ErrorPage";
import { LoginPage } from "../../features/auth/LoginPage";
import { NotFoundPage } from "../../features/auth/NotFoundPage";
import { ProfilePage } from "../../features/profile/ProfilePage";
import { CapturePage } from "../../features/cases/CapturePage";
import { OfficerCasesPage } from "../../features/cases/OfficerCasesPage";
import { HouseholdPage } from "../../features/cases/HouseholdPage";
import { CoordinatorQueuePage } from "../../features/cases/CoordinatorQueuePage";
import { ManagerBoardPage } from "../../features/cases/ManagerBoardPage";
import { SeedPage } from "../../features/cases/SeedPage";
import { TransferPage } from "../../features/cases/TransferPage";
import { useMyRoles } from "../../features/profile/useCurrentUser";

function RequireRole({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const myRoles = useMyRoles();
  if (myRoles.length > 0 && !roles.some((r) => myRoles.includes(r))) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-900">
        You do not have access to this view. This screen is limited to: {roles.join(", ")}.
      </div>
    );
  }
  return <>{children}</>;
}

function AppRoutes({ path, onNavigate }: { path: string; onNavigate: (p: string) => void }) {
  if (path === "/" ) return <ProfilePage />;
  if (path === "/error") return <ErrorPage onNavigate={onNavigate} />;

  if (path === "/officer/capture")
    return <RequireRole roles={["field-officer"]}><CapturePage onNavigate={onNavigate} /></RequireRole>;
  if (path === "/officer/cases")
    return <RequireRole roles={["field-officer"]}><OfficerCasesPage onNavigate={onNavigate} /></RequireRole>;
  if (path.startsWith("/household/"))
    return <HouseholdPage householdId={path.slice("/household/".length)} onNavigate={onNavigate} />;
  if (path === "/coordinator")
    return <RequireRole roles={["programme-coordinator"]}><CoordinatorQueuePage /></RequireRole>;
  if (path === "/manager")
    return <RequireRole roles={["regional-manager"]}><ManagerBoardPage /></RequireRole>;
  if (path === "/seed")
    return <RequireRole roles={["regional-manager"]}><SeedPage onDone={() => onNavigate("/manager")} /></RequireRole>;
  if (path === "/transfer")
    return <RequireRole roles={["regional-manager", "programme-coordinator"]}><TransferPage /></RequireRole>;

  return <NotFoundPage onNavigate={onNavigate} />;
}

export function AppRouter() {
  const [path, setPath] = useState(() => window.location.pathname);
  const [search, setSearch] = useState(() => window.location.search);

  useEffect(() => {
    const onPopState = () => {
      setPath(window.location.pathname);
      setSearch(window.location.search);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function navigate(nextPath: string) {
    const [nextPathname = "/", queryString = ""] = nextPath.split("?");
    window.history.pushState({}, "", nextPath);
    setPath(nextPathname);
    setSearch(queryString ? `?${queryString}` : "");
  }

  if (path === "/login/callback") {
    return <CallbackPage onNavigate={navigate} />;
  }

  if (path === "/login") {
    const returnTo = new URLSearchParams(search).get("returnTo") || undefined;
    return (
      <RedirectIfAuthenticated onNavigate={navigate}>
        <LoginPage returnTo={returnTo} />
      </RedirectIfAuthenticated>
    );
  }

  return (
    <RequireAuth currentPath={path} onNavigate={navigate}>
      <AppShell activePath={path} onNavigate={navigate}>
        <AppRoutes path={path} onNavigate={navigate} />
      </AppShell>
    </RequireAuth>
  );
}
