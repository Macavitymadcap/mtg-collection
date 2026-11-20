"use client";

import { Suspense, type JSX, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { useCanEdit } from "@/features/auth/queries";
import { SignInError } from "@/features/auth/sign-in-error";
import { UserMenu } from "@/features/auth/user-menu";
import { ColourModeToggle } from "./colour-mode-toggle";
import { activeHref, mobileNavItems as allMobileNavItems, navItems as allNavItems, visibleItems } from "./nav-items";

const DRAWER_WIDTH = 220;
/** Height of the bottom bar on phones, plus the iPhone home-indicator area. */
const BOTTOM_NAV_SPACE = "calc(56px + env(safe-area-inset-bottom))";

/**
 * Top bar, plus navigation: a permanent sidebar on desktop, a bottom bar on
 * phones (where it's in reach of a thumb).
 */
export function AppShell({ children }: { children: ReactNode }): JSX.Element {
  const pathname = usePathname();
  const canEdit = useCanEdit();
  const navItems = visibleItems(allNavItems, canEdit);
  const mobileNavItems = visibleItems(allMobileNavItems, canEdit);
  const current = activeHref(pathname, navItems);
  const currentMobile = activeHref(pathname, mobileNavItems);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" component="span" sx={{ fontWeight: 700, flexGrow: 1 }}>
            MTG Collection
          </Typography>
          <ColourModeToggle />
          <UserMenu />
          {/* Reads the query string, which needs a Suspense boundary */}
          <Suspense>
            <SignInError />
          </Suspense>
        </Toolbar>
      </AppBar>

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
        <List component="nav" aria-label="Main" sx={{ px: 2 }}>
          {navItems.map(({ label, href, icon: Icon }) => (
            <ListItemButton
              key={href}
              component={Link}
              href={href}
              selected={current === href}
              aria-current={current === href ? "page" : undefined}
              sx={{ borderRadius: 1, mb: 1 }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Icon />
              </ListItemIcon>
              <ListItemText primary={label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          p: { xs: 4, md: 8 },
          // Keep the end of the page clear of the bottom bar on phones
          pb: { xs: `calc(${BOTTOM_NAV_SPACE} + 16px)`, md: 8 },
        }}
      >
        <Toolbar />
        {children}
      </Box>

      <Paper
        component="nav"
        aria-label="Main"
        elevation={8}
        variant="elevation"
        square
        sx={{
          display: { xs: "block", md: "none" },
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: (theme) => theme.zIndex.appBar,
          pb: "env(safe-area-inset-bottom)",
        }}
      >
        <BottomNavigation showLabels value={currentMobile}>
          {mobileNavItems.map(({ label, href, icon: Icon }) => (
            <BottomNavigationAction
              key={href}
              component={Link}
              href={href}
              value={href}
              label={label}
              icon={<Icon />}
              aria-current={currentMobile === href ? "page" : undefined}
            />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
