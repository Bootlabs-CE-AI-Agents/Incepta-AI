'use client';

/**
 * CodeMirror Wrapper Component
 * 
 * Wraps CodeMirror 6 with custom extensions for:
 * - Variable placeholder highlighting ({{variable_name}})
 * - Token counting
 * - Dark theme
 * 
 * Story 0.4.3: System Prompt Editor Part 2 - CodeMirror integration
 */

import React, { useEffect, useRef, useState } from 'react';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState, Extension } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { Decoration, DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
}

/**
 * Custom plugin to highlight variable placeholders {{variable_name}}
 */
const variableHighlighter = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view);
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>();
      const text = view.state.doc.toString();
      
      // Regular expression to match {{variable_name}}
      const regex = /{{([a-zA-Z_][a-zA-Z0-9_]*)}}/g;
      let match;

      while ((match = regex.exec(text)) !== null) {
        const from = match.index;
        const to = match.index + match[0].length;
        
        builder.add(
          from,
          to,
          Decoration.mark({
            class: 'cm-variable-placeholder',
            attributes: {
              style: 'color: #61afef; font-weight: 600; background-color: rgba(97, 175, 239, 0.1); border-radius: 3px; padding: 0 2px;',
            },
          })
        );
      }

      return builder.finish();
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

/**
 * CodeMirror Editor Component
 */
export function CodeMirrorEditor({
  value,
  onChange,
  placeholder = '',
  readOnly = false,
  className = '',
}: CodeMirrorEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setIsMounted(true);

    if (!editorRef.current) return;

    // Create extensions
    const extensions: Extension[] = [
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      markdown(),
      oneDark,
      variableHighlighter,
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newValue = update.state.doc.toString();
          onChange(newValue);
        }
      }),
    ];

    if (readOnly) {
      extensions.push(EditorState.readOnly.of(true));
    }

    if (placeholder) {
      extensions.push(
        EditorView.theme({
          '.cm-content': {
            minHeight: '200px',
          },
        })
      );
    }

    // Create editor state
    const state = EditorState.create({
      doc: value,
      extensions,
    });

    // Create editor view
    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    // Cleanup
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [isMounted]);

  // Update editor when value changes externally
  useEffect(() => {
    if (!viewRef.current) return;
    
    const currentValue = viewRef.current.state.doc.toString();
    if (currentValue !== value) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: currentValue.length,
          insert: value,
        },
      });
    }
  }, [value]);

  if (!isMounted) {
    // Server-side rendering fallback
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full min-h-[200px] p-4 bg-gray-900 text-gray-100 font-mono text-sm rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary ${className}`}
      />
    );
  }

  return (
    <div
      ref={editorRef}
      className={`codemirror-wrapper ${className}`}
      style={{
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    />
  );
}
