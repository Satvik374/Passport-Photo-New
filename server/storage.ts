import { type UploadedImage, type LayoutResult, type InsertUploadedImage, type InsertLayoutResult, type Preset, type InsertPreset, type User, type UpsertUser, type EmailVerification, type InsertEmailVerification, type PendingRegistration, type InsertPendingRegistration } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  
  // Email verification operations
  saveEmailVerification(verification: InsertEmailVerification): Promise<EmailVerification>;
  getEmailVerification(email: string, code: string): Promise<EmailVerification | undefined>;
  markEmailVerificationAsUsed(id: string): Promise<void>;
  deleteExpiredVerifications(): Promise<void>;
  
  // Pending registration operations
  savePendingRegistration(registration: InsertPendingRegistration): Promise<PendingRegistration>;
  getPendingRegistration(email: string, code: string): Promise<PendingRegistration | undefined>;
  getPendingRegistrationByEmail(email: string): Promise<PendingRegistration | undefined>;
  deletePendingRegistration(email: string): Promise<void>;
  deleteExpiredPendingRegistrations(): Promise<void>;
  
  // Image operations
  saveUploadedImage(image: InsertUploadedImage): Promise<UploadedImage>;
  getUploadedImage(id: string): Promise<UploadedImage | undefined>;
  updateUploadedImage(id: string, updates: Partial<UploadedImage>): Promise<UploadedImage>;
  getUserImages(userId: string): Promise<UploadedImage[]>;
  
  // Layout operations
  saveLayoutResult(result: InsertLayoutResult): Promise<LayoutResult>;
  getLayoutResult(imageId: string): Promise<LayoutResult | undefined>;
  getLayoutResultById(id: string): Promise<LayoutResult | undefined>;
  deleteUploadedImage(id: string): Promise<void>;
  
  // Preset methods
  getAllPresets(userId?: string): Promise<Preset[]>;
  savePreset(preset: InsertPreset): Promise<Preset>;
  deletePreset(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users = new Map<string, User>();
  private usersByEmail = new Map<string, User>();
  private images = new Map<string, UploadedImage>();
  private layouts = new Map<string, LayoutResult>();
  private presetsList = new Map<string, Preset>();
  private emailVerificationsList = new Map<string, EmailVerification>();
  private pendingRegistrationsList = new Map<string, PendingRegistration>();

  // Memory limits to stay under 512MB
  private readonly MAX_IMAGES = 100;
  private readonly MAX_LAYOUTS = 100;
  private readonly MAX_USERS = 1000;
  private readonly MAX_PRESETS = 500;

  constructor() {
    // Run cleanup every 5 minutes
    setInterval(() => {
      this.cleanup().catch(err => console.error('Cleanup error:', err));
    }, 5 * 60 * 1000);
  }

  private async cleanup() {
    // Remove expired verifications
    await this.deleteExpiredVerifications();
    await this.deleteExpiredPendingRegistrations();

    // Remove old images if over limit
    if (this.images.size > this.MAX_IMAGES) {
      const sortedImages = Array.from(this.images.values())
        .sort((a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime());
      const toRemove = sortedImages.slice(0, this.images.size - this.MAX_IMAGES);
      toRemove.forEach(img => this.images.delete(img.id));
    }

    // Remove old layouts if over limit
    if (this.layouts.size > this.MAX_LAYOUTS) {
      const sortedLayouts = Array.from(this.layouts.values())
        .sort((a, b) => a.id.localeCompare(b.id));
      const toRemove = sortedLayouts.slice(0, this.layouts.size - this.MAX_LAYOUTS);
      toRemove.forEach(layout => this.layouts.delete(layout.id));
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.usersByEmail.get(email);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = userData.id ? this.users.get(userData.id) : undefined;
    
    const user: User = {
      id: userData.id || randomUUID(),
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      isGuest: userData.isGuest ?? false,
      passwordHash: userData.passwordHash || null,
      authProvider: userData.authProvider || 'email',
      isEmailVerified: userData.isEmailVerified ?? false,
      createdAt: existingUser?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    this.users.set(user.id, user);
    if (user.email) {
      this.usersByEmail.set(user.email, user);
    }
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const id = userData.id || randomUUID();
    const user: User = {
      id,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      isGuest: userData.isGuest ?? false,
      passwordHash: userData.passwordHash || null,
      authProvider: userData.authProvider || 'email',
      isEmailVerified: userData.isEmailVerified ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.set(user.id, user);
    if (user.email) {
      this.usersByEmail.set(user.email, user);
    }
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      throw new Error(`User with id ${id} not found`);
    }

    const user: User = {
      ...existingUser,
      ...updates,
      updatedAt: new Date(),
    };

    this.users.set(user.id, user);
    if (user.email) {
      this.usersByEmail.set(user.email, user);
    }
    return user;
  }

  async saveEmailVerification(verification: InsertEmailVerification): Promise<EmailVerification> {
    const id = randomUUID();
    const emailVerification: EmailVerification = {
      id,
      email: verification.email,
      verificationCode: verification.verificationCode,
      expiresAt: verification.expiresAt,
      used: false,
      createdAt: new Date(),
    };
    this.emailVerificationsList.set(id, emailVerification);
    return emailVerification;
  }

  async getEmailVerification(email: string, code: string): Promise<EmailVerification | undefined> {
    const now = new Date();
    for (const verification of this.emailVerificationsList.values()) {
      if (
        verification.email === email &&
        verification.verificationCode === code &&
        !verification.used &&
        verification.expiresAt > now
      ) {
        return verification;
      }
    }
    return undefined;
  }

  async markEmailVerificationAsUsed(id: string): Promise<void> {
    const verification = this.emailVerificationsList.get(id);
    if (verification) {
      verification.used = true;
      this.emailVerificationsList.set(id, verification);
    }
  }

  async deleteExpiredVerifications(): Promise<void> {
    const now = new Date();
    for (const [id, verification] of this.emailVerificationsList.entries()) {
      if (!verification.used && verification.expiresAt <= now) {
        this.emailVerificationsList.delete(id);
      }
    }
  }

  async savePendingRegistration(registration: InsertPendingRegistration): Promise<PendingRegistration> {
    await this.deletePendingRegistration(registration.email);
    
    const id = randomUUID();
    const pendingRegistration: PendingRegistration = {
      id,
      email: registration.email,
      firstName: registration.firstName,
      lastName: registration.lastName,
      passwordHash: registration.passwordHash,
      verificationCode: registration.verificationCode,
      expiresAt: registration.expiresAt,
      createdAt: new Date(),
    };
    this.pendingRegistrationsList.set(id, pendingRegistration);
    return pendingRegistration;
  }

  async getPendingRegistration(email: string, code: string): Promise<PendingRegistration | undefined> {
    const now = new Date();
    for (const registration of this.pendingRegistrationsList.values()) {
      if (
        registration.email === email &&
        registration.verificationCode === code &&
        registration.expiresAt > now
      ) {
        return registration;
      }
    }
    return undefined;
  }

  async getPendingRegistrationByEmail(email: string): Promise<PendingRegistration | undefined> {
    const now = new Date();
    for (const registration of this.pendingRegistrationsList.values()) {
      if (registration.email === email && registration.expiresAt > now) {
        return registration;
      }
    }
    return undefined;
  }

  async deletePendingRegistration(email: string): Promise<void> {
    for (const [id, registration] of this.pendingRegistrationsList.entries()) {
      if (registration.email === email) {
        this.pendingRegistrationsList.delete(id);
      }
    }
  }

  async deleteExpiredPendingRegistrations(): Promise<void> {
    const now = new Date();
    for (const [id, registration] of this.pendingRegistrationsList.entries()) {
      if (registration.expiresAt <= now) {
        this.pendingRegistrationsList.delete(id);
      }
    }
  }

  async saveUploadedImage(image: InsertUploadedImage): Promise<UploadedImage> {
    const id = randomUUID();
    const uploadedImage: UploadedImage = {
      id,
      userId: image.userId || null,
      filename: image.filename,
      originalName: image.originalName,
      mimeType: image.mimeType,
      size: image.size,
      uploadedAt: new Date(),
      backgroundRemovedFilename: image.backgroundRemovedFilename || null,
    };
    this.images.set(id, uploadedImage);
    return uploadedImage;
  }

  async getUploadedImage(id: string): Promise<UploadedImage | undefined> {
    return this.images.get(id);
  }

  async updateUploadedImage(id: string, updates: Partial<UploadedImage>): Promise<UploadedImage> {
    const existingImage = this.images.get(id);
    if (!existingImage) {
      throw new Error(`Image with id ${id} not found`);
    }

    const updatedImage: UploadedImage = {
      ...existingImage,
      ...updates,
    };
    this.images.set(id, updatedImage);
    return updatedImage;
  }

  async getUserImages(userId: string): Promise<UploadedImage[]> {
    const userImages: UploadedImage[] = [];
    for (const image of this.images.values()) {
      if (image.userId === userId) {
        userImages.push(image);
      }
    }
    return userImages.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }

  async saveLayoutResult(result: InsertLayoutResult): Promise<LayoutResult> {
    const id = randomUUID();
    const layoutResult: LayoutResult = {
      id,
      imageId: result.imageId,
      settings: result.settings as any,
      cropSettings: result.cropSettings || null,
      photosPerRow: result.photosPerRow,
      totalRows: result.totalRows,
      pageUtilization: result.pageUtilization,
      processedImageUrl: result.processedImageUrl,
      borderWidth: result.borderWidth ?? 0,
    };
    this.layouts.set(id, layoutResult);
    return layoutResult;
  }

  async getLayoutResult(imageId: string): Promise<LayoutResult | undefined> {
    const layouts: LayoutResult[] = [];
    for (const layout of this.layouts.values()) {
      if (layout.imageId === imageId) {
        layouts.push(layout);
      }
    }
    return layouts.sort((a, b) => b.id.localeCompare(a.id))[0];
  }

  async getLayoutResultById(id: string): Promise<LayoutResult | undefined> {
    return this.layouts.get(id);
  }

  async deleteUploadedImage(id: string): Promise<void> {
    for (const [layoutId, layout] of this.layouts.entries()) {
      if (layout.imageId === id) {
        this.layouts.delete(layoutId);
      }
    }
    this.images.delete(id);
  }

  async getAllPresets(userId?: string): Promise<Preset[]> {
    const presets: Preset[] = [];
    for (const preset of this.presetsList.values()) {
      if (!userId || preset.userId === userId) {
        presets.push(preset);
      }
    }
    return presets.sort((a, b) => a.createdAt!.getTime() - b.createdAt!.getTime());
  }

  async savePreset(preset: InsertPreset): Promise<Preset> {
    const id = randomUUID();
    const savedPreset: Preset = {
      id,
      userId: preset.userId || null,
      name: preset.name,
      description: preset.description || null,
      settings: preset.settings as any,
      borderWidth: preset.borderWidth ?? 0,
      createdAt: new Date(),
    };
    this.presetsList.set(id, savedPreset);
    return savedPreset;
  }

  async deletePreset(id: string): Promise<void> {
    this.presetsList.delete(id);
  }
}

export const storage = new MemStorage();
