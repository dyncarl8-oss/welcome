const FISH_AUDIO_API_KEY = process.env.FISH_AUDIO_API_KEY;
const FISH_AUDIO_BASE_URL = "https://api.fish.audio";

if (!FISH_AUDIO_API_KEY) {
  console.warn("⚠️ FISH_AUDIO_API_KEY not set. Fish Audio features will not work.");
}

async function fishAudioRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<any> {
  const url = `${FISH_AUDIO_BASE_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    Authorization: `Bearer ${FISH_AUDIO_API_KEY}`,
    ...((options.headers as Record<string, string>) || {}),
  };

  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Fish Audio API Error: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`Fish Audio API request failed: ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }

  return await response.arrayBuffer();
}

export const fishAudioSdk = {
  async createVoiceModel(params: {
    title: string;
    voiceFile: Buffer;
    fileName: string;
    description?: string;
  }): Promise<{ _id: string; state: string }> {
    console.log("🐟 Creating Fish Audio voice model:", params.title);
    
    const formData = new FormData();
    formData.append('type', 'tts');
    formData.append('title', params.title);
    formData.append('train_mode', 'fast');
    formData.append('visibility', 'private');
    
    if (params.description) {
      formData.append('description', params.description);
    }

    const blob = new Blob([params.voiceFile], { type: 'audio/wav' });
    formData.append('voices', blob, params.fileName);

    const response = await fetch(`${FISH_AUDIO_BASE_URL}/model`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${FISH_AUDIO_API_KEY}`,
      },
      body: formData as any,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`🐟 Fish Audio model creation failed: ${response.status}`, errorText);
      throw new Error(`Fish Audio model creation failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log("🐟 Fish Audio model created:", result._id);
    return result;
  },

  async getModel(modelId: string): Promise<{ 
    _id: string; 
    state: 'created' | 'training' | 'trained' | 'failed';
    title: string;
  }> {
    console.log("🐟 Getting Fish Audio model:", modelId);
    const result = await fishAudioRequest(`/model/${modelId}`);
    return result;
  },

  async listModels(params?: {
    self?: boolean;
    page_size?: number;
    page_number?: number;
  }): Promise<{
    total: number;
    items: Array<{ _id: string; title: string; state: string }>;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.self !== undefined) queryParams.append('self', String(params.self));
    if (params?.page_size) queryParams.append('page_size', String(params.page_size));
    if (params?.page_number) queryParams.append('page_number', String(params.page_number));

    const endpoint = `/model${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const result = await fishAudioRequest(endpoint);
    return result;
  },

  async deleteModel(modelId: string): Promise<void> {
    console.log("🐟 Deleting Fish Audio model:", modelId);
    await fishAudioRequest(`/model/${modelId}`, {
      method: 'DELETE',
    });
    console.log("🐟 Fish Audio model deleted");
  },

  async generateSpeech(params: {
    text: string;
    referenceId: string;
    format?: 'wav' | 'mp3' | 'opus' | 'pcm';
  }): Promise<ArrayBuffer> {
    console.log("🐟 Generating speech with Fish Audio s1 model:", params.referenceId);
    console.log("🐟 Text:", params.text.substring(0, 100) + (params.text.length > 100 ? '...' : ''));

    const body = {
      text: params.text,
      reference_id: params.referenceId,
      format: params.format || 'mp3',
      normalize: true,
      latency: 'normal',
      prosody: {
        speed: 1.1,
        volume: 0,
      },
    };

    const audioBuffer = await fishAudioRequest('/v1/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'model': 's1',
      },
      body: JSON.stringify(body),
    });

    console.log("🐟 Speech generated successfully with s1 model");
    return audioBuffer;
  },
};
