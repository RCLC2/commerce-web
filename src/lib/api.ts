import { adminApi } from "./api/admin";
import { authApi } from "./api/auth";
import { catalogApi } from "./api/catalog";
import { customerApi } from "./api/customer";
import { eventDetailApi } from "./api/event-detail";
import { mediaApi } from "./api/media";
import { searchApi } from "./api/search";
import { sellerApi } from "./api/seller";
import { experimentApi } from "./api/experiment";

export const api = {
  ...catalogApi,
  ...eventDetailApi,
  ...searchApi,
  ...authApi,
  ...customerApi,
  ...mediaApi,
  ...sellerApi,
  ...adminApi,
  ...experimentApi,
};
