import { tavily } from "@tavily/core";
import dotenv from "dotenv";
import z from "zod";
import { readMemory, writeMemory } from "./memory";

dotenv.config();

const WeatherApiResponseSchema = z.object({
  current_condition: z.array(
    z.object({
      temp_C: z.string(),
      weatherDesc: z.array(
        z.object({
          value: z.string(),
        }),
      ),
    }),
  ),
});

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

// 查询天气 Tool
const get_weather = async (city: string): Promise<string> => {
  if (!city) {
    return "错误: get_weather 缺少 city 参数。";
  }

  const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "hello-agent-bun/1.0",
      },
    });

    if (!response.ok) {
      return `错误: 查询天气失败，HTTP 状态码 ${response.status}`;
    }

    const json = await response.json();
    const parsed = WeatherApiResponseSchema.safeParse(json);

    if (!parsed.success) {
      return `错误: 天气接口返回格式异常，无法解析 ${city} 的天气。`;
    }

    const current = parsed.data.current_condition[0];

    if (!current) {
      return `错误: 未找到 ${city} 的实时天气数据。`;
    }

    const weatherDesc = current.weatherDesc[0]?.value ?? "未知天气";
    const tempC = current.temp_C;

    return `${city}当前天气: ${weatherDesc}，气温 ${tempC} 摄氏度。`;
  } catch (error) {
    return `错误: 查询天气时发生异常: ${formatError(error)}`;
  }
};

// 给出旅行建议 Tool
const get_attraction = async (
  city: string,
  weather: string,
  memory: string,
): Promise<string> => {
  if (!city || !weather) {
    return "错误: get_attraction 缺少 city 或 weather 参数。";
  }

  const travilyClient = tavily({
    apiKey: process.env.TRAVILY_API_KEY || "",
  });

  console.log(
    `正在查询 ${city} 的旅游景点，天气: ${weather}，补充信息: ${memory}`,
  );

  const query = `请根据城市 ${city} 和天气 ${weather} 和补充信息 ${memory}，推荐适合的旅游景点。并且给出推荐理由。`;

  try {
    const response = await travilyClient.search(query, {
      searchDepth: "basic",
      include_answer: true,
    });

    if (!response || !response.results || response.results.length === 0) {
      return `错误: 未能获取 ${city} 的旅游景点推荐。`;
    }

    // 获取总结性回答
    const answer = response.answer;
    if (answer) {
      return answer;
    }

    const result: string = response.results
      .map((item, index) => {
        return `${index + 1}. ${item.title}\n   ${item.content}`;
      })
      .join("\n\n");

    return result;
  } catch (error) {
    return `错误: 查询旅游景点时发生异常: ${formatError(error)}`;
  }
};

// 写入记忆 Tool
export const write_to_memory = (key: string, value: string): string => {
  return writeMemory(key, value);
};

// 读取记忆 Tool
export const read_from_memory = (key: string): string => {
  if (!key) {
    return "错误: read_from_memory 缺少 key 参数。";
  }

  try {
    const value = readMemory(key);
    if (value.startsWith("错误")) {
      return value;
    }
    return `从记忆中读取到的信息: ${key} = ${value}`;
  } catch (error) {
    return `错误: 读取记忆时发生异常: ${formatError(error)}`;
  }
};

export function isToolName(name: string): name is keyof typeof tools {
  return name in tools;
}

export const tools = {
  get_weather: get_weather,
  get_attraction: get_attraction,
  write_to_memory: write_to_memory,
  read_from_memory: read_from_memory,
};
