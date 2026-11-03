import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { UNIVERSITY_NAME } from "./src/config.js";

// Injects UNIVERSITY_NAME from src/config.js into index.html (title + meta description),
// so the university name is only ever edited in one place.
const universityInHtml = {
  name: "university-name-in-html",
  transformIndexHtml: {
    order: "pre",
    handler: (html) => html.replaceAll("__UNIVERSITY_NAME__", UNIVERSITY_NAME),
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss(), universityInHtml],
});
