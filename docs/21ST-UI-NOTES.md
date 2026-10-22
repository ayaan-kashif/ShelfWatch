# 21st.dev connection and UI references

Updated: 2026-10-05.

## Connection status

- Registered the global Codex MCP server `21st` at `https://21st.dev/api/mcp`.
- Authentication references the Windows user environment variable `API_KEY_21ST`. The supplied key is stored in that user environment, outside this repository.
- Verified `codex mcp list`: `21st` is enabled with bearer-token authentication.
- Verified an authenticated MCP initialization returned HTTP 200 and server `21st` version `0.1.1`.
- Verified tool discovery and two successful catalog searches (`dashboard` and `3d card`).
- Native 21st MCP tools are now loaded in this chat; additional authenticated catalog searches succeeded during the build.
- An initial longer search timed out after 45 seconds. A concise dashboard search and a subsequent 3D card search both completed successfully.

Configuration follows the [official OpenAI MCP documentation](https://learn.chatgpt.com/docs/extend/mcp?surface=cli). No API key is embedded in application source, this document, or browser code.

## Public catalog references

The following results were retrieved through the authenticated 21st MCP `search` tool. They are metadata references; component source was not purchased or retrieved, and no copied component is claimed.

| Reference | Author / demo ID | Relevant pattern |
| --- | --- | --- |
| [App Dashboard Layout](https://21st.dev/@shadcnstore/components/app-1) | shadcnstore / 28770 | Collapsible sidebar, metric cards, area chart, progress bars, and activity feed. |
| [Dashboard Sidebar](https://21st.dev/@arunjdass/components/dashboard-sidebar) | arunjdass / 14941 | Charcoal and alabaster surfaces, responsive navigation, and clear workspace framing. |
| [Bento Dashboard](https://21st.dev/@daiwiikharihar/components/bento-dashboard) | daiwiikharihar / 9758 | Animated metric composition and an interactive dashboard grid. |
| [3D Card](https://21st.dev/@ravikatiyar162/components/3d-card) | ravikatiyar162 / 4182 | Hover-driven 3D card treatment. |
| [3d-card](https://21st.dev/@n38693842/components/3d-card) | n38693842 / 9040 | Dimensional card animation. |

## ShelfWatch application guidance

These are implementation decisions inferred from the catalog descriptions, not instructions supplied by 21st.dev:

- Use a persistent, restrained navigation shell with generous workspace spacing.
- Make product verification, evidence quality, and counterfeit monitoring the strongest visual hierarchy.
- Compose the overview from a few large dashboard modules instead of many equally weighted tiles.
- Use translucent surfaces and subtle layered shadows where they aid depth; keep dense tabular data opaque and legible.
- Reserve perspective and hover elevation for the scanning illustration and overview highlights. Avoid moving operational tables during interaction.
- Use short entrance transitions, clear button feedback, and a reduced-motion mode. Preserve keyboard access and touch usability when hover effects are unavailable.
- Implement original ShelfWatch components informed by these patterns. Retrieve licensed component code explicitly if a future phase requires adopting a catalog component.

## Future connection verification

Run `codex mcp list` and confirm `21st` appears with `API_KEY_21ST`, `enabled`, and `Bearer token`. Use `/mcp` in a fresh Codex session to inspect the loaded connection. Do not paste the key into source files or public install URLs.
