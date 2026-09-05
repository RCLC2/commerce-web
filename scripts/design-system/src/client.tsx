import { hydrateRoot } from "react-dom/client";
import { Documentation, pages, type PageName } from "./app";

const root = document.getElementById("docs-root");
const page = document.documentElement.dataset.page;

if (root && page && Object.hasOwn(pages, page)) {
  hydrateRoot(root, <Documentation page={page as PageName} />);
}
