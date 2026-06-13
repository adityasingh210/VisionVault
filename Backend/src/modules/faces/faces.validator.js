import { z } from "zod";

export const getFaceClusterByIdSchema = z.object({
  id: z.string().uuid(),
});

