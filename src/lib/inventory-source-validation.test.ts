import { describe, expect, it } from "vitest";
import { inventorySourceValidationError, type InventorySourceCredentials } from "./inventory-source-validation";

const base: InventorySourceCredentials = {
  provider: "SHOPIFY",
  display_name: "기본 소스",
  shop_name: "shop",
  access_token: "access",
  webhook_secret: "webhook",
  refresh_token: "",
  client_id: "",
  client_secret: "",
};

describe("inventorySourceValidationError", () => {
  it("accepts complete Shopify credentials", () => {
    expect(inventorySourceValidationError(base)).toBeNull();
  });

  it("requires a Shopify webhook secret", () => {
    expect(inventorySourceValidationError({ ...base, webhook_secret: "" })).toContain("Webhook Secret");
  });

  it("requires Cafe24 refresh and client credentials", () => {
    expect(inventorySourceValidationError({
      ...base,
      provider: "CAFE24",
      webhook_secret: "",
    })).toContain("Refresh Token");
    expect(inventorySourceValidationError({
      ...base,
      provider: "CAFE24",
      webhook_secret: "",
      refresh_token: "refresh",
      client_id: "client",
      client_secret: "secret",
    })).toBeNull();
  });
});
