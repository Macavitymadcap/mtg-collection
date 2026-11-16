import type { SvgIconComponent } from "@mui/icons-material";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import LayersRounded from "@mui/icons-material/LayersRounded";
import AddCircleRounded from "@mui/icons-material/AddCircleRounded";
import StyleRounded from "@mui/icons-material/StyleRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";

export interface NavItem {
  label: string;
  href: string;
  icon: SvgIconComponent;
  /** Only shown when signed in: visitors can't use the page. */
  editorsOnly?: boolean;
}

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: DashboardRounded },
  { label: "Collection", href: "/collection", icon: StyleRounded },
  { label: "Decks", href: "/decks", icon: LayersRounded },
  { label: "Data", href: "/settings/data", icon: SettingsRounded, editorsOnly: true },
];

/** The bottom bar on phones: the same places, plus adding cards, the most common task there. */
export const mobileNavItems: NavItem[] = [
  { label: "Home", href: "/", icon: DashboardRounded },
  { label: "Collection", href: "/collection", icon: StyleRounded },
  { label: "Add", href: "/collection/add", icon: AddCircleRounded, editorsOnly: true },
  { label: "Decks", href: "/decks", icon: LayersRounded },
  { label: "Data", href: "/settings/data", icon: SettingsRounded, editorsOnly: true },
];

/** The items someone can use: everything when signed in, otherwise the pages that don't need it. */
export function visibleItems(items: NavItem[], canEdit: boolean): NavItem[] {
  return items.filter((item) => canEdit || !item.editorsOnly);
}

/** The item for the current page: the longest href the path starts with ("/" only matches itself). */
export function activeHref(pathname: string, items: NavItem[]): string | false {
  const matches = items
    .map((item) => item.href)
    .filter((href) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)));
  return matches.sort((a, b) => b.length - a.length)[0] ?? false;
}
