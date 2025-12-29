import { 
  type Creator, type InsertCreator,
  type Customer, type InsertCustomer,
  type AudioMessage, type InsertAudioMessage,
} from "@shared/schema";
import { MongoClient, Db, ObjectId } from "mongodb";

export interface IStorage {
  // Creator operations
  getCreator(id: string): Promise<Creator | undefined>;
  getCreatorByWhopUserId(whopUserId: string): Promise<Creator | undefined>;
  getCreatorByCompanyId(companyId: string): Promise<Creator | undefined>;
  getCreatorByUserAndCompany(whopUserId: string, whopCompanyId: string): Promise<Creator | undefined>;
  getAllCreators(): Promise<Creator[]>;
  createCreator(creator: InsertCreator): Promise<Creator>;
  updateCreator(id: string, updates: Partial<InsertCreator>): Promise<Creator | undefined>;
  
  // Customer operations
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerByWhopUserId(creatorId: string, whopUserId: string): Promise<Customer | undefined>;
  getCustomersByCreator(creatorId: string): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, updates: Partial<InsertCustomer>): Promise<Customer | undefined>;
  
  // Audio message operations
  getAudioMessage(id: string): Promise<AudioMessage | undefined>;
  getAudioMessagesByCustomer(customerId: string): Promise<AudioMessage[]>;
  getAudioMessagesByCreator(creatorId: string): Promise<AudioMessage[]>;
  getAudioMessagesByStatus(status: string): Promise<AudioMessage[]>;
  createAudioMessage(audioMessage: InsertAudioMessage): Promise<AudioMessage>;
  updateAudioMessage(id: string, updates: Partial<InsertAudioMessage>): Promise<AudioMessage | undefined>;
}

export class MongoStorage implements IStorage {
  private client: MongoClient;
  private db!: Db;
  private connected = false;

