import { Node, mergeAttributes } from "@tiptap/core";

export type CalloutVariant = "info" | "tip" | "warning" | "danger";

export const CALLOUT_META: Record<
  CalloutVariant,
  { icon: string; label: string }
> = {
  info: { icon: "ℹ️", label: "Note" },
  tip: { icon: "💡", label: "Tip" },
  warning: { icon: "⚠️", label: "Warning" },
  danger: { icon: "🔴", label: "Danger" },
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      insertCallout: (type?: CalloutVariant) => ReturnType;
    };
  }
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      type: {
        default: "info" as CalloutVariant,
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute("data-callout") || "info",
        renderHTML: ({ type }) => ({
          "data-callout": type as string,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const type = (node.attrs.type as CalloutVariant) || "info";
    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: `callout callout-${type}` }),
      0,
    ];
  },

  addCommands() {
    return {
      insertCallout:
        (type: CalloutVariant = "info") =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { type },
            content: [{ type: "paragraph" }],
          });
        },
    };
  },
});
