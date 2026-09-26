import { z } from "zod"

export const listUploadsSchema = z.object({
    // present only when a moderator is listing someone else's files;
    // logged to moderation_action (spec 0002 API surface)
    targetUserLinkId: z.string().optional(),
})

export const deleteUploadsSchema = z.object({
    keys: z.array(z.string().min(1)).min(1),
})
