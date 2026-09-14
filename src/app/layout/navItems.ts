import { UserRound, ClipboardList, FolderHeart, Inbox, BarChart3, FilePlus2 } from "lucide-react";

export const navItems = [
  { href: "/", labelKey: "nav.profile", icon: UserRound, roles: null },
  { href: "/officer/capture", labelKey: "nav.capture", icon: FilePlus2, roles: ["field-officer"] },
  { href: "/officer/cases", labelKey: "nav.myCases", icon: ClipboardList, roles: ["field-officer"] },
  { href: "/coordinator", labelKey: "nav.queue", icon: Inbox, roles: ["programme-coordinator"] },
  { href: "/manager", labelKey: "nav.board", icon: BarChart3, roles: ["regional-manager"] }
] as const;
