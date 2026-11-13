"use client";

import type { JSX } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formats, labels, type CreateDeckRequest, type Format } from "@mtg/shared";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";

const deckFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(100, "Keep it under 100 characters"),
  format: z.enum(formats),
  description: z.string().trim().max(2000, "Keep it under 2000 characters"),
});

type DeckFormValues = z.infer<typeof deckFormSchema>;

interface DeckFormProps {
  defaultValues?: { name: string; format: Format; description: string | null };
  submitLabel: string;
  onSubmit: (values: CreateDeckRequest) => void;
  onCancel: () => void;
  pending: boolean;
  error?: string | null;
}

/** Name, format and description of a deck. */
export function DeckForm({ defaultValues, submitLabel, onSubmit, onCancel, pending, error }: DeckFormProps): JSX.Element {
  const { control, handleSubmit } = useForm<DeckFormValues>({
    resolver: zodResolver(deckFormSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      format: defaultValues?.format ?? "commander",
      description: defaultValues?.description ?? "",
    },
  });

  return (
    <Box
      component="form"
      noValidate
      onSubmit={handleSubmit((values) => onSubmit({ ...values, description: values.description || null }))}
    >
      <Stack sx={{ gap: 4, pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <Controller
          name="name"
          control={control}
          render={({ field, fieldState }) => (
            <TextField {...field} label="Name" required autoFocus error={Boolean(fieldState.error)} helperText={fieldState.error?.message} />
          )}
        />
        <Controller
          name="format"
          control={control}
          render={({ field }) => (
            <TextField {...field} select label="Format">
              {formats.map((format) => (
                <MenuItem key={format} value={format}>{labels.format[format]}</MenuItem>
              ))}
            </TextField>
          )}
        />
        <Controller
          name="description"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label="Description"
              multiline
              minRows={3}
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message}
            />
          )}
        />
        <Stack direction="row" sx={{ gap: 2, justifyContent: "flex-end" }}>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="contained" loading={pending}>{submitLabel}</Button>
        </Stack>
      </Stack>
    </Box>
  );
}
