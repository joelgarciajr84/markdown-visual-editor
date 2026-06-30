import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import type { Extensions } from "@tiptap/core";
import { Callout } from "./extensions/callout";
import { Toggle } from "./extensions/toggle";
import { SlashCommand } from "./extensions/slash-command";

export function buildExtensions(): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      codeBlock: {
        HTMLAttributes: { class: "mve-code-block" },
      },
    }),

    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      HTMLAttributes: {
        rel: "noopener noreferrer nofollow",
        class: "mve-link",
      },
    }),

    Image.configure({
      inline: false,
      allowBase64: true,
      HTMLAttributes: { class: "mve-image" },
    }),

    Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === "heading") return "Título…";
        return "Escreva algo ou digite '/' para inserir um bloco…";
      },
      showOnlyWhenEditable: true,
      showOnlyCurrent: false,
    }),

    Callout,
    Toggle,
    SlashCommand,

    Markdown.configure({
      html: true,
      tightLists: true,
      bulletListMarker: "-",
      linkify: true,
      breaks: false,
      transformPastedText: true,
      transformCopiedText: true,
    }),
  ];
}
