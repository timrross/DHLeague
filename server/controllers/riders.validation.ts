import { z } from "zod";
import { InsertRider } from "@shared/schema";

const baseRiderSchema = z
  .object({
    riderId: z.string().trim().min(1, "riderId is required"),
    name: z.string().trim().min(1, "name is required"),
    firstName: z.string().trim().optional(),
    lastName: z.string().trim().optional(),
    gender: z.enum(["male", "female"], {
      required_error: "gender is required",
      invalid_type_error: "gender must be 'male' or 'female'",
    }),
    team: z.string().trim().min(1, "team is required"),
    cost: z.coerce.number().int().nonnegative({ message: "cost must be a non-negative integer" }),
    lastYearStanding: z
      .coerce
      .number()
      .int()
      .nonnegative({ message: "lastYearStanding must be a non-negative integer" })
      .default(0),
    image: z.string().trim().min(1, "image is required").optional(),
    profileImageUrl: z.string().trim().min(1, "profileImageUrl is required").optional(),
    country: z.string().trim().optional(),
    points: z
      .coerce
      .number()
      .int()
      .nonnegative({ message: "points must be a non-negative integer" })
      .default(0),
    form: z.string().trim().optional(),
    injured: z.coerce.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.image && !value.profileImageUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["image"],
        message: "Either image or profileImageUrl is required",
      });
    }
  });

export const createRiderSchema = baseRiderSchema.transform(
  ({ profileImageUrl, ...rest }): InsertRider => ({
    ...rest,
    image: rest.image ?? profileImageUrl!,
  })
);

export const updateRiderSchema = baseRiderSchema
  .partial()
  .superRefine((value, ctx) => {
    const hasAtLeastOneKey = Object.values(value).some((val) => val !== undefined);

    if (!hasAtLeastOneKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field must be provided to update a rider",
      });
    }

    if (value.image === undefined && value.profileImageUrl === undefined) {
      return;
    }

    if (!value.image && !value.profileImageUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["image"],
        message: "Either image or profileImageUrl is required",
      });
    }
  })
  .transform(
    ({ profileImageUrl, ...rest }): Partial<InsertRider> => ({
      ...rest,
      ...(profileImageUrl && !rest.image ? { image: profileImageUrl } : {}),
    })
  );
