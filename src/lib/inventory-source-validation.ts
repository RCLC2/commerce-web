export type InventorySourceCredentials = {
  provider: string;
  display_name: string;
  shop_name: string;
  access_token: string;
  webhook_secret: string;
  refresh_token: string;
  client_id: string;
  client_secret: string;
};

export function inventorySourceValidationError(
  credentials: InventorySourceCredentials,
): string | null {
  if (!credentials.display_name.trim() || !credentials.shop_name.trim() || !credentials.access_token.trim()) {
    return "표시 이름, Shop/Mall, Access Token을 입력해 주세요.";
  }
  if (credentials.provider === "SHOPIFY") {
    return credentials.webhook_secret.trim() ? null : "Shopify는 Webhook Secret이 필요합니다.";
  }
  if (credentials.provider === "CAFE24") {
    return credentials.refresh_token.trim() && credentials.client_id.trim() && credentials.client_secret.trim()
      ? null
      : "Cafe24는 Refresh Token, Client ID, Client Secret이 필요합니다.";
  }
  return "지원하지 않는 재고 provider입니다.";
}
