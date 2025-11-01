import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { whopSdk } from "./lib/whop-sdk";
import { fishAudioSdk } from "./lib/fish-audio-sdk";
import { TEMPLATE_PLACEHOLDERS, MESSAGE_STATUSES, replacePlaceholders, type Creator, type Customer } from "@shared/schema";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";

// Helper function to send DM with audio link via support channel
async function sendAudioDM(
  customer: Customer, 
  creator: Creator, 
  audioUrl: string
): Promise<{ messageId: string }> {
  try {
    console.log(`📨 Sending DM with audio to ${customer.name} from creator ${creator.whopUserId} via support channel...`);
    
    // Send message via support channel so it appears from creator's agent
    const messageContent = `Hi ${customer.name}! 🎵 I recorded a personal audio message for you.\n\nListen here: ${audioUrl}`;
    
    console.log(`📨 Sending message for creator ${creator.whopUserId}`);
    console.log(`🏢 Using company context: ${creator.whopCompanyId}`);
    
    if (!creator.whopCompanyId) {
      throw new Error("Creator Company ID is required");
    }
    if (!customer.whopUserId) {
      throw new Error("Customer Whop User ID is required");
    }
    
    // Use the official Whop SDK with support for support channels
    const Whop = (await import('@whop/sdk')).default;
    const whopClient = new Whop({
      appID: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
      apiKey: process.env.WHOP_API_KEY!,
    });
    
    // First, try to find existing support channel between admin and customer
    console.log(`🔍 Looking for existing support channel for user ${customer.whopUserId}...`);
    
    let supportChannelId: string | null = null;
    
    try {
      // List all support channels for this company to find one with this user
      console.log(`📋 Listing support channels for company ${creator.whopCompanyId}...`);
      
      const channelsList: any[] = [];
      for await (const channel of whopClient.supportChannels.list({
        company_id: creator.whopCompanyId,
      })) {
        channelsList.push(channel);
      }
      
      console.log(`📋 Found ${channelsList.length} support channels`);
      
      // Find channel with this customer
      const existingChannel = channelsList.find((channel: any) => {
        return channel.customer_user?.id === customer.whopUserId;
      });
      
      if (existingChannel) {
        supportChannelId = existingChannel.id;
        console.log(`✅ Found existing support channel: ${supportChannelId}`);
      }
    } catch (error) {
      console.log(`⚠️ Error listing support channels:`, error);
    }
    
    // If no channel exists, create one
    if (!supportChannelId) {
      console.log(`📝 Creating new support channel for ${customer.whopUserId}...`);
      try {
        const newChannel = await whopClient.supportChannels.create({
          company_id: creator.whopCompanyId,
          user_id: customer.whopUserId,
        });
        
        supportChannelId = newChannel.id;
        console.log(`✅ Created new support channel: ${supportChannelId}`);
      } catch (error) {
        console.error(`❌ Failed to create support channel:`, error);
        throw error;
      }
    }
    
    // Send message to the support channel
    console.log(`💬 Sending message to support channel ${supportChannelId}...`);
    
    try {
      const message = await whopClient.messages.create({
        channel_id: supportChannelId,
        content: messageContent,
      });
      
      if (!message.id) {
        throw new Error("Failed to send message - no message ID returned");
      }
      
      console.log(`✅ Message sent to ${customer.name} via support channel: ${message.id}`);
      
      return {
        messageId: message.id,
      };
    } catch (error) {
      console.error(`❌ Error sending message:`, error);
      throw error;
    }
  } catch (error) {
    console.error(`❌ Error sending DM via support channel:`, error);
    throw error;
  }
}

