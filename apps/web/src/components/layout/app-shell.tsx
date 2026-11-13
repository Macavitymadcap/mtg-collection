"use client";

import { useState, type JSX, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import MenuRounded from "@mui/icons-material/MenuRounded";
import { navItems } from "./nav-items";

const DRAWER_WIDTH = 220;

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/** Top bar plus side navigation: permanent on desktop, a drawer on mobile. */
export function AppShell({ children }: { children: ReactNode }): JSX.Element {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const nav = (
    <List sx={{ px: 2 }}>
      {navItems.map(({ label, href, icon: Icon }) => (
        <ListItemButton
          key={href}
          component={Link}
          href={href}
          selected={isActive(pathname, href)}
          onClick={() => setMobileOpen(false)}
          sx={{ borderRadius: 1, mb: 1 }}
        >
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Icon />
          </ListItemIcon>
          <ListItemText primary={label} />
        </ListItemButton>
      ))}
    </List>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
            sx={{ mr: 2, display: { md: "none" } }}
          >
            <MenuRounded />
          </IconButton>
          <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
            MTG Collection
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{ display: { md: "none" }, "& .MuiDrawer-paper": { width: DRAWER_WIDTH } }}
      >
        <Toolbar />
        {nav}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" },
        }}
      >
        <Toolbar />
        {nav}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 4, md: 8 } }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
