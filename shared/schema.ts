import { z } from "zod";
import { pgTable, text, integer, real, timestamp, json, varchar, jsonb, index, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations, sql } from "drizzle-orm";

// Zod schemas for validation
export const photoSettingsSchema = z.object({
  width: z.number().min(10).max(100).default(35),
  height: z.number().min(10).max(150).default(45),
  quantity: z.number().min(1).max(20).default(8),
  layout: z.enum([
    'auto', 
    'top-left', 
    'top-middle', 
    'top-right',
    'middle-left', 
    'middle-middle', 
    'middle-right',
    'down-left', 
    'down-middle', 
    'down-right'
  ]).default('auto'),
  spacing: z.number().min(0).max(20).default(5),
  topMargin: z.number().min(5).max(50).default(10),
});

// Crop settings schema
export const cropSettingsSchema = z.object({
  x: z.number().min(-100).max(100).default(0),
  y: z.number().min(-100).max(100).default(0),
  width: z.number().min(20).max(100).default(100),
  height: z.number().min(20).max(100).default(100),
  scale: z.number().min(0.1).max(5).default(1),
  rotation: z.number().min(-180).max(180).default(0)
});

// Background settings schema
export const backgroundSettingsSchema = z.object({
  removeBackground: z.boolean().default(false),
  backgroundColor: z.string().default('#ffffff'),
  backgroundImage: z.string().optional(),
});

// Background removal request schema
export const backgroundRemovalRequestSchema = z.object({
  imageId: z.string(),
  backgroundColor: z.string().default('#ffffff'),
});

// Email authentication schemas
export const emailSignupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

export const emailLoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const emailVerificationSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  verificationCode: z.string().length(6, 'Verification code must be 6 digits'),
});

export const resendVerificationSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isGuest: boolean("is_guest").default(false),
  // Email/Password authentication fields
  passwordHash: varchar("password_hash"),
  authProvider: varchar("auth_provider").default("email"), // 'email', 'google', 'guest'
  isEmailVerified: boolean("is_email_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email verification table
export const emailVerifications = pgTable("email_verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  verificationCode: varchar("verification_code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Pending registrations table - stores registration data before email verification
export const pendingRegistrations = pgTable("pending_registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  passwordHash: varchar("password_hash").notNull(),
  verificationCode: varchar("verification_code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Database tables
export const uploadedImages = pgTable('uploaded_images', {
  id: text('id').primaryKey(),
  userId: varchar('user_id').references(() => users.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
  backgroundRemovedFilename: text('background_removed_filename'),
});

export const layoutResults = pgTable('layout_results', {
  id: text('id').primaryKey(),
  imageId: text('image_id').references(() => uploadedImages.id, { onDelete: 'cascade' }).notNull(),
  settings: json('settings').$type<PhotoSettings>().notNull(),
  cropSettings: json('crop_settings').$type<CropSettings>(),
  photosPerRow: integer('photos_per_row').notNull(),
  totalRows: integer('total_rows').notNull(),
  pageUtilization: real('page_utilization').notNull(),
  processedImageUrl: text('processed_image_url').notNull(),
  borderWidth: real('border_width').default(0).notNull(),
});

export const presets = pgTable('presets', {
  id: text('id').primaryKey(),
  userId: varchar('user_id').references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  settings: json('settings').$type<PhotoSettings>().notNull(),
  borderWidth: real('border_width').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  uploadedImages: many(uploadedImages),
  presets: many(presets),
  emailVerifications: many(emailVerifications),
}));

export const emailVerificationsRelations = relations(emailVerifications, ({ one }) => ({
  user: one(users, {
    fields: [emailVerifications.email],
    references: [users.email],
  }),
}));

export const uploadedImagesRelations = relations(uploadedImages, ({ many, one }) => ({
  layoutResults: many(layoutResults),
  user: one(users, {
    fields: [uploadedImages.userId],
    references: [users.id],
  }),
}));

export const layoutResultsRelations = relations(layoutResults, ({ one }) => ({
  uploadedImage: one(uploadedImages, {
    fields: [layoutResults.imageId],
    references: [uploadedImages.id],
  }),
}));

export const presetsRelations = relations(presets, ({ one }) => ({
  user: one(users, {
    fields: [presets.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUploadedImageSchema = createInsertSchema(uploadedImages).omit({
  id: true,
  uploadedAt: true,
});

export const insertLayoutResultSchema = createInsertSchema(layoutResults).omit({
  id: true,
});

export const insertPresetSchema = createInsertSchema(presets).omit({
  id: true,
  createdAt: true,
});

export const insertEmailVerificationSchema = createInsertSchema(emailVerifications).omit({
  id: true,
  createdAt: true,
});

export const insertPendingRegistrationSchema = createInsertSchema(pendingRegistrations).omit({
  id: true,
  createdAt: true,
});

// Types
export type PhotoSettings = z.infer<typeof photoSettingsSchema>;
export type CropSettings = z.infer<typeof cropSettingsSchema>;
export type BackgroundSettings = z.infer<typeof backgroundSettingsSchema>;
export type BackgroundRemovalRequest = z.infer<typeof backgroundRemovalRequestSchema>;
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type UploadedImage = typeof uploadedImages.$inferSelect;
export type InsertUploadedImage = z.infer<typeof insertUploadedImageSchema>;
export type LayoutResult = typeof layoutResults.$inferSelect;
export type InsertLayoutResult = z.infer<typeof insertLayoutResultSchema>;
export type Preset = typeof presets.$inferSelect;
export type InsertPreset = z.infer<typeof insertPresetSchema>;
export type EmailVerification = typeof emailVerifications.$inferSelect;
export type InsertEmailVerification = z.infer<typeof insertEmailVerificationSchema>;
export type PendingRegistration = typeof pendingRegistrations.$inferSelect;
export type InsertPendingRegistration = z.infer<typeof insertPendingRegistrationSchema>;

// Email authentication types
export type EmailSignup = z.infer<typeof emailSignupSchema>;
export type EmailLogin = z.infer<typeof emailLoginSchema>;
export type EmailVerificationRequest = z.infer<typeof emailVerificationSchema>;
export type ResendVerificationRequest = z.infer<typeof resendVerificationSchema>;

// Legacy schemas for backward compatibility
export const uploadedImageSchema = z.object({
  id: z.string(),
  filename: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  uploadedAt: z.date(),
});

export const layoutResultSchema = z.object({
  imageId: z.string(),
  settings: photoSettingsSchema,
  photosPerRow: z.number(),
  totalRows: z.number(),
  pageUtilization: z.number(),
  processedImageUrl: z.string(),
});
