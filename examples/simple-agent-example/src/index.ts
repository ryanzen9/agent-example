import dotenv from "dotenv";
import { OpenAICompatibleClient } from "./llm";
import { getMemoryPrompt } from "./memory";
import {
  normalizeLLMOutput,
  parseAction,
  parseFinish,
  parseToolCall,
} from "./parse";
import { AGENT_SYSTEM_PROMPT } from "./prompt";
import { isToolName, tools } from "./tools";

dotenv.config();

const baseURL = process.env.OPENAI_API_BASE_URL || "https://api.openai.com/v1";
const apiKey = process.env.OPENAI_API_KEY || "";
const model = process.env.OPENAI_API_MODEL || "deepseek-v4-flash";

// 初始化 Client
const openaiClient = new OpenAICompatibleClient({
  apiKey,
  baseURL,
  model,
});

const userPrompt =
  "你好，请帮我查询一下今天北京的天气，然后根据天气推荐一个合适的旅游景点。";

async function main(client: OpenAICompatibleClient, userPrompt: string) {
  console.log("用户输入的 Prompt:", userPrompt);

  const promptHistory = [userPrompt];

  while (true) {
    const memoryPrompt = getMemoryPrompt();
    // 进行循环思考
    for (let i = 0; i < 10; i++) {
      const currentPrompt = promptHistory.join("\n");

      console.log(`\n=== 第 ${i + 1} 次循环思考 ===`);

      const result = await client.generate({
        userPrompt: currentPrompt,
        systemPrompt: AGENT_SYSTEM_PROMPT,
        memoryPrompt,
      });

      const llmOutput = normalizeLLMOutput(result);

      console.log("LLM 输出结果: ", llmOutput);

      promptHistory.push(llmOutput);

      const action = parseAction(llmOutput);
      if (!action) {
        const observation =
          "错误: 未解析到 Action。请严格输出 Thought 和 Action。";

        console.log(`Observation: ${observation}`);
        console.log("");

        promptHistory.push(`Observation: ${observation}`);
        continue;
      }

      const finalAnswer = parseFinish(action);
      if (finalAnswer) {
        console.log(`\n=== 任务完成 ===`);
        console.log(`最终答案: ${finalAnswer}`);
        break;
      }

      const toolCall = parseToolCall(action);
      if (!toolCall) {
        const observation = `错误: 无法解析工具调用: ${action}`;

        console.log(`Observation: ${observation}`);
        console.log("");

        promptHistory.push(`Observation: ${observation}`);
        continue;
      }

      const toolName = toolCall.toolName;
      if (!isToolName(toolName)) {
        const observation = `错误: 未知工具: ${toolName}`;
        console.log(`Observation: ${observation}`);
        promptHistory.push(`Observation: ${observation}`);
        continue;
      }

      const tool = tools[toolName] as (...args: any[]) => Promise<string>;
      const argsArr = Object.values(toolCall.args);
      const observation = await tool(...argsArr);

      console.log(`Observation: ${observation}`);
      console.log("=".repeat(80));

      promptHistory.push(`Observation: ${observation}`);
    }

    // 获取用户输入
    const userInput = await new Promise<string>((resolve) => {
      process.stdout.write("\n是否同意结果（y/n/q）：");
      process.stdin.once("data", (data) => {
        resolve(data.toString().trim());
      });
    });

    if (userInput.toLowerCase() === "q") {
      console.log("退出程序。");
      process.exit(0);
    } else if (userInput.toLowerCase() === "y") {
      console.log("用户同意结果，程序结束。");
      process.exit(0);
    } else if (userInput.toLowerCase() === "n") {
      console.log("用户不同意结果，继续循环思考。");
      const userDesc = await new Promise<string>((resolve) => {
        process.stdout.write("请描述用户不同意的原因：");
        process.stdin.once("data", (data) => {
          resolve(data.toString().trim());
        });
      });
      promptHistory.push(`用户不同意结果的原因: ${userDesc}`);
      promptHistory.push(
        `用户不同意结果[UserInput: ${userDesc}]，请将信息写入记忆后重新执行。`,
      );
    } else {
      console.log("无效输入，请输入 y、n 或 q。");
    }
  }
}

main(openaiClient, userPrompt);
