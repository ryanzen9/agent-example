import OpenAI from "openai";

export class OpenAICompatibleClient {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(params: { apiKey: string; model: string; baseURL?: string }) {
    this.model = params.model;

    this.client = new OpenAI({
      apiKey: params.apiKey,
      baseURL: params.baseURL,
    });
  }

  async generate(params: {
    systemPrompt: string;
    userPrompt: string;
  }): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: params.systemPrompt,
        },
        {
          role: "user",
          content: params.userPrompt,
        },
      ],
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("LLM 返回内容为空");
    }

    return content.trim();
  }
}
