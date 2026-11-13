"use client";

import { createContext, useContext, useState, type JSX, type ReactNode } from "react";
import Alert, { type AlertColor } from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";

interface Message {
  key: number;
  text: string;
  severity: AlertColor;
}

type ShowMessage = (text: string, severity?: AlertColor) => void;

const SnackbarContext = createContext<ShowMessage | null>(null);

/** One snackbar for the whole app. Components call `useSnackbar()` to show a message. */
export function SnackbarProvider({ children }: { children: ReactNode }): JSX.Element {
  const [message, setMessage] = useState<Message | null>(null);
  const [open, setOpen] = useState(false);

  const show: ShowMessage = (text, severity = "success") => {
    setMessage({ key: Date.now(), text, severity });
    setOpen(true);
  };

  return (
    <SnackbarContext value={show}>
      {children}
      <Snackbar
        key={message?.key}
        open={open}
        autoHideDuration={5000}
        onClose={(_event, reason) => reason !== "clickaway" && setOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={message?.severity ?? "success"} variant="filled" onClose={() => setOpen(false)} sx={{ width: "100%" }}>
          {message?.text}
        </Alert>
      </Snackbar>
    </SnackbarContext>
  );
}

/** Shows a short message at the bottom of the screen. */
export function useSnackbar(): ShowMessage {
  const show = useContext(SnackbarContext);
  if (!show) throw new Error("useSnackbar must be used inside SnackbarProvider");
  return show;
}
