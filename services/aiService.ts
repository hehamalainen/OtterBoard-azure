
import { AnalysisResult, StrategicTheme, WhiteboardNote, StrategicActionPlan, AnalysisMode } from "../types";

export class AiService {
  private baseUrl: string = "/api";

  async analyzeWhiteboard(
    images: string[],
    mode: AnalysisMode,
    options: {
      useColorCoding: boolean;
      respectLayout: boolean;
      gapAnalysis: boolean
    }
  ): Promise<AnalysisResult> {
    const response = await fetch(`${this.baseUrl}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        images,
        mode,
        options
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Azure OpenAI request failed.");
    }

    return await response.json();
  }

  async reframeStrategy(themes: StrategicTheme[], framework: 'swot' | 'eisenhower' | 'roadmap' | 'bmc'): Promise<StrategicTheme[]> {
    const response = await fetch(`${this.baseUrl}/reframe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        themes,
        framework
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Failed to reframe strategy");
    }

    const data = await response.json();
    return data.themes;
  }

  async generateActionPlan(themes: StrategicTheme[], context: string = ""): Promise<StrategicActionPlan> {
    const response = await fetch(`${this.baseUrl}/action-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        themes,
        context
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Failed to generate action plan");
    }

    return await response.json();
  }

  async generateImage(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Image generation failed");
    }
    const data = await response.json();
    return data.imageUrl;
  }

  async generateVideo(prompt: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/generate-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Video generation failed");
    }
    const data = await response.json();
    return data.videoUrl;
  }

  private chatContext: AnalysisResult | null = null;

  async startChat(context: AnalysisResult) {
    this.chatContext = context;
  }

  async sendMessage(message: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        context: this.chatContext
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Chat response failed");
    }

    const data = await response.json();
    return data.text;
  }
}
