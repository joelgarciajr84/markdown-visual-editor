import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ToggleView } from "../ToggleView";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    toggle: {
      insertToggle: (summary?: string) => ReturnType;
    };
  }
}

export const Toggle = Node.create({
  name: "toggle",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      summary: {
        default: "Toggle",
        parseHTML: (el) =>
          (el as HTMLElement).querySelector("summary")?.textContent?.trim() ||
          "Toggle",
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "details",
        getAttrs: (el) => ({
          summary:
            (el as HTMLElement)
              .querySelector("summary")
              ?.textContent?.trim() || "Toggle",
        }),
        contentElement: (el: HTMLElement) => {
          const body = el.querySelector(".mve-toggle-body");
          if (body) return body as HTMLElement;
          // Fallback: first non-summary child
          const fallback = Array.from(el.children).find(
            (c) => c.tagName !== "SUMMARY"
          );
          return (fallback as HTMLElement) ?? el;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const summary = (node.attrs.summary as string) || "Toggle";
    return [
      "details",
      mergeAttributes(HTMLAttributes, { class: "mve-toggle" }),
      ["summary", { class: "mve-toggle-summary" }, summary],
      ["div", { class: "mve-toggle-body" }, 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToggleView as any);
  },

  addCommands() {
    return {
      insertToggle:
        (summary = "Toggle") =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { summary },
            content: [{ type: "paragraph" }],
          });
        },
    };
  },
});
