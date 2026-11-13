"use client";

import type { JSX, ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { conditions, finishes, labels, type CollectionEntry, type CreateCollectionEntryRequest } from "@mtg/shared";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import FormLabel from "@mui/material/FormLabel";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";

const flags = ["signed", "altered", "misprint", "proxy"] as const;

// Form values are what the inputs hold (the price is text); toRequest turns them into API fields
const entryFormSchema = z
  .object({
    quantity: z.number({ error: "Enter a number" }).int("Whole copies only").min(1, "At least 1").max(999, "At most 999"),
    finish: z.enum(finishes),
    condition: z.enum(conditions),
    language: z.string().trim().toLowerCase().min(2, "Use a language code, e.g. en").max(5),
    signed: z.boolean(),
    altered: z.boolean(),
    misprint: z.boolean(),
    proxy: z.boolean(),
    purchasePrice: z.string().trim().regex(/^(\d+(\.\d{1,2})?)?$/, "Enter a price like 2.50"),
    currency: z.string().trim().toUpperCase().regex(/^([A-Z]{3})?$/, "Use a 3-letter code, e.g. GBP"),
    notes: z.string().trim().max(500, "Keep it under 500 characters"),
  })
  .refine((values) => !values.purchasePrice || values.currency, { path: ["currency"], message: "Add the currency" });

export type EntryFormValues = z.infer<typeof entryFormSchema>;

/** The fields of a create or update request that the form edits. */
export type EntryFields = Omit<CreateCollectionEntryRequest, "scryfallId">;

export const emptyEntryForm: EntryFormValues = {
  quantity: 1,
  finish: "nonfoil",
  condition: "NM",
  language: "en",
  signed: false,
  altered: false,
  misprint: false,
  proxy: false,
  purchasePrice: "",
  currency: "GBP",
  notes: "",
};

export function entryToForm(entry: CollectionEntry): EntryFormValues {
  return {
    quantity: entry.quantity,
    finish: entry.finish,
    condition: entry.condition,
    language: entry.language,
    signed: entry.signed,
    altered: entry.altered,
    misprint: entry.misprint,
    proxy: entry.proxy,
    purchasePrice: entry.purchasePrice === null ? "" : entry.purchasePrice.toFixed(2),
    currency: entry.currency ?? "",
    notes: entry.notes ?? "",
  };
}

function toRequest(values: EntryFormValues): EntryFields {
  const price = values.purchasePrice ? Number(values.purchasePrice) : null;
  return {
    quantity: values.quantity,
    finish: values.finish,
    condition: values.condition,
    language: values.language,
    signed: values.signed,
    altered: values.altered,
    misprint: values.misprint,
    proxy: values.proxy,
    purchasePrice: price,
    currency: price === null ? null : values.currency,
    notes: values.notes || null,
  };
}

interface EntryFormProps {
  defaultValues: EntryFormValues;
  submitLabel: string;
  onSubmit: (fields: EntryFields) => void;
  pending: boolean;
  /** Error from the last save, if any. */
  error?: string | null;
  /** Extra buttons next to submit. */
  actions?: ReactNode;
}

/** Quantity, finish, condition, flags, price and notes for a set of copies. */
export function EntryForm({ defaultValues, submitLabel, onSubmit, pending, error, actions }: EntryFormProps): JSX.Element {
  const { control, handleSubmit, formState } = useForm<EntryFormValues>({
    resolver: zodResolver(entryFormSchema),
    defaultValues,
  });

  return (
    <Box component="form" noValidate onSubmit={handleSubmit((values) => onSubmit(toRequest(values)))}>
      <Stack sx={{ gap: 4 }}>
        {error && <Alert severity="error">{error}</Alert>}

        <Grid container spacing={3}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Controller
              name="quantity"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  onChange={(event) => field.onChange(event.target.value === "" ? Number.NaN : Number(event.target.value))}
                  value={Number.isNaN(field.value) ? "" : field.value}
                  type="number"
                  label="Quantity"
                  required
                  fullWidth
                  slotProps={{ htmlInput: { min: 1, max: 999 } }}
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Controller
              name="finish"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Finish" fullWidth>
                  {finishes.map((finish) => (
                    <MenuItem key={finish} value={finish}>{labels.finish[finish]}</MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>
          <Grid size={{ xs: 8, sm: 4 }}>
            <Controller
              name="condition"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Condition" fullWidth>
                  {conditions.map((condition) => (
                    <MenuItem key={condition} value={condition}>
                      {condition} · {labels.condition[condition]}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Grid>
          <Grid size={{ xs: 4, sm: 2 }}>
            <Controller
              name="language"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="Language"
                  fullWidth
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Controller
              name="purchasePrice"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="Price paid (each)"
                  inputMode="decimal"
                  fullWidth
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Controller
              name="currency"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="Currency"
                  fullWidth
                  slotProps={{ htmlInput: { maxLength: 3, style: { textTransform: "uppercase" } } }}
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormLabel component="legend" sx={{ typography: "body2" }}>This copy is</FormLabel>
            <FormGroup row>
              {flags.map((flag) => (
                <Controller
                  key={flag}
                  name={flag}
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      label={flag[0]?.toUpperCase() + flag.slice(1)}
                      control={<Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />}
                    />
                  )}
                />
              ))}
            </FormGroup>
          </Grid>
          <Grid size={12}>
            <Controller
              name="notes"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="Notes"
                  multiline
                  minRows={2}
                  fullWidth
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          </Grid>
        </Grid>

        <Stack direction="row" sx={{ gap: 2, flexWrap: "wrap" }}>
          <Button type="submit" variant="contained" loading={pending} disabled={formState.isSubmitting}>
            {submitLabel}
          </Button>
          {actions}
        </Stack>
      </Stack>
    </Box>
  );
}
