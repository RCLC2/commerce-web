const LOCAL_API_BASE_URL = "http://localhost:8080";

export function getApiBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const baseUrl = configuredUrl || LOCAL_API_BASE_URL;
  const withProtocol = /^https?:\/\//i.test(baseUrl) ? baseUrl : `http://${baseUrl}`;

  return withProtocol.replace(/\/+$/, "");
}
