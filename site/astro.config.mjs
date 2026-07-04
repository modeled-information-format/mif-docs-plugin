import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightLlmsTxt from "starlight-llms-txt";
import astroMermaid from "astro-mermaid";

// mif-docs plugin documentation site — Astro + Starlight, modeled on the org's
// doc-site (same versions, same llms.txt + Mermaid + mif-brand wiring). Deployed
// to project Pages at /mif-docs-plugin; the repo docs/ tree (the suite's own
// MIF-validated self-documentation) is sourced via the src/content/docs symlink.
export default defineConfig({
  site: "https://modeled-information-format.github.io",
  base: "/mif-docs-plugin",
  // The docs/ tree is symlinked into src/content/docs. Without preserveSymlinks,
  // Vite resolves an MDX file (e.g. the splash index.mdx) to its real repo-root
  // path, where bare imports like `@astrojs/starlight/components` can't resolve
  // (no node_modules there). Keeping the symlinked path lets resolution walk up
  // to site/node_modules.
  vite: { resolve: { preserveSymlinks: true } },
  integrations: [
    astroMermaid(),
    starlight({
      plugins: [starlightLlmsTxt()],
      title: "mif-docs",
      customCss: ["./src/styles/mif-brand.css"],
      logo: {
        light: "./src/assets/logo-light.svg",
        dark: "./src/assets/logo-dark.svg",
        replacesTitle: true,
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/modeled-information-format/mif-docs-plugin",
        },
      ],
      sidebar: [
        { label: "Tutorials", items: [{ autogenerate: { directory: "tutorials" } }] },
        { label: "How-to guides", items: [{ autogenerate: { directory: "how-to" } }] },
        { label: "Reference", items: [{ autogenerate: { directory: "reference" } }] },
        { label: "Explanation", items: [{ autogenerate: { directory: "explanation" } }] },
        { label: "Architecture", items: [{ autogenerate: { directory: "architecture" } }] },
        { label: "Decisions (ADRs)", items: [{ autogenerate: { directory: "adr" } }] },
        { label: "Runbooks", items: [{ autogenerate: { directory: "runbooks" } }] },
        {
          label: "MIF ecosystem",
          items: [
            { label: "MIF home", link: "https://modeled-information-format.github.io/" },
            { label: "Ecosystem docs", link: "https://modeled-information-format.github.io/docs/" },
            { label: "Research harness", link: "https://modeled-information-format.github.io/research-harness-template/" },
            { label: "Ontology corpus", link: "https://modeled-information-format.github.io/ontologies/" },
            { label: "Plugin marketplace", link: "https://modeled-information-format.github.io/claude-code-plugins/" },
            { label: "mif-rs", link: "https://modeled-information-format.github.io/mif-rs/" },
            { label: "Structured MADR", link: "https://smadr.dev" },
            { label: "Specification (mif-spec.dev)", link: "https://mif-spec.dev" },
          ],
        },
      ],
    }),
  ],
});
