import type { SvgIconComponent } from "@mui/icons-material";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import LayersRounded from "@mui/icons-material/LayersRounded";
import StyleRounded from "@mui/icons-material/StyleRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";

export interface NavItem {
  label: string;
  href: string;
  icon: SvgIconComponent;
}

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: DashboardRounded },
  { label: "Collection", href: "/collection", icon: StyleRounded },
  { label: "Decks", href: "/decks", icon: LayersRounded },
  { label: "Data", href: "/settings/data", icon: SettingsRounded },
];
