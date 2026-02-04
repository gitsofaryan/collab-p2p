"use client";

import React, { useEffect, useRef, useState } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import { Libp2pProvider } from "@/lib/p2p/provider";

interface RealtimeEditorProps {
    doc: Y.Doc;
    provider: Libp2pProvider | null;
}

export function RealtimeEditor({ doc, provider }: RealtimeEditorProps) {
    const [editor, setEditor] = useState<any | null>(null);
    const monacoRef = useRef<any | null>(null);
    const bindingRef = useRef<MonacoBinding | null>(null);

    const handleEditorDidMount: OnMount = (editor, monaco) => {
        setEditor(editor);
        monacoRef.current = monaco;
    };

    useEffect(() => {
        if (!editor || !doc || !provider) return;

        // Define the Yjs text type
        const yText = doc.getText("monaco");

        // Bind Yjs to Monaco
        // Note: y-monaco types might be missing, so we suppress if needed or use any
        try {
            if (bindingRef.current) {
                bindingRef.current.destroy();
            }

            const binding = new MonacoBinding(
                yText,
                editor.getModel()!,
                new Set([editor]),
                provider.awareness // Pass awareness for cursors
            );

            bindingRef.current = binding;

            // Set Local Awareness (User Info)
            const awareness = provider.awareness;
            if (awareness) {
                const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16);
                const user = {
                    name: `User-${Math.floor(Math.random() * 1000)}`,
                    color: randomColor,
                    colorLight: randomColor
                };
                awareness.setLocalStateField('user', user);
            }

        } catch (err) {
            console.error("Failed to create Monaco Binding:", err);
        }

        return () => {
            if (bindingRef.current) {
                bindingRef.current.destroy();
                bindingRef.current = null;
            }
        };
    }, [editor, doc, provider]);

    return (
        <div className="h-full w-full rounded-md overflow-hidden border border-gray-700 bg-[#1e1e1e]">
            <Editor
                height="100%"
                defaultLanguage="typescript"
                defaultValue="// Loading distributed document..."
                theme="vs-dark"
                onMount={handleEditorDidMount}
                options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    wordWrap: "on",
                    automaticLayout: true,
                    padding: { top: 16 }
                }}
            />
        </div>
    );
}
