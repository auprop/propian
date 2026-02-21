"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useCallback,
  useRef,
} from "react";
import { useEditor, EditorContent, ReactRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Mention from "@tiptap/extension-mention";
import { Extension } from "@tiptap/core";
import type { UserPreview } from "@propian/shared/types";
import { MentionList } from "./MentionList";
import type { MentionListRef } from "./MentionList";

/* ─── Types ─── */

export interface TiptapEditorRef {
  insertEmoji: (emoji: string) => void;
  focus: () => void;
  clear: () => void;
  isEmpty: () => boolean;
  getHTML: () => string;
  getText: () => string;
  getCharCount: () => number;
}

interface TiptapEditorProps {
  roomId: string;
  onSend: () => void;
  onUpdate: (json: unknown) => void;
  initialContent?: unknown;
  mentionSuggestions?: UserPreview[];
  disabled?: boolean;
  placeholder?: string;
  maxChars?: number;
}

/* ─── Custom Enter-to-Send Extension ─── */

const EnterToSend = Extension.create<{ onSend: () => void }>({
  name: "enterToSend",

  addOptions() {
    return { onSend: () => {} };
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        // Don't send if suggestion popup is active (mention extension handles it)
        // The mention plugin's onKeyDown runs first due to plugin priority
        this.options.onSend();
        return true;
      },
      "Shift-Enter": ({ editor }) => {
        editor.commands.setHardBreak();
        return true;
      },
    };
  },
});

/* ─── Component ─── */

export const TiptapEditor = forwardRef<TiptapEditorRef, TiptapEditorProps>(
  (
    {
      roomId,
      onSend,
      onUpdate,
      initialContent,
      mentionSuggestions = [],
      disabled = false,
      placeholder = "Type a message...",
      maxChars = 4000,
    },
    ref
  ) => {
    const onSendRef = useRef(onSend);
    onSendRef.current = onSend;

    const suggestionsRef = useRef(mentionSuggestions);
    suggestionsRef.current = mentionSuggestions;

    const editor = useEditor(
      {
        immediatelyRender: false,
        extensions: [
          StarterKit.configure({
            heading: false,
            horizontalRule: false,
            link: {
              autolink: true,
              openOnClick: true,
              HTMLAttributes: { class: "pt-editor-link" },
            },
          }),
          Placeholder.configure({ placeholder }),
          CharacterCount.configure({ limit: maxChars }),
          Mention.configure({
            HTMLAttributes: { class: "pt-editor-mention" },
            suggestion: {
              items: ({ query }: { query: string }) => {
                return suggestionsRef.current
                  .filter(
                    (u) =>
                      u.display_name
                        .toLowerCase()
                        .includes(query.toLowerCase()) ||
                      u.username.toLowerCase().includes(query.toLowerCase())
                  )
                  .slice(0, 8);
              },
              render: () => {
                let renderer: ReactRenderer<MentionListRef>;
                let container: HTMLDivElement;

                return {
                  onStart: (props) => {
                    container = document.createElement("div");
                    container.style.position = "absolute";
                    container.style.zIndex = "50";

                    // Position above the editor
                    const editorEl = props.editor.view.dom;
                    const editorRect = editorEl.getBoundingClientRect();
                    container.style.left = `${editorRect.left}px`;
                    container.style.bottom = `${window.innerHeight - editorRect.top + 4}px`;
                    container.style.position = "fixed";

                    document.body.appendChild(container);

                    renderer = new ReactRenderer(MentionList, {
                      props,
                      editor: props.editor,
                    });

                    container.appendChild(renderer.element);
                  },
                  onUpdate: (props) => {
                    renderer?.updateProps(props);
                  },
                  onKeyDown: (props) => {
                    if (props.event.key === "Escape") {
                      return true;
                    }
                    return renderer?.ref?.onKeyDown(props) ?? false;
                  },
                  onExit: () => {
                    renderer?.destroy();
                    container?.remove();
                  },
                };
              },
            },
          }),
          EnterToSend.configure({
            onSend: () => onSendRef.current(),
          }),
        ],
        content: initialContent || "",
        editable: !disabled,
        onUpdate: ({ editor: e }) => {
          onUpdate(e.getJSON());
        },
      },
      [roomId] // Recreate editor when room changes
    );

    // Restore content when room switches
    useEffect(() => {
      if (editor && initialContent) {
        // Only set if content differs (avoid loop)
        const currentJSON = JSON.stringify(editor.getJSON());
        const newJSON = JSON.stringify(initialContent);
        if (currentJSON !== newJSON) {
          editor.commands.setContent(initialContent as any);
        }
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editor, roomId]);

    // Auto-focus on room change
    useEffect(() => {
      if (editor) {
        requestAnimationFrame(() => {
          editor.commands.focus();
        });
      }
    }, [editor, roomId]);

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        insertEmoji: (emoji: string) => {
          editor?.commands.insertContent(emoji);
          editor?.commands.focus();
        },
        focus: () => {
          editor?.commands.focus();
        },
        clear: () => {
          editor?.commands.clearContent(true);
        },
        isEmpty: () => {
          return editor?.isEmpty ?? true;
        },
        getHTML: () => {
          return editor?.getHTML() ?? "";
        },
        getText: () => {
          return editor?.getText() ?? "";
        },
        getCharCount: () => {
          return editor?.storage.characterCount?.characters() ?? 0;
        },
      }),
      [editor]
    );

    return <EditorContent editor={editor} className="pt-chat-tiptap" />;
  }
);

TiptapEditor.displayName = "TiptapEditor";
