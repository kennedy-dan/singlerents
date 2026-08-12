import { PrismaClient } from '@prisma/client';
const globalForDb=globalThis; export const db=globalForDb.db||new PrismaClient(); if(process.env.NODE_ENV!=='production')globalForDb.db=db;
