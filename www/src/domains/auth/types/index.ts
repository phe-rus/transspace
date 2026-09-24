import { z } from "zod"

export const signOutSchema = z.object({
    everywhere: z.boolean().optional(),
})
