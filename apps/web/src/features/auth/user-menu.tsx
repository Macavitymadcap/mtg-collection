"use client";

import { useState, type JSX } from "react";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import { useSnackbar } from "@/components/feedback/snackbar-provider";
import { errorMessage } from "@/lib/errors";
import { useSession, useSignOut } from "./queries";
import { SignInButton } from "./sign-in-button";

/** "Sign in" for visitors; for the signed-in person, their avatar with a menu to sign out. */
export function UserMenu(): JSX.Element | null {
  const { data: session, isPending } = useSession();
  const signOut = useSignOut();
  const showMessage = useSnackbar();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  if (isPending) return null;

  if (!session) {
    return <SignInButton color="inherit" />;
  }

  const { name, image, githubLogin } = session.user;
  return (
    <>
      <Tooltip title={`Signed in as ${githubLogin ?? name}`}>
        <IconButton
          color="inherit"
          aria-label="Account"
          aria-haspopup="menu"
          aria-expanded={anchor ? "true" : undefined}
          onClick={(event) => setAnchor(event.currentTarget)}
        >
          <Avatar src={image ?? undefined} alt="" sx={{ width: 32, height: 32 }}>
            {name.slice(0, 1)}
          </Avatar>
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <MenuItem disabled>
          <ListItemText primary={name} secondary={githubLogin ? `@${githubLogin}` : undefined} />
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            signOut.mutate(undefined, {
              onSuccess: () => showMessage("Signed out"),
              onError: (error) => showMessage(errorMessage(error, "Couldn't sign out"), "error"),
            });
          }}
        >
          <ListItemIcon>
            <LogoutRounded fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Sign out" />
        </MenuItem>
      </Menu>
    </>
  );
}
