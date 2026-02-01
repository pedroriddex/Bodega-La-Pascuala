import type { PortableTextBlock } from '@portabletext/types';
import groq from 'groq';

export const sandwichesQuery = groq`*[_type == "sandwich"] | order(_createdAt desc)`;

export const sandwichQuery = groq`*[_type == "sandwich" && _id == $id][0]`;

export const drinksQuery = groq`*[_type == "drink"] | order(_createdAt desc)`;

