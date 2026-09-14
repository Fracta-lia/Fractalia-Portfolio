import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';

const gallery = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/gallery' }),
  schema: z.object({
    title: z.string(),
    technique: z.string().default('Óleo sobre lienzo'),
    year: z.string(),
    image: z.string(),
    width: z.number(),
    height: z.number(),
    order: z.number(),
    description: z.string().optional(),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string().optional(),
    // Home fields
    heroImage: z.string().optional(),
    artisticVisionQuote: z.string().optional(),
    // About fields
    quote: z.string().optional(),
    portrait: z.string().optional(),
  }),
});

export const collections = { gallery, pages };
