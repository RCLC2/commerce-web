import { beforeEach, describe, expect, it } from "vitest";
import { useSessionStore } from "./session-store";

beforeEach(() => {
  window.localStorage.clear();
  useSessionStore.setState({
    accessToken: null,
    memberID: null,
    role: null,
    sellerContext: null,
    hydrated: false,
  });
});

describe("session hydration", () => {
  it("marks a guest session as resolved after local storage is checked", () => {
    useSessionStore.getState().hydrate();

    expect(useSessionStore.getState()).toMatchObject({
      accessToken: null,
      memberID: null,
      hydrated: true,
    });
  });

  it("restores the member before authenticated discovery queries are enabled", () => {
    window.localStorage.setItem("commerce.accessToken", "member-token");
    window.localStorage.setItem("commerce.memberID", "17");
    window.localStorage.setItem("commerce.role", "MEMBER");

    useSessionStore.getState().hydrate();

    expect(useSessionStore.getState()).toMatchObject({
      accessToken: "member-token",
      memberID: 17,
      role: "MEMBER",
      hydrated: true,
    });
  });
});