// Helper function to generate welcome audio message for a customer
async function generateWelcomeAudio(customer: Customer, creator: Creator) {
  try {
    console.log(`🎵 Starting audio generation for ${customer.name}`);

    // Generate personalized script using template
    const personalizedScript = replacePlaceholders(creator.messageTemplate, {
      name: customer.name,
      email: customer.email,
      username: customer.username,
      planName: customer.planName,
    });

    // Create audio message record
    const audioMessage = await storage.createAudioMessage({
      customerId: customer._id,
      creatorId: creator._id,
      personalizedScript,
      status: MESSAGE_STATUSES.GENERATING,
      audioUrl: null,
      whopChatId: null,
      whopMessageId: null,
      errorMessage: null,
      playCount: 0,
      completedAt: null,
      sentAt: null,
      playedAt: null,
      updatedAt: new Date(),
    });

    console.log(`✅ Created audio message record for ${customer.name}`);

    // Check if creator has Fish Audio model
    if (!creator.fishAudioModelId) {
      throw new Error("Fish Audio model not configured. Please upload a voice sample in settings.");
    }

    // Check if model is trained
    console.log(`🐟 Checking Fish Audio model ${creator.fishAudioModelId}...`);
    const modelStatus = await fishAudioSdk.getModel(creator.fishAudioModelId);
    
    if (modelStatus.state !== 'trained') {
      throw new Error(`Fish Audio model is not ready yet (state: ${modelStatus.state}). Please wait for training to complete.`);
    }

    console.log(`🐟 Generating speech with Fish Audio for ${customer.name}`);
    
    // Generate audio with Fish Audio
    const audioBuffer = await fishAudioSdk.generateSpeech({
      text: personalizedScript,
      referenceId: creator.fishAudioModelId,
      format: 'mp3',
    });

    // Convert to base64 data URL for storage and portal playback
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    const audioDataUrl = `data:audio/mp3;base64,${audioBase64}`;

    // Generate public URL for DM (will be served by our /api/audio/:id endpoint)
    const baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : process.env.RENDER_EXTERNAL_URL || 'http://localhost:5000';
    const audioPublicUrl = `${baseUrl}/api/audio/${audioMessage._id}`;
    console.log(`✅ Audio will be available at: ${audioPublicUrl}`);

    // Update audio message with completion data
    await storage.updateAudioMessage(audioMessage._id, {
      status: MESSAGE_STATUSES.COMPLETED,
      audioUrl: audioDataUrl, // Store data URL for portal playback
      completedAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`🎉 Audio generation completed for ${customer.name}`);
    
    // Send audio via DM with the public URL
    const { messageId } = await sendAudioDM(
      customer,
      creator,
      audioPublicUrl
    );
    
    // Update message record with message ID
    await storage.updateAudioMessage(audioMessage._id, {
      status: MESSAGE_STATUSES.SENT,
      whopMessageId: messageId,
      sentAt: new Date(),
    });
    
    // Update customer record
    await storage.updateCustomer(customer._id, {
      firstMessageSent: true,
    });
    
    console.log(`✅ Audio sent to ${customer.name} via DM`);
    
    // Return the audio message info
    return { 
      audioMessage,
      messageId
    };
  } catch (error) {
    console.error(`❌ Error generating audio for ${customer.name}:`, error);
    throw error;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');
  if (!existsSync(uploadsDir)) {
    await fs.mkdir(uploadsDir, { recursive: true });
  }

  // Serve uploaded avatar files statically
  app.use('/uploads/avatars', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
  });
  app.use('/uploads/avatars', express.static(uploadsDir));

  // Configure multer for image uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      // Accept only image files
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    },
  });

  // Configure multer for audio uploads
  const uploadAudio = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 20 * 1024 * 1024, // 20MB limit for audio files
    },
    fileFilter: (req, file, cb) => {
      // Accept only audio files
      if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new Error('Only audio files are allowed'));
      }
    },
  });


  // Validate user access to an experience
  app.post("/api/validate-access", async (req, res) => {
    try {
      const { experienceId } = req.body;
      
      if (!experienceId) {
        return res.status(400).json({ error: "experienceId is required" });
      }

      // Extract user token from headers (passed by Whop iframe)
      const userToken = req.headers["x-whop-user-token"] as string;
      
      if (!userToken) {
        return res.status(401).json({ 
          error: "Missing x-whop-user-token header. Ensure you're accessing this app through Whop or using the dev proxy for local development.",
          hasAccess: false,
          accessLevel: "no_access"
        });
      }

      // Verify user token and get user ID
      const { userId } = await whopSdk.verifyUserToken(userToken);

      // Check if user has access to the experience
      const result = await whopSdk.access.checkIfUserHasAccessToExperience({
        userId,
        experienceId,
      });

      // Fetch user details from Whop SDK to get the user's name
      let userName = null;
      let username = null;
      try {
        const userDetails = await whopSdk.users.getUser({ userId });
        console.log("Fetched user details:", JSON.stringify(userDetails));
        userName = userDetails.name || userDetails.username || null;
        username = userDetails.username || null;
        console.log(`User details: name="${userName}", username="${username}"`);
      } catch (userError) {
        console.error("Error fetching user details in validate-access:", userError);
      }

      // Get company ID from the experience (works for all users who have access)
      let companyId = null;
      try {
        // Fetch the experience details to get the company ID
        const experience = await whopSdk.experiences.getExperience({ experienceId });
        companyId = experience.company?.id || null;
        console.log(`📦 Retrieved company ID from experience: ${companyId}`);
      } catch (experienceError) {
        console.error("Error fetching experience for company ID:", experienceError);
        
        // Fallback: For admin users, try to get from creator settings
        if (result.accessLevel === "admin") {
          try {
            const creator = await storage.getCreatorByWhopUserId(userId);
            if (creator && creator.whopCompanyId) {
              companyId = creator.whopCompanyId;
              console.log(`📦 Using fallback company ID from creator: ${companyId}`);
            }
          } catch (creatorError) {
            console.error("Error fetching creator for company ID:", creatorError);
          }
        }
      }

      // Return access information
      const response = {
        hasAccess: result.hasAccess,
        accessLevel: result.accessLevel,
        userId,
        userName,
        username,
        companyId
      };
      console.log("Sending validate-access response:", JSON.stringify(response));
      return res.json(response);
    } catch (error) {
      console.error("Error validating access:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return res.status(500).json({ 
        error: `Failed to validate access: ${errorMessage}. Check your WHOP_API_KEY and NEXT_PUBLIC_WHOP_APP_ID configuration.`,
        hasAccess: false,
        accessLevel: "no_access"
      });
    }
  });

  // Get current user information
  app.get("/api/user", async (req, res) => {
    try {
      const userToken = req.headers["x-whop-user-token"] as string;
      
      if (!userToken) {
        return res.status(401).json({ error: "No user token provided" });
      }

      // Verify user token and get user ID
      const { userId } = await whopSdk.verifyUserToken(userToken);

      // Get user information
      const user = await whopSdk.users.getUser({ userId });

      return res.json({ user });
    } catch (error) {
      console.error("Error fetching user:", error);
      return res.status(500).json({ error: "Failed to fetch user information" });
    }
  });

  // ============================================================================
  // ADMIN ENDPOINTS
  // ============================================================================

  // Get creator settings
  app.get("/api/admin/creator", async (req, res) => {
    try {
      const userToken = req.headers["x-whop-user-token"] as string;
      if (!userToken) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { userId } = await whopSdk.verifyUserToken(userToken);

      // Get creator record
      let creator = await storage.getCreatorByWhopUserId(userId);
      
      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }

      // MULTI-TENANT FIX: Get current company ID from query param
      const { experienceId } = req.query;
      
      if (experienceId) {
        try {
          const experience = await whopSdk.experiences.getExperience({ experienceId: experienceId as string });
          const currentCompanyId = experience.company?.id;
          
          if (currentCompanyId && creator.whopCompanyId !== currentCompanyId) {
            console.warn(`⚠️ Company ID mismatch in GET creator: ${creator.whopCompanyId} -> ${currentCompanyId}`);
            console.log(`🔧 Auto-fixing company ID for user ${userId}`);
            
            await storage.updateCreator(creator._id, {
              whopCompanyId: currentCompanyId,
            });
            
            creator = await storage.getCreatorByWhopUserId(userId);
            console.log(`✅ Company ID updated to ${currentCompanyId}`);
          }
        } catch (error) {
          console.error("Error checking company ID:", error);
        }
      }

      return res.json(creator);
    } catch (error) {
      console.error("Error fetching creator:", error);
      return res.status(500).json({ error: "Failed to fetch creator" });
    }
  });

  // Initialize or get creator settings
  app.post("/api/admin/initialize", async (req, res) => {
    try {
      const userToken = req.headers["x-whop-user-token"] as string;
      if (!userToken) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { userId } = await whopSdk.verifyUserToken(userToken);
      const { experienceId } = req.body;

      // MULTI-TENANT SECURITY: Require experienceId to get company ID
      if (!experienceId) {
        return res.status(400).json({ 
          error: "experienceId is required for multi-tenant setup" 
        });
      }

      // SECURITY: Verify user has ADMIN access to the experience before allowing initialization
      // This prevents users from registering under other companies' experiences
      try {
        const accessCheck = await whopSdk.access.checkIfUserHasAccessToExperience({
          userId,
          experienceId,
        });

        if (accessCheck.accessLevel !== "admin") {
          console.error(`❌ Security: User ${userId} attempted to initialize with experience ${experienceId} but has ${accessCheck.accessLevel} access, not admin`);
          return res.status(403).json({ 
            error: "You must have admin access to this experience to set up the app" 
          });
        }

        console.log(`✅ Verified user ${userId} has admin access to experience ${experienceId}`);
      } catch (error) {
        console.error("Error verifying experience access:", error);
        return res.status(403).json({ 
          error: "Failed to verify your access to this experience" 
        });
      }

      // Get company ID from the experience (for multi-tenant support)
      let whopCompanyId: string | null = null;
      try {
        const experience = await whopSdk.experiences.getExperience({ experienceId });
        whopCompanyId = experience.company?.id || null;
        console.log(`📦 Retrieved company ID during initialization: ${whopCompanyId}`);
      } catch (error) {
        console.error("Error fetching company ID during initialization:", error);
        return res.status(500).json({ 
          error: "Failed to fetch company information. Please ensure you're accessing this app through Whop." 
        });
      }

      // MULTI-TENANT SECURITY: Require company ID for creator creation
      if (!whopCompanyId) {
        return res.status(400).json({ 
          error: "Could not determine company ID. Please ensure you're accessing this app through a Whop experience." 
        });
      }

      // Get or create creator record
      let creator = await storage.getCreatorByWhopUserId(userId);
      
      if (!creator) {
        creator = await storage.createCreator({
          whopUserId: userId,
          whopCompanyId,
          messageTemplate: "Hi {name}! Welcome to our community. We're excited to have you here!",
          audioFileUrl: null,
          fishAudioModelId: null,
          isSetupComplete: false,
          isAutomationActive: true,
        });
        console.log(`✅ Created new creator with company ID: ${whopCompanyId}`);
      } else {
        // Check if creator has different company ID
        if (creator.whopCompanyId !== whopCompanyId) {
          console.warn(`⚠️ Company ID mismatch: Creator has ${creator.whopCompanyId}, accessing ${whopCompanyId}`);
          console.log(`🔧 Auto-fixing company ID for user ${userId}`);
          
          // Update creator with correct company ID
          await storage.updateCreator(creator._id, {
            whopCompanyId,
          });
          
          // Re-fetch to get updated data
          creator = await storage.getCreatorByWhopUserId(userId);
          console.log(`✅ Company ID updated to ${whopCompanyId}`);
        }
        console.log(`✅ Found existing creator for company ${whopCompanyId}`);
      }

      return res.json({ creator });
    } catch (error) {
      console.error("Error initializing creator:", error);
      return res.status(500).json({ error: "Failed to initialize creator" });
    }
  });

  // Save creator settings (message template, etc.)
  app.post("/api/admin/save-settings", async (req, res) => {
    try {
      const userToken = req.headers["x-whop-user-token"] as string;
      if (!userToken) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { userId } = await whopSdk.verifyUserToken(userToken);
      const creator = await storage.getCreatorByWhopUserId(userId);

      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }

      // SECURITY: Extract only safe-to-update fields from request
      // whopCompanyId is intentionally excluded - it can ONLY be set during initialization
      // Allowing client to set company ID would enable cross-company data access
      const { messageTemplate } = req.body;

      // Update only the message template (not company ID)
      await storage.updateCreator(creator._id, {
        messageTemplate,
      });

      // Re-fetch creator to get latest state (including any recently uploaded avatar/audio)
      const freshCreator = await storage.getCreatorByWhopUserId(userId);
      
      if (!freshCreator) {
        return res.status(404).json({ error: "Creator not found after update" });
      }

      // Setup is complete when we have: fish audio model + message template
      const isSetupComplete = !!(
        freshCreator.fishAudioModelId && 
        freshCreator.messageTemplate
      );

      console.log(`🔍 Checking setup completion for company ${freshCreator.whopCompanyId}:`);
      console.log(`   - Has fishAudioModelId: ${!!freshCreator.fishAudioModelId} (${freshCreator.fishAudioModelId || 'MISSING'})`);
      console.log(`   - Has messageTemplate: ${!!freshCreator.messageTemplate} (length: ${freshCreator.messageTemplate?.length || 0})`);
      console.log(`   - messageTemplate: "${freshCreator.messageTemplate}"`);
      console.log(`   - isSetupComplete: ${isSetupComplete}`);

      // Update setup completion status
      const updated = await storage.updateCreator(creator._id, {
        isSetupComplete,
      });

      console.log(`✅ Settings saved. Setup complete: ${isSetupComplete}`);

      return res.json({ creator: updated });
    } catch (error) {
      console.error("Error saving settings:", error);
      return res.status(500).json({ error: "Failed to save settings" });
    }
  });

  // Toggle automation status (active/paused)
  app.post("/api/admin/toggle-automation", async (req, res) => {
    try {
      const userToken = req.headers["x-whop-user-token"] as string;
      if (!userToken) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { userId } = await whopSdk.verifyUserToken(userToken);
      const creator = await storage.getCreatorByWhopUserId(userId);

      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }

      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({ error: "isActive must be a boolean" });
      }

      const updated = await storage.updateCreator(creator._id, {
        isAutomationActive: isActive,
      });

      console.log(`✅ Automation ${isActive ? 'activated' : 'paused'} for creator ${creator._id}`);

      return res.json({ 
        success: true,
        isActive,
        message: `Audio message automation ${isActive ? 'activated' : 'paused'}`,
        creator: updated 
      });
    } catch (error) {
      console.error("Error toggling automation:", error);
      return res.status(500).json({ error: "Failed to toggle automation" });
    }
  });

  // Reset onboarding to allow creator to go through setup wizard again
  app.post("/api/admin/reset-onboarding", async (req, res) => {
    try {
      const userToken = req.headers["x-whop-user-token"] as string;
      if (!userToken) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { userId } = await whopSdk.verifyUserToken(userToken);
      const creator = await storage.getCreatorByWhopUserId(userId);

      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }

      // Reset setup completion status to false
      const updated = await storage.updateCreator(creator._id, {
        isSetupComplete: false,
      });

      console.log(`🔄 Onboarding reset for creator ${creator._id}`);

      return res.json({ 
        success: true,
        message: "Onboarding has been reset. You can now go through the setup wizard again.",
        creator: updated 
      });
    } catch (error) {
      console.error("Error resetting onboarding:", error);
      return res.status(500).json({ error: "Failed to reset onboarding" });
    }
  });

  // Upload audio file and create Fish Audio voice model
  app.post("/api/admin/upload-audio", uploadAudio.single('audio'), async (req, res) => {
    try {
      const userToken = req.headers["x-whop-user-token"] as string;
      if (!userToken) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No audio file uploaded" });
      }

      const { userId } = await whopSdk.verifyUserToken(userToken);
      const creator = await storage.getCreatorByWhopUserId(userId);

      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }

      console.log(`🎤 Uploading voice sample to Fish Audio...`);

      // Create Fish Audio voice model
      const model = await fishAudioSdk.createVoiceModel({
        title: `Voice model for ${creator.whopUserId}`,
        voiceFile: req.file.buffer,
        fileName: req.file.originalname,
        description: 'Voice model for personalized welcome messages',
      });

      console.log(`✅ Fish Audio model created: ${model._id} (state: ${model.state})`);

      // Store the uploaded audio file as base64 data URL (same approach as generated audio messages)
      console.log(`💾 Storing uploaded audio file as data URL...`);
      const base64Audio = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype || 'audio/mpeg';
      const audioDataUrl = `data:${mimeType};base64,${base64Audio}`;
      console.log(`✅ Audio file converted to data URL (${Math.round(base64Audio.length / 1024)}KB)`);

      // Update creator with Fish Audio model ID and audio file data URL
      await storage.updateCreator(creator._id, {
        fishAudioModelId: model._id,
        audioFileUrl: audioDataUrl,
      });

      // Re-fetch creator to ensure we have all fields populated correctly
      const updatedCreator = await storage.getCreator(creator._id);

      if (!updatedCreator) {
        return res.status(500).json({ error: "Failed to update creator" });
      }

      // Check if setup is complete
      const isSetupComplete = !!(updatedCreator.fishAudioModelId && updatedCreator.messageTemplate);
      
      console.log(`🔍 Checking setup completion after audio upload for company ${updatedCreator.whopCompanyId}:`);
      console.log(`   - Has fishAudioModelId: ${!!updatedCreator.fishAudioModelId} (${updatedCreator.fishAudioModelId || 'MISSING'})`);
      console.log(`   - Has messageTemplate: ${!!updatedCreator.messageTemplate} (length: ${updatedCreator.messageTemplate?.length || 0})`);
      console.log(`   - isSetupComplete: ${isSetupComplete}`);
      
      // Update setup completion status
      await storage.updateCreator(creator._id, { isSetupComplete });

      return res.json({ 
        success: true, 
        modelId: model._id,
        modelState: model.state,
        message: model.state === 'trained' 
          ? 'Voice model is ready!' 
          : 'Voice model is being trained. This usually takes a few minutes.',
        creator: updatedCreator
      });
    } catch (error) {
      console.error("Error uploading audio:", error);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to upload audio" 
      });
    }
  });

  // Serve voice sample audio file from data URL
  app.get("/api/admin/voice-sample", async (req, res) => {
    try {
      const userToken = req.headers["x-whop-user-token"] as string;
      if (!userToken) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { userId } = await whopSdk.verifyUserToken(userToken);
      const creator = await storage.getCreatorByWhopUserId(userId);

      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }

      if (!creator.audioFileUrl) {
        return res.status(404).json({ error: "No voice sample found" });
      }

      // Extract base64 data from data URL (format: data:audio/mpeg;base64,...)
      const base64Match = creator.audioFileUrl.match(/^data:(audio\/[^;]+);base64,(.+)$/);
      if (!base64Match) {
        return res.status(500).json({ error: "Invalid audio data format" });
      }

      const contentType = base64Match[1];
      const base64Data = base64Match[2];
      const audioBuffer = Buffer.from(base64Data, 'base64');

      // Set headers and send audio
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.send(audioBuffer);
    } catch (error) {
      console.error("Error serving voice sample:", error);
      return res.status(500).json({ error: "Failed to serve voice sample" });
    }
  });

  // Check Fish Audio model status
  app.get("/api/admin/fish-audio-model-status", async (req, res) => {
    try {
      const userToken = req.headers["x-whop-user-token"] as string;
      if (!userToken) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { userId } = await whopSdk.verifyUserToken(userToken);
      const creator = await storage.getCreatorByWhopUserId(userId);

      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }

      if (!creator.fishAudioModelId) {
        return res.json({ 
          hasModel: false,
          message: "No voice model found. Please upload a voice sample."
        });
      }

      const model = await fishAudioSdk.getModel(creator.fishAudioModelId);

      return res.json({
        hasModel: true,
        modelId: model._id,
        modelState: model.state,
        modelTitle: model.title,
        isReady: model.state === 'trained',
        message: model.state === 'trained' 
          ? 'Voice model is ready!' 
          : `Voice model is ${model.state}. Please wait...`
      });
    } catch (error) {
      console.error("Error checking Fish Audio model status:", error);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to check model status" 
      });
    }
  });

  // Trigger audio message generation for a customer
  app.post("/api/admin/trigger-audio", async (req, res) => {
    try {
      const userToken = req.headers["x-whop-user-token"] as string;
      if (!userToken) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { userId } = await whopSdk.verifyUserToken(userToken);
      const creator = await storage.getCreatorByWhopUserId(userId);

      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }

      const { customerId } = req.body;
      if (!customerId) {
        return res.status(400).json({ error: "customerId is required" });
      }

      const customer = await storage.getCustomer(customerId);
      if (!customer || customer.creatorId !== creator._id) {
        return res.status(404).json({ error: "Customer not found" });
      }

      // Generate personalized script
      const personalizedScript = replacePlaceholders(creator.messageTemplate, {
        name: customer.name,
        email: customer.email,
        username: customer.username,
        planName: customer.planName,
      });

      // Create audio message record
      const audioMessage = await storage.createAudioMessage({
        customerId: customer._id,
        creatorId: creator._id,
        personalizedScript,
        status: MESSAGE_STATUSES.GENERATING,
        playCount: 0,
        updatedAt: new Date(),
      });

      // Generate audio in background (sending is now handled inside generateWelcomeAudio)
      generateWelcomeAudio(customer, creator)
        .then(() => {
          console.log(`✅ Audio generated and sent to ${customer.name}`);
        })
        .catch(async (error) => {
          console.error("Error generating audio:", error);
          await storage.updateAudioMessage(audioMessage._id, {
            status: MESSAGE_STATUSES.FAILED,
            errorMessage: error instanceof Error ? error.message : 'Generation failed',
          });
        });

      return res.json({
        success: true,
        message: "Audio generation started! It will automatically be sent via DM when ready.",
        audioMessageId: audioMessage._id,
        script: personalizedScript,
      });
    } catch (error) {
      console.error("❌ Error triggering audio generation:", error);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to trigger audio generation" 
      });
    }
  });

  // Manually send or resend an audio message DM to a customer
  app.post("/api/admin/send-audio-dm", async (req, res) => {
    try {
      const userToken = req.headers["x-whop-user-token"] as string;
      if (!userToken) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { userId } = await whopSdk.verifyUserToken(userToken);
      const creator = await storage.getCreatorByWhopUserId(userId);

      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }

      const { audioMessageId } = req.body;
      if (!audioMessageId) {
        return res.status(400).json({ error: "audioMessageId is required" });
      }

      const audioMessage = await storage.getAudioMessage(audioMessageId);
      if (!audioMessage || audioMessage.creatorId !== creator._id) {
        return res.status(404).json({ error: "Audio message not found" });
      }

      if (!audioMessage.audioUrl) {
        return res.status(400).json({ error: "Audio URL not available" });
      }

      const customer = await storage.getCustomer(audioMessage.customerId);
      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      const messageContent = `Hi ${customer.name}! 🎵 I recorded a personal audio message for you.`;

      try {
        // Send message using app API key with company context
        console.log(`📨 Sending manual message for creator ${creator.whopUserId}`);
        console.log(`🏢 Using company context: ${creator.whopCompanyId}`);
        
        if (!creator.whopCompanyId) {
          throw new Error("Creator Company ID is required");
        }
        if (!customer.whopUserId) {
          throw new Error("Customer Whop User ID is required");
        }
        
        const { WhopServerSdk } = await import("@whop/api");
        const creatorSdk = WhopServerSdk({
          appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
          appApiKey: process.env.WHOP_API_KEY!,
          companyId: creator.whopCompanyId,
        });
        
        const messageId = await creatorSdk.messages.sendDirectMessageToUser({
          toUserIdOrUsername: customer.whopUserId,
          message: messageContent,
        });

        await storage.updateAudioMessage(audioMessage._id, {
          status: MESSAGE_STATUSES.SENT,
          whopMessageId: messageId,
          sentAt: new Date(),
          errorMessage: null,
        });

        await storage.updateCustomer(customer._id, {
          firstMessageSent: true,
        });

        return res.json({ success: true, message: "DM sent successfully" });
      } catch (error) {
        console.error("Manual DM send failed:", error);
        return res.status(500).json({ 
          error: error instanceof Error ? error.message : "Failed to send DM",
          details: "Check server logs for more information"
        });
      }
    } catch (error) {
      console.error("Error in manual DM send:", error);
      return res.status(500).json({ error: "Failed to send DM" });
    }
  });

  // Get list of customers with audio message status
  app.get("/api/admin/customers", async (req, res) => {
    try {
      const userToken = req.headers["x-whop-user-token"] as string;
      if (!userToken) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { userId } = await whopSdk.verifyUserToken(userToken);
      const creator = await storage.getCreatorByWhopUserId(userId);

      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }

      // MULTI-TENANT VALIDATION: Ensure creator has company ID
      if (!creator.whopCompanyId) {
        console.warn(`⚠️ Creator ${creator._id} has no company ID - multi-tenant isolation may be compromised`);
      } else {
        console.log(`📊 Fetching customers for creator ${creator._id} (company: ${creator.whopCompanyId})`);
      }

      const customers = await storage.getCustomersByCreator(creator._id);
      
      // Get audio message status for each customer
      const customersWithAudioMessages = await Promise.all(
        customers.map(async (customer) => {
          const audioMessages = await storage.getAudioMessagesByCustomer(customer._id);
          return {
            ...customer,
            audioMessages: audioMessages.map(a => ({
              id: a._id,
              status: a.status,
              audioUrl: a.audioUrl,
              createdAt: a.createdAt,
              sentAt: a.sentAt,
              playedAt: a.playedAt,
              whopMessageId: a.whopMessageId,
              errorMessage: a.errorMessage,
            })),
            latestAudioMessage: audioMessages.length > 0 ? audioMessages[audioMessages.length - 1] : null,
          };
        })
      );

      return res.json({ customers: customersWithAudioMessages });
    } catch (error) {
      console.error("Error fetching customers:", error);
      return res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  // Get all members from Whop API
  app.get("/api/admin/all-members", async (req, res) => {
    try {
      const userToken = req.headers["x-whop-user-token"] as string;
      if (!userToken) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { userId } = await whopSdk.verifyUserToken(userToken);
      const creator = await storage.getCreatorByWhopUserId(userId);

      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }

      if (!creator.whopCompanyId) {
        return res.status(400).json({ error: "Company ID not configured" });
      }

      try {
        let allMembers: any[] = [];
        let currentPage = 1;
        let totalPages = 1;

        console.log(`📊 Fetching all members for company: ${creator.whopCompanyId}`);
        
        while (currentPage <= totalPages) {
          const response = await fetch(`https://api.whop.com/v5/app/members?company_id=${creator.whopCompanyId}&page=${currentPage}&per=50`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Whop API Error for company ${creator.whopCompanyId}:`);
            console.error(`   Status: ${response.status} ${response.statusText}`);
            console.error(`   Body: ${errorText}`);
            throw new Error(`Whop API returned ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          
          if (data.data && Array.isArray(data.data)) {
            allMembers = allMembers.concat(data.data);
          }
          
          if (data.pagination) {
            totalPages = data.pagination.total_pages || 1;
          }
          
          currentPage++;
        }

        console.log(`✅ Fetched ${allMembers.length} members from Whop API`);
        
        return res.json({ 
          members: allMembers,
          total: allMembers.length
        });
      } catch (error) {
        console.error("⚠️ Error fetching members from Whop API:", error);
        return res.status(500).json({ 
          error: "Failed to fetch members from Whop API",
          details: error instanceof Error ? error.message : "Unknown error"
        });
      }
    } catch (error) {
      console.error("Error fetching all members:", error);
      return res.status(500).json({ error: "Failed to fetch all members" });
    }
  });

  // Get analytics data
  app.get("/api/admin/analytics", async (req, res) => {
    try {
      const userToken = req.headers["x-whop-user-token"] as string;
      if (!userToken) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { userId } = await whopSdk.verifyUserToken(userToken);
      const creator = await storage.getCreatorByWhopUserId(userId);

      if (!creator) {
        return res.status(404).json({ error: "Creator not found" });
      }

      // MULTI-TENANT VALIDATION: Ensure creator has company ID
      if (!creator.whopCompanyId) {
        console.warn(`⚠️ Creator ${creator._id} has no company ID - multi-tenant isolation may be compromised`);
        console.warn(`   Analytics will only show local database data, not live Whop API data`);
      }

      // Try to fetch total members from Whop API first, fallback to local storage
      let totalCustomers = 0;
      let usingWhopApi = false;
      
      if (creator.whopCompanyId) {
        try {
          let allMembers: any[] = [];
          let currentPage = 1;
          let totalPages = 1;

          // MULTI-TENANT FIX: Add company_id parameter to scope API call to specific company
          console.log(`📊 Fetching members for company: ${creator.whopCompanyId}`);
          
          while (currentPage <= totalPages) {
            const response = await fetch(`https://api.whop.com/v5/app/members?company_id=${creator.whopCompanyId}&page=${currentPage}&per=50`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${process.env.WHOP_API_KEY}`,
                'Content-Type': 'application/json',
              },
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.error(`❌ Whop API Error for company ${creator.whopCompanyId}:`);
              console.error(`   Status: ${response.status} ${response.statusText}`);
              console.error(`   Body: ${errorText}`);
              
              // Check for permission errors
              if (response.status === 403) {
                console.error(`   ⚠️  PERMISSION DENIED - The company ${creator.whopCompanyId} needs to approve member:basic:read permission`);
              }
              
              throw new Error(`Whop API returned ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.data && Array.isArray(data.data)) {
              allMembers = allMembers.concat(data.data);
            }
            
            if (data.pagination) {
              totalPages = data.pagination.total_pages || 1;
              totalCustomers = data.pagination.total_count || allMembers.length;
            }
            
            currentPage++;
          }

          if (totalCustomers === 0) {
            totalCustomers = allMembers.length;
          }

          usingWhopApi = true;
          console.log(`✅ Fetched ${totalCustomers} members from Whop API for company ${creator.whopCompanyId}`);
        } catch (error) {
          console.error("⚠️ Error fetching members from Whop API, falling back to local storage:", error);
          if (error instanceof Error) {
            console.error("Error details:", error.message);
          }
        }
      }

      // Fallback to local storage count if Whop API failed or no company ID
      if (!usingWhopApi) {
        const customers = await storage.getCustomersByCreator(creator._id);
        totalCustomers = customers.length;
        console.log(`📊 Using local storage count: ${totalCustomers} members`);
      }

      const audioMessages = await storage.getAudioMessagesByCreator(creator._id);

      // Calculate new members this week (last 7 days)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const customers = await storage.getCustomersByCreator(creator._id);
      const newMembersThisWeek = customers.filter(c => {
        const joinedDate = new Date(c.joinedAt);
        return joinedDate >= oneWeekAgo;
      }).length;

      const messagesSent = audioMessages.filter(a => 
        a.status === MESSAGE_STATUSES.SENT || 
        a.status === MESSAGE_STATUSES.DELIVERED || 
        a.status === MESSAGE_STATUSES.PLAYED
      ).length;
      
      const deliveryRate = audioMessages.length > 0 ? `${Math.round((messagesSent / audioMessages.length) * 100)}%` : "0%";

      const analytics = {
        totalCustomers,
        newMembersThisWeek,
        totalAudioMessages: audioMessages.length,
        messagesSent,
        messagesPlayed: audioMessages.filter(a => a.status === MESSAGE_STATUSES.PLAYED).length,
        messagesPending: audioMessages.filter(a => 
          a.status === MESSAGE_STATUSES.PENDING || 
          a.status === MESSAGE_STATUSES.GENERATING
        ).length,
        messagesFailed: audioMessages.filter(a => a.status === MESSAGE_STATUSES.FAILED).length,
        totalPlays: audioMessages.reduce((sum, a) => sum + a.playCount, 0),
        averagePlaysPerMessage: audioMessages.length > 0 ? audioMessages.reduce((sum, a) => sum + a.playCount, 0) / audioMessages.length : 0,
        deliveryRate,
        recentMessages: audioMessages.slice(-10).reverse(),
      };

      return res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      return res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // ============================================================================
  // PUBLIC AUDIO ENDPOINT
  // ============================================================================
  
  // Serve audio files from MongoDB storage
  app.get("/api/audio/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get audio message from database
      const audioMessage = await storage.getAudioMessage(id);
      
      if (!audioMessage) {
        return res.status(404).json({ error: "Audio not found" });
      }
      
      if (!audioMessage.audioUrl) {
        return res.status(404).json({ error: "Audio file not available" });
      }
      
      // Extract base64 data from data URL (format: data:audio/mp3;base64,...)
      const base64Match = audioMessage.audioUrl.match(/^data:audio\/mp3;base64,(.+)$/);
      if (!base64Match) {
        return res.status(500).json({ error: "Invalid audio data format" });
      }
      
      const base64Data = base64Match[1];
      const audioBuffer = Buffer.from(base64Data, 'base64');
      
      // Set proper headers for audio file
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length);
      res.setHeader('Content-Disposition', 'inline; filename="welcome-message.mp3"');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      res.setHeader('Access-Control-Allow-Origin', '*');
      
      return res.send(audioBuffer);
    } catch (error) {
      console.error("Error serving audio:", error);
      return res.status(500).json({ error: "Failed to serve audio" });
    }
  });

  // ============================================================================
  // WHOP WEBHOOKS
  // ============================================================================

  // Receive Whop webhooks for membership events
  app.post("/api/whop/webhook", async (req, res) => {
    try {
      console.log("📨 WHOP WEBHOOK RECEIVED");
      console.log("Headers:", JSON.stringify(req.headers, null, 2));
      console.log("Body:", JSON.stringify(req.body, null, 2));

      const { action, data } = req.body;

      if (action === "membership.went_valid") {
        console.log(`✅ New member joined: ${data.user?.username || data.user?.id}`);

        // Get member details from Whop
        const memberId = data.id;
        const userId = data.user?.id;
        const userName = data.user?.name || data.user?.username || "Member";
        const username = data.user?.username || null;

        if (!userId) {
          console.error("⚠️ No user ID in webhook payload");
          return res.json({ success: true, message: "Webhook received but no user ID" });
        }

        // Try to determine which creator/company this member belongs to
        // Get company ID from membership data
        const companyId = data.company_id || null;
        
        if (!companyId) {
          console.warn("⚠️ No company ID in webhook - cannot determine creator");
          return res.json({ success: true, message: "Webhook received but no company ID" });
        }

        console.log(`📦 Webhook for company: ${companyId}`);

        // Find creator for this company
        const creator = await storage.getCreatorByCompanyId(companyId);

        if (!creator) {
          console.log(`⚠️ No creator found for company ${companyId}`);
          return res.json({ success: true, message: "No creator found for this company" });
        }

        console.log(`✅ Found creator ${creator._id} for company ${companyId}`);

        // Check if automation is active
        if (!creator.isAutomationActive) {
          console.log(`⏸️ Automation is paused for creator ${creator._id}`);
          return res.json({ success: true, message: "Automation is paused" });
        }

        // Check if setup is complete
        if (!creator.isSetupComplete) {
          console.log(`⚠️ Setup not complete for creator ${creator._id}`);
          return res.json({ success: true, message: "Setup not complete" });
        }

        // Check if customer already exists
        let customer = await storage.getCustomerByWhopUserId(creator._id, userId);

        if (!customer) {
          // Create new customer record
          customer = await storage.createCustomer({
            creatorId: creator._id,
            whopUserId: userId,
            whopMemberId: memberId,
            whopCompanyId: companyId,
            name: userName,
            email: null,
            username: username,
            planName: data.plan?.name || null,
            joinedAt: new Date(),
            firstMessageSent: false,
            updatedAt: new Date(),
          });

          console.log(`✅ Created customer record for ${userName} (${userId})`);

          // Generate welcome audio message in background (DM sending is handled inside)
          const newCustomer = customer;
          generateWelcomeAudio(newCustomer, creator)
            .then(() => {
              console.log(`✅ Welcome audio generated and sent to ${newCustomer.name}`);
            })
            .catch((error) => {
              console.error("Error generating welcome audio:", error);
            });
        } else {
          console.log(`✅ Customer already exists: ${userName} (${userId})`);
        }
      }

      return res.json({ success: true });
    } catch (error) {
      console.error("Error processing Whop webhook:", error);
      return res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  // Test webhook endpoint
  app.get("/api/whop/webhook/test", async (req, res) => {
    return res.json({
      status: "ready",
      message: "Webhook endpoint is ready to receive events",
      endpoints: {
        webhook: "/api/whop/webhook"
      },
      expectedEvents: [
        "membership.went_valid"
      ],
      instructions: "Send a POST request to /api/whop/webhook with Whop webhook payload"
    });
  });

  // ============================================================================
  // CUSTOMER ENDPOINTS
  // ============================================================================

  // Get customer welcome status (and auto-generate audio on first visit)
  app.get("/api/customer/welcome-status", async (req, res) => {
    try {
      const userToken = req.headers["x-whop-user-token"] as string;
      if (!userToken) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { userId } = await whopSdk.verifyUserToken(userToken);

      // Get experienceId from query params to determine which company this is for
      const { experienceId } = req.query;

      // Fetch user details from Whop
      let userDetails;
      try {
        userDetails = await whopSdk.users.getUser({ userId });
      } catch (error) {
        console.error("Error fetching user details:", error);
      }

      const userName = userDetails?.name || userDetails?.username || "there";
      const username = userDetails?.username || "member";
      const email = (userDetails as any)?.email || null;

      // MULTI-TENANT FIX: Get company ID from experience to find correct creator
      let whopCompanyId: string | null = null;
      if (experienceId) {
        try {
          const experience = await whopSdk.experiences.getExperience({ experienceId: experienceId as string });
          whopCompanyId = experience.company?.id || null;
          console.log(`📦 Retrieved company ID for welcome status: ${whopCompanyId}`);
        } catch (error) {
          console.error("Error fetching company ID from experience:", error);
        }
      }

      // Search for customer record by Whop user ID
      // First try to find by company ID if we have it, otherwise search all creators
      let customer: Customer | undefined;
      let creator: Creator | undefined;
      
      if (whopCompanyId) {
        // MULTI-TENANT FIX: Find creator for THIS specific company
        creator = await storage.getCreatorByCompanyId(whopCompanyId);
        if (creator) {
          customer = await storage.getCustomerByWhopUserId(creator._id, userId);
          console.log(`🎯 Using creator for company ${whopCompanyId}: ${creator._id}`);
        }
      } else {
        // Fallback: search across all creators (legacy behavior)
        console.warn("⚠️ No experienceId provided - searching all creators (multi-tenant issue!)");
        const allCreators = await storage.getAllCreators();
        for (const c of allCreators) {
          customer = await storage.getCustomerByWhopUserId(c._id, userId);
          if (customer) {
            creator = c;
            break;
          }
        }
      }

      // AUTO-GENERATE AUDIO: If customer doesn't exist, create them and start audio generation
      if (!customer) {
        console.log(`🎵 NEW MEMBER VISIT: ${userName} (@${username}, ${userId}) - auto-generating welcome audio`);
        
        // MULTI-TENANT FIX: Use the creator for THIS company, not just any creator
        let setupCreator: Creator | undefined;
        
        if (whopCompanyId) {
          // Find creator for this specific company
          setupCreator = await storage.getCreatorByCompanyId(whopCompanyId);
          if (setupCreator && !setupCreator.isSetupComplete) {
            console.log(`⚠️ Creator for company ${whopCompanyId} exists but setup not complete`);
            console.log(`   - Has fishAudioModelId: ${!!setupCreator.fishAudioModelId} (${setupCreator.fishAudioModelId || 'MISSING'})`);
            console.log(`   - Has messageTemplate: ${!!setupCreator.messageTemplate} (length: ${setupCreator.messageTemplate?.length || 0})`);
            console.log(`   - messageTemplate value: "${setupCreator.messageTemplate}"`);
            setupCreator = undefined;
          }
        } else {
          // Fallback: find any creator with setup complete (legacy)
          console.warn("⚠️ No company ID - using any setup creator (multi-tenant issue!)");
          const allCreators = await storage.getAllCreators();
          setupCreator = allCreators.find(c => c.isSetupComplete);
        }
        
        if (!setupCreator) {
          console.log("⚠️ No creator with completed setup found for this company");
          return res.json({
            hasWelcomeMessage: false,
            messageStatus: null,
            message: "Welcome! Your admin is still setting up the welcome experience 🎵",
            userName: userName,
            userId: userId,
          });
        }

        // Create customer record
        customer = await storage.createCustomer({
          creatorId: setupCreator._id,
          whopUserId: userId,
          whopMemberId: `mem_${userId}`,
          whopCompanyId: setupCreator.whopCompanyId,
          name: userName,
          email: email,
          username: username,
          planName: null,
          joinedAt: new Date(),
          firstMessageSent: false,
          updatedAt: new Date(),
        });

        console.log(`✅ Created customer record for ${userName} under creator ${setupCreator._id}`);
        creator = setupCreator;

        // Check if automation is active before generating audio
        if (creator.isAutomationActive) {
          // Start audio generation in background (DM sending is handled inside)
          generateWelcomeAudio(customer, creator)
            .then(() => {
              console.log(`✅ Welcome audio generated and sent to ${customer!.name}`);
            })
            .catch(err => {
              console.error("Error generating welcome audio:", err);
            });

          return res.json({
            hasWelcomeMessage: false,
            messageStatus: "generating",
            message: "Your personal welcome message is being created... Check your DMs in a moment! 🎵",
            userName: userName,
            userId: userId,
          });
        } else {
          console.log(`⏸️ Automation is paused - no audio generated for ${customer.name}`);
          return res.json({
            hasWelcomeMessage: false,
            messageStatus: null,
            message: "Welcome! The admin has paused automatic welcome messages.",
            userName: userName,
            userId: userId,
          });
        }
      }

      // Get latest audio message for this customer
      const audioMessages = await storage.getAudioMessagesByCustomer(customer._id);
      const latestAudioMessage = audioMessages.length > 0 ? audioMessages[audioMessages.length - 1] : null;

      // AUTO-GENERATE AUDIO: If customer exists but has no audio message, generate one now
      if (!latestAudioMessage && creator && creator.isSetupComplete && creator.isAutomationActive) {
        console.log(`🎵 EXISTING MEMBER WITHOUT AUDIO: ${customer.name} - auto-generating welcome audio`);
        
        generateWelcomeAudio(customer, creator)
          .then(() => {
            console.log(`✅ Welcome audio generated and sent to ${customer!.name}`);
          })
          .catch(err => {
            console.error("Error generating welcome audio:", err);
          });

        return res.json({
          hasWelcomeMessage: false,
          messageStatus: "generating",
          message: "Your personal welcome message is being created... Check your DMs in a moment! 🎵",
          userName: userName,
          userId: userId,
        });
      }

      let message = "Check your DMs for a personal message 🎵";
      if (latestAudioMessage) {
        if (latestAudioMessage.status === MESSAGE_STATUSES.GENERATING || latestAudioMessage.status === MESSAGE_STATUSES.PENDING) {
          message = "Your personal welcome message is being created... Check back in a moment! 🎵";
        } else if (latestAudioMessage.status === MESSAGE_STATUSES.SENT || latestAudioMessage.status === MESSAGE_STATUSES.DELIVERED) {
          message = "We just sent you a personal audio message — check your DMs 🎵";
        } else if (latestAudioMessage.status === MESSAGE_STATUSES.FAILED) {
          message = "Welcome to our community! 👋";
        }
      }

      return res.json({
        hasWelcomeMessage: customer.firstMessageSent,
        messageStatus: latestAudioMessage?.status || null,
        audioUrl: latestAudioMessage?.audioUrl || null,
        message,
        userName: userName,
        userId: userId,
      });
    } catch (error) {
      console.error("Error fetching welcome status:", error);
      return res.status(500).json({ error: "Failed to fetch welcome status" });
    }
  });

  // Reset test audio message status (for testing purposes)
  app.post("/api/customer/reset-test-status", async (req, res) => {
    try {
      const userToken = req.headers["x-whop-user-token"] as string;
      if (!userToken) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { userId } = await whopSdk.verifyUserToken(userToken);

      // Get the first creator with setup complete
      const allCreators = await storage.getAllCreators();
      const creator = allCreators.find(c => c.isSetupComplete);

      if (!creator) {
        return res.status(400).json({ error: "No admin has completed setup yet." });
      }

      // Find customer
      const customer = await storage.getCustomerByWhopUserId(creator._id, userId);
      
      if (customer) {
        console.log(`🔄 Resetting test status for customer ${customer.name}`);
        await storage.updateCustomer(customer._id, {
          firstMessageSent: false,
        });

        // Mark any generating messages as failed
        const audioMessages = await storage.getAudioMessagesByCustomer(customer._id);
        for (const audioMessage of audioMessages) {
          if (audioMessage.status === MESSAGE_STATUSES.GENERATING) {
            await storage.updateAudioMessage(audioMessage._id, {
              status: MESSAGE_STATUSES.FAILED,
              errorMessage: 'Manually reset by user',
            });
          }
        }
      }

      return res.json({ success: true, message: "Test status reset successfully" });
    } catch (error) {
      console.error("Error resetting test status:", error);
      return res.status(500).json({ error: "Failed to reset test status" });
    }
  });

  // Trigger test audio message for current customer
  app.post("/api/customer/trigger-test-audio", async (req, res) => {
    try {
      const userToken = req.headers["x-whop-user-token"] as string;
      if (!userToken) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      console.log("🧪 TEST: Customer triggering test audio generation");

      const { userId } = await whopSdk.verifyUserToken(userToken);
      
      // Get user details
      const user = await whopSdk.users.getUser({ userId });
      const userName = user.name || user.username || "Member";
      const userEmail = (user as any).email || null;
      const username = user.username || null;

      console.log(`🧪 TEST: User ${userName} (${userId}) requesting test audio`);

      // Get the first creator (admin) with setup complete
      const allCreators = await storage.getAllCreators();
      const creator = allCreators.find(c => c.isSetupComplete);

      if (!creator) {
        return res.status(400).json({ 
          error: "No admin has completed setup yet. Please ask the admin to upload a voice sample and set a message template first." 
        });
      }

      console.log(`🧪 TEST: Using creator ${creator.whopUserId} for audio generation`);

      // Check if customer already exists
      let customer = await storage.getCustomerByWhopUserId(creator._id, userId);

      // Use creator's company ID (should be set during initialization)
      let companyId = creator.whopCompanyId;

      // Create customer record if doesn't exist
      if (!customer) {
        console.log(`🧪 TEST: Creating new customer record for ${userName}`);
        customer = await storage.createCustomer({
          creatorId: creator._id,
          whopUserId: userId,
          whopMemberId: `member_test_${Date.now()}`,
          whopCompanyId: companyId || null,
          name: userName,
          email: userEmail,
          username: username,
          planName: "Test Plan",
          joinedAt: new Date(),
          firstMessageSent: false,
          updatedAt: new Date(),
        });
      } else {
        console.log(`🧪 TEST: Found existing customer record for ${userName}`);
        // Update company ID if we found one and it's not set
        if (companyId && !customer.whopCompanyId) {
          await storage.updateCustomer(customer._id, { whopCompanyId: companyId });
          console.log(`🧪 TEST: Updated customer with company ID: ${companyId}`);
        }
      }

      // Generate personalized script
      const personalizedScript = replacePlaceholders(creator.messageTemplate, {
        name: customer.name,
        email: customer.email,
        username: customer.username,
        planName: customer.planName,
      });

      console.log(`🧪 TEST: Personalized script: ${personalizedScript}`);

      // Generate audio message and send DM (DM sending is handled inside)
      const { audioMessage, messageId } = await generateWelcomeAudio(customer, creator);

      console.log(`✅ Test audio generated and sent to ${customer.name}`);

      return res.json({
        success: true,
        message: "🎵 Your welcome audio message has been generated and sent to your DMs!",
        audioMessageId: audioMessage._id,
        messageId,
        script: personalizedScript,
      });
    } catch (error) {
      console.error("❌ Error triggering test audio:", error);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to trigger test audio" 
      });
    }
  });

  // Trigger test video (alias for test audio - customer-facing terminology)
  app.post("/api/customer/trigger-test-video", async (req, res) => {
    try {
      const userToken = req.headers["x-whop-user-token"] as string;
      if (!userToken) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      console.log("🧪 TEST: Customer triggering test video generation");

      const { userId } = await whopSdk.verifyUserToken(userToken);
      
      // Get user details
      const user = await whopSdk.users.getUser({ userId });
      const userName = user.name || user.username || "Member";
      const userEmail = (user as any).email || null;
      const username = user.username || null;

      console.log(`🧪 TEST: User ${userName} (${userId}) requesting test video`);

      // Get the first creator (admin) with setup complete
      const allCreators = await storage.getAllCreators();
      const creator = allCreators.find(c => c.isSetupComplete);

      if (!creator) {
        return res.status(400).json({ 
          error: "No admin has completed setup yet. Please ask the admin to upload a voice sample and set a message template first." 
        });
      }

      console.log(`🧪 TEST: Using creator ${creator.whopUserId} for video generation`);

      // Check if customer already exists
      let customer = await storage.getCustomerByWhopUserId(creator._id, userId);

      // Use creator's company ID (should be set during initialization)
      let companyId = creator.whopCompanyId;

      // Create customer record if doesn't exist
      if (!customer) {
        console.log(`🧪 TEST: Creating new customer record for ${userName}`);
        customer = await storage.createCustomer({
          creatorId: creator._id,
          whopUserId: userId,
          whopMemberId: `member_test_${Date.now()}`,
          whopCompanyId: companyId || null,
          name: userName,
          email: userEmail,
          username: username,
          planName: "Test Plan",
          joinedAt: new Date(),
          firstMessageSent: false,
          updatedAt: new Date(),
        });
      } else {
        console.log(`🧪 TEST: Found existing customer record for ${userName}`);
        // Update company ID if we found one and it's not set
        if (companyId && !customer.whopCompanyId) {
          await storage.updateCustomer(customer._id, { whopCompanyId: companyId });
          console.log(`🧪 TEST: Updated customer with company ID: ${companyId}`);
        }
      }

      // Generate personalized script
      const personalizedScript = replacePlaceholders(creator.messageTemplate, {
        name: customer.name,
        email: customer.email,
        username: customer.username,
        planName: customer.planName,
      });

      console.log(`🧪 TEST: Personalized script: ${personalizedScript}`);

      // Generate audio message and send DM
      // (generateWelcomeAudio now handles the entire process)
      const { audioMessage, messageId } = await generateWelcomeAudio(customer, creator);

      console.log(`✅ Test video generated and sent to ${customer.name}`);

      return res.json({
        success: true,
        message: "🎵 Your personalized welcome video has been sent! Check your Whop messages.",
        audioMessageId: audioMessage._id,
        messageId,
        script: personalizedScript,
      });
    } catch (error) {
      console.error("❌ Error triggering test video:", error);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to trigger test video" 
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
