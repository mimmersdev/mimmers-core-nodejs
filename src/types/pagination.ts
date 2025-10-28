import { z } from "zod/v4";

export const PaginationRequestSchema = z.object({
    page: z.number().min(0).default(0),
    size: z.number().min(1).max(100).default(10),
});

export type PaginationRequest = z.infer<typeof PaginationRequestSchema>;

export type PaginationResponse<T> = {
    content: T[];
    total: number;
    page: number;
    size: number;
};