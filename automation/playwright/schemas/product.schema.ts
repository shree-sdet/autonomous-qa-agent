
import { z } from 'zod';

export const ProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  deluxePrice: z.number(),
  image: z.string(),
});

export const ProductSearchSchema = z.object({
  status: z.literal('success'),
  data: z.array(ProductSchema),
});

export type Product = z.infer<typeof ProductSchema>;