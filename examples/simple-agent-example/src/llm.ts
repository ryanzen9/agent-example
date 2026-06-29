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
    memoryPrompt?: string[];
  }): Promise<string> {
    const memoryPrompt = params.memoryPrompt?.length
      ? `用户可用的记忆：${params.memoryPrompt.join("\n")}`
      : "用户可用的记忆为空\n";

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: params.systemPrompt,
        },

        {
          role: "system",
          content: `memoryPrompt: ${memoryPrompt}`,
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
      console.log(`LLM 返回内容为空, response: ${JSON.stringify(response)}`);

      const errorMessage = `返回的 LLM 内容为空， 请检查 Content 输出是否为空，或者检查 LLM 输出是否符合预期。`;

      const reResponse = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: params.systemPrompt.concat("\n", memoryPrompt),
          },
          {
            role: "system",
            content: errorMessage,
          },
          {
            role: "user",
            content: params.userPrompt,
          },
        ],
        temperature: 0.2,
      });

      const reContent = reResponse.choices[0]?.message?.content?.trim();
      if (reContent) {
        return reContent;
      }
      throw new Error(
        `LLM 返回内容为空， 请检查 Content 输出是否为空，或者检查 LLM 输出是否符合预期。`,
      );
    }

    return content.trim();
  }
}
