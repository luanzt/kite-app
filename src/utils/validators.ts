import { z } from 'zod'

export const trackerBaseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['habit', 'target', 'average', 'project'])
})

export type TrackerFormData = z.infer<typeof trackerBaseSchema>
