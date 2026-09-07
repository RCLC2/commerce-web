import { DocsShell } from "./components/docs-shell";
import Overview from "./pages/overview";
import Foundations from "./pages/foundations";
import Components from "./pages/components";
import Commerce from "./pages/commerce";
import Seller from "./pages/seller";
import Admin from "./pages/admin";
import Patterns from "./pages/patterns";

export const pages = {
  overview: { filename: "index.html", title: "Commerce UI", component: Overview },
  foundations: { filename: "foundations.html", title: "Foundations | Commerce UI", component: Foundations },
  components: { filename: "components.html", title: "Components | Commerce UI", component: Components },
  commerce: { filename: "commerce.html", title: "Commerce | Commerce UI", component: Commerce },
  seller: { filename: "seller.html", title: "Seller | Commerce UI", component: Seller },
  admin: { filename: "admin.html", title: "Admin | Commerce UI", component: Admin },
  patterns: { filename: "patterns.html", title: "Patterns | Commerce UI", component: Patterns },
} as const;

export type PageName = keyof typeof pages;

export function Documentation({ page }: { page: PageName }) {
  const Page = pages[page].component;
  return <DocsShell page={page}><Page /></DocsShell>;
}
