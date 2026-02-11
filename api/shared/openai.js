const buildUrl = (endpoint, deployment, path, apiVersion) =>
  `${endpoint.replace(/\/$/, "")}/openai/deployments/${deployment}/${path}?api-version=${apiVersion}`;

const getConfig = () => {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-06-01";
  const imageApiVersion = process.env.AZURE_OPENAI_IMAGE_API_VERSION || apiVersion;

  if (!endpoint || !apiKey) {
    throw new Error("AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY are required.");
  }

  return { endpoint, apiKey, apiVersion, imageApiVersion };
};

const postJson = async (url, apiKey, payload) => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Azure OpenAI request failed.");
  }

  return response.json();
};

const chatCompletion = async ({ deployment, messages, temperature = 0.2, maxTokens = 1200 }) => {
  const { endpoint, apiKey, apiVersion } = getConfig();
  if (!deployment) {
    throw new Error("Azure OpenAI deployment is not configured.");
  }

  const url = buildUrl(endpoint, deployment, "chat/completions", apiVersion);
  const payload = {
    messages,
    temperature,
    max_tokens: maxTokens
  };

  const response = await postJson(url, apiKey, payload);
  const content = response?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Azure OpenAI response missing content.");
  }
  return content;
};

const imageGeneration = async ({ deployment, prompt, size = "1024x1024" }) => {
  const { endpoint, apiKey, imageApiVersion } = getConfig();
  if (!deployment) {
    throw new Error("Azure OpenAI image deployment is not configured.");
  }

  const url = buildUrl(endpoint, deployment, "images/generations", imageApiVersion);
  const payload = {
    prompt,
    size,
    n: 1
  };

  const response = await postJson(url, apiKey, payload);
  const item = response?.data?.[0];
  if (!item) {
    throw new Error("Azure OpenAI image response missing data.");
  }
  if (item.url) {
    return item.url;
  }
  if (item.b64_json) {
    return `data:image/png;base64,${item.b64_json}`;
  }
  throw new Error("Azure OpenAI image response missing image.");
};

module.exports = {
  chatCompletion,
  imageGeneration
};
