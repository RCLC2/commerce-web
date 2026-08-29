import { adminApi } from "./api/admin";
import { authApi } from "./api/auth";
import { advertisingApi } from "./api/advertising";
import { catalogApi } from "./api/catalog";
import { customerApi } from "./api/customer";
import { eventDetailApi } from "./api/event-detail";
import { mediaApi } from "./api/media";
import { searchApi } from "./api/search";
import { sellerApi } from "./api/seller";
import { experimentApi } from "./api/experiment";
import { onboardingApi } from "./api/onboarding";

export const api = {
  ...catalogApi,
  ...eventDetailApi,
  ...searchApi,
  ...authApi,
  ...customerApi,
  ...mediaApi,
  ...advertisingApi,
  ...sellerApi,
  ...adminApi,
  ...experimentApi,
  ...onboardingApi,
};
