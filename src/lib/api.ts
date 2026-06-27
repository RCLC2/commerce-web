import { adminApi } from "./api/admin";
import { authApi } from "./api/auth";
import { catalogApi } from "./api/catalog";
import { customerApi } from "./api/customer";
import { mediaApi } from "./api/media";
import { searchApi } from "./api/search";
import { sellerApi } from "./api/seller";

export const api = {
  ...catalogApi,
  ...searchApi,
  ...authApi,
  ...customerApi,
  ...mediaApi,
  ...sellerApi,
  ...adminApi,
};
