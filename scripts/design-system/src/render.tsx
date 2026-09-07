import { renderToString } from "react-dom/server";
import { Documentation, pages, type PageName } from "./app";

export function renderPages() {
  return (Object.keys(pages) as PageName[]).map((page) => {
    const { filename, title } = pages[page];
    const content = renderToString(<Documentation page={page} />);
    return {
      filename,
      html: `<!doctype html>
<html lang="ko" data-page="${page}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Commerce 디자인 시스템">
  <title>${title}</title>
  <link rel="icon" href="data:,">
  <link rel="stylesheet" href="assets/tokens.css">
  <link rel="stylesheet" href="assets/docs.css">
  <script defer src="assets/docs.js"></script>
</head>
<body>
  <div id="docs-root">${content}</div>
</body>
</html>
`,
    };
  });
}