  constructor() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }
    this.client = new MongoClient(mongoUri);
  }

  private async connect() {
    if (!this.connected) {
      await this.client.connect();
      this.db = this.client.db("whop_video_app");
      this.connected = true;
      console.log("✅ Connected to MongoDB");
    }
  }

  private convertToCreator(doc: any): Creator | undefined {
    if (!doc) return undefined;
    return {
      _id: doc._id.toString(),
      whopUserId: doc.whopUserId,
      whopCompanyId: doc.whopCompanyId,
      messageTemplate: doc.messageTemplate ?? "Hey {name}! Welcome! I wanted to reach out personally to let you know how excited I am to have you join us. This is a great community, and I think you're going to love it here. If you ever need anything or have questions, don't hesitate to ask. Glad you're here!",
      audioFileUrl: doc.audioFileUrl ?? null,
      fishAudioModelId: doc.fishAudioModelId ?? null,
      isSetupComplete: doc.isSetupComplete ?? false,
      isAutomationActive: doc.isAutomationActive ?? true,
      credits: doc.credits ?? 20,
      planType: doc.planType ?? "free",
      whopPlanId: doc.whopPlanId ?? null,
      lastPurchaseDate: doc.lastPurchaseDate ?? null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private convertToCustomer(doc: any): Customer | undefined {
    if (!doc) return undefined;
    return {
      _id: doc._id.toString(),
      creatorId: doc.creatorId,
      whopUserId: doc.whopUserId,
      whopMemberId: doc.whopMemberId,
      whopCompanyId: doc.whopCompanyId ?? null,
      name: doc.name,
      email: doc.email ?? null,
      username: doc.username ?? null,
      planName: doc.planName ?? null,
      joinedAt: doc.joinedAt,
      firstMessageSent: doc.firstMessageSent ?? false,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private convertToAudioMessage(doc: any): AudioMessage | undefined {
    if (!doc) return undefined;
    return {
      _id: doc._id.toString(),
      customerId: doc.customerId,
      creatorId: doc.creatorId,
      audioUrl: doc.audioUrl ?? null,
      status: doc.status ?? "pending",
      personalizedScript: doc.personalizedScript,
      whopChatId: doc.whopChatId ?? null,
      whopMessageId: doc.whopMessageId ?? null,
      errorMessage: doc.errorMessage ?? null,
      playCount: doc.playCount ?? 0,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      completedAt: doc.completedAt ?? null,
      sentAt: doc.sentAt ?? null,
      playedAt: doc.playedAt ?? null,
    };
  }

  // Creator operations
  async getCreator(id: string): Promise<Creator | undefined> {
    await this.connect();
    const doc = await this.db.collection("creators").findOne({ _id: new ObjectId(id) });
    return this.convertToCreator(doc);
  }

  async getCreatorByWhopUserId(whopUserId: string): Promise<Creator | undefined> {
    await this.connect();
    const doc = await this.db.collection("creators").findOne({ whopUserId });
    return this.convertToCreator(doc);
  }

  async getCreatorByCompanyId(companyId: string): Promise<Creator | undefined> {
    await this.connect();
    const doc = await this.db.collection("creators").findOne({ whopCompanyId: companyId });
    return this.convertToCreator(doc);
  }

  async getCreatorByUserAndCompany(whopUserId: string, whopCompanyId: string): Promise<Creator | undefined> {
    await this.connect();
    const doc = await this.db.collection("creators").findOne({ whopUserId, whopCompanyId });
    return this.convertToCreator(doc);
  }

  async getAllCreators(): Promise<Creator[]> {
    await this.connect();
    const docs = await this.db.collection("creators").find().toArray();
    return docs.map(doc => this.convertToCreator(doc)!).filter(Boolean);
  }

  async createCreator(insertCreator: InsertCreator): Promise<Creator> {
    await this.connect();
    const now = new Date();
    const creator = {
      ...insertCreator,
      audioFileUrl: insertCreator.audioFileUrl ?? null,
      fishAudioModelId: insertCreator.fishAudioModelId ?? null,
      isSetupComplete: insertCreator.isSetupComplete ?? false,
      messageTemplate: insertCreator.messageTemplate ?? "Hey {name}! Welcome! I wanted to reach out personally to let you know how excited I am to have you join us. This is a great community, and I think you're going to love it here. If you ever need anything or have questions, don't hesitate to ask. Glad you're here!",
      createdAt: now,
      updatedAt: now,
    };
    
    const result = await this.db.collection("creators").insertOne(creator);
    return this.convertToCreator({ ...creator, _id: result.insertedId })!;
  }

  async updateCreator(id: string, updates: Partial<InsertCreator>): Promise<Creator | undefined> {
    await this.connect();
    const sanitized = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    const result = await this.db.collection("creators").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...sanitized, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    
    return result?.value ? this.convertToCreator(result.value) : undefined;
  }

  // Customer operations
  async getCustomer(id: string): Promise<Customer | undefined> {
    await this.connect();
    const doc = await this.db.collection("customers").findOne({ _id: new ObjectId(id) });
    return this.convertToCustomer(doc);
  }

  async getCustomerByWhopUserId(creatorId: string, whopUserId: string): Promise<Customer | undefined> {
    await this.connect();
    const doc = await this.db.collection("customers").findOne({ creatorId, whopUserId });
    return this.convertToCustomer(doc);
  }

  async getCustomersByCreator(creatorId: string): Promise<Customer[]> {
    await this.connect();
    const docs = await this.db.collection("customers").find({ creatorId }).sort({ createdAt: -1 }).toArray();
    return docs.map(doc => this.convertToCustomer(doc)!).filter(Boolean);
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    await this.connect();
    const now = new Date();
    const customer = {
      ...insertCustomer,
      email: insertCustomer.email ?? null,
      username: insertCustomer.username ?? null,
      planName: insertCustomer.planName ?? null,
      whopCompanyId: insertCustomer.whopCompanyId ?? null,
      firstMessageSent: insertCustomer.firstMessageSent ?? false,
      createdAt: now,
      updatedAt: now,
    };
    
    const result = await this.db.collection("customers").insertOne(customer);
    return this.convertToCustomer({ ...customer, _id: result.insertedId })!;
  }

  async updateCustomer(id: string, updates: Partial<InsertCustomer>): Promise<Customer | undefined> {
    await this.connect();
    const sanitized = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    const result = await this.db.collection("customers").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...sanitized, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    
    return result?.value ? this.convertToCustomer(result.value) : undefined;
  }

  // Audio message operations
  async getAudioMessage(id: string): Promise<AudioMessage | undefined> {
    await this.connect();
    const doc = await this.db.collection("audioMessages").findOne({ _id: new ObjectId(id) });
    return this.convertToAudioMessage(doc);
  }

  async getAudioMessagesByCustomer(customerId: string): Promise<AudioMessage[]> {
    await this.connect();
    const docs = await this.db.collection("audioMessages").find({ customerId }).toArray();
    return docs.map(doc => this.convertToAudioMessage(doc)!).filter(Boolean);
  }

  async getAudioMessagesByCreator(creatorId: string): Promise<AudioMessage[]> {
    await this.connect();
    const docs = await this.db.collection("audioMessages").find({ creatorId }).toArray();
    return docs.map(doc => this.convertToAudioMessage(doc)!).filter(Boolean);
  }

  async getAudioMessagesByStatus(status: string): Promise<AudioMessage[]> {
    await this.connect();
    const docs = await this.db.collection("audioMessages").find({ status }).toArray();
    return docs.map(doc => this.convertToAudioMessage(doc)!).filter(Boolean);
  }

  async createAudioMessage(insertAudioMessage: InsertAudioMessage): Promise<AudioMessage> {
    await this.connect();
    const now = new Date();
    const audioMessage = {
      ...insertAudioMessage,
      audioUrl: insertAudioMessage.audioUrl ?? null,
      status: insertAudioMessage.status ?? "pending",
      whopChatId: insertAudioMessage.whopChatId ?? null,
      whopMessageId: insertAudioMessage.whopMessageId ?? null,
      errorMessage: insertAudioMessage.errorMessage ?? null,
      playCount: insertAudioMessage.playCount ?? 0,
      completedAt: insertAudioMessage.completedAt ?? null,
      sentAt: insertAudioMessage.sentAt ?? null,
      playedAt: insertAudioMessage.playedAt ?? null,
      createdAt: now,
      updatedAt: now,
    };
    
    const result = await this.db.collection("audioMessages").insertOne(audioMessage);
    return this.convertToAudioMessage({ ...audioMessage, _id: result.insertedId })!;
  }

  async updateAudioMessage(id: string, updates: Partial<InsertAudioMessage>): Promise<AudioMessage | undefined> {
    await this.connect();
    const sanitized = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );

    const result = await this.db.collection("audioMessages").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...sanitized, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    
    return result?.value ? this.convertToAudioMessage(result.value) : undefined;
  }
}

export const storage = new MongoStorage();
