import React, { useEffect, useRef, useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import debounce from "lodash.debounce";
import ACTIONS from "../Actions";
import toast from "react-hot-toast";

const MonacoEditor = ({ socketRef, roomId, onCodeChange }) => {
    const editorRef = useRef(null);
    // Flag to indicate that we're applying remote changes.
    const fileInputRef = useRef(null);
    const updatingFromRemote = useRef(false);
    const [language, setLanguage] = useState("javascript");
    const [filename, setFilename] = useState("code");


    const languageExtensions = {
        javascript: "js",
        c: "c",
        cpp: "cpp",
        java: "java",
        python: "py",
        go: "go",
    };

    // When the editor mounts, store a reference.
    const handleEditorDidMount = (editor, monaco) => {
        editorRef.current = editor;
    };

    // Debounced function to emit local changes.
    const emitChange = useCallback(
        debounce((value) => {
            if (socketRef.current) {
                console.log("Emitting change:", value);
                socketRef.current.emit(ACTIONS.CODE_CHANGE, { roomId, code: value });
            }
        }, 50),
        [socketRef, roomId]
    );

    // Handler for local editor changes.
    const handleEditorChange = (value, event) => {
        // If we're applying a remote update, do not emit a change.
        if (updatingFromRemote.current) return;

        // Emit the change after debouncing.
        emitChange(value);
        onCodeChange(value);
    };

    // Set up socket listener to receive changes.
    useEffect(() => {
        if (!socketRef.current) return;
        const socket = socketRef.current;

        const handleRemoteChange = ({ code }) => {
            console.log("Received remote change:", code); // Debugging log
            if (editorRef.current) {
                const currentCode = editorRef.current.getValue();
                if (code !== currentCode) {
                    updatingFromRemote.current = true;
                    const currentPosition = editorRef.current.getPosition();
                    editorRef.current.setValue(code);
                    if (currentPosition) {
                        editorRef.current.setPosition(currentPosition);
                    }
                    updatingFromRemote.current = false;
                }
            }
        };

        const handleRemoteLanguageChange = ({ language }) => {
            console.log("Received remote language change:", language); // Debugging log
            setLanguage(language);
        };

        // Attach event listeners
        socket.on(ACTIONS.CODE_CHANGE, handleRemoteChange);
        socket.on(ACTIONS.LANGUAGE_CHANGE, handleRemoteLanguageChange);

        // Cleanup function to remove event listeners
        return () => {
            socket.off(ACTIONS.CODE_CHANGE, handleRemoteChange);
            socket.off(ACTIONS.LANGUAGE_CHANGE, handleRemoteLanguageChange);
        };
    }, [socketRef.current]); // Dependencies

    // useEffect(() => {
    //     if (!socketRef.current) return;
    //     const socket = socketRef.current;


    // }, [socketRef.current]);

    const handleDownload = () => {
        if (!editorRef.current) return;
        const code = editorRef.current.getValue();
        const extension = languageExtensions[language] || "txt";
        const fullFilename = filename ? `${filename}.${extension}` : `code.${extension}`; // default code

        const blob = new Blob([code], { type: "text/plain" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fullFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCopy = () => {
        if (!editorRef.current) return;
        const code = editorRef.current.getValue();

        // Copy to clipboard
        navigator.clipboard.writeText(code).then(() => {
            toast.success('Code copied to clipboard', { position: 'bottom-right' });
        }).catch(err => {
            toast.error('Failed to copy the code', { position: 'bottom-right' });
            console.error("Failed to copy code:", err);
        });
    };

    const handleFileOpen = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const fileName = file.name;
        const extension = fileName.split('.').pop().toLowerCase();

        // Find the language from the extension
        const detectedLanguage = Object.keys(languageExtensions).find(
            (key) => languageExtensions[key] === extension
        );

        if (!detectedLanguage) {
            toast.error("Unsupported file type");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            if (editorRef.current) {
                editorRef.current.setValue(e.target.result);
                setFilename(fileName.split('.')[0]); // Set filename without extension
                setLanguage(detectedLanguage); // Set the language dynamically
                if (socketRef.current) {
                    socketRef.current.emit(ACTIONS.LANGUAGE_CHANGE, { roomId, language: detectedLanguage });
                }
            }
        };
        reader.readAsText(file);
    };

    const handleLanguageChange = (e) => {
        const newLanguage = e.target.value;
        setLanguage(newLanguage);

        if (socketRef.current) {
            socketRef.current.emit(ACTIONS.LANGUAGE_CHANGE, { roomId, language: newLanguage });
        }
    };


    return (
        <div className="">
            {/* Language Selector */}
            <div className="monaco-topbar">
                <select className='dropdown' onChange={handleLanguageChange} value={language}>
                    <option value="javascript">JavaScript</option>
                    <option value="c">C</option>
                    <option value="cpp">C++</option>
                    <option value="java">Java</option>
                    <option value="python">Python</option>
                    <option value="go">Go</option>
                </select>
                <input type="text" placeholder="filename" className="monaco-filename" value={filename} onChange={(e) => setFilename(e.target.value)}></input>

                <div className="monaco-button-container">
                    <button className="monaco-button" onClick={() => fileInputRef.current.click()}>
                        Open
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        accept=".js,.c,.cpp,.java,.py,.go"
                        onChange={handleFileOpen}
                    />
                    <button className="monaco-button" onClick={handleDownload}>Download</button>
                    <button className="monaco-button" onClick={handleCopy}>Copy</button>
                </div>
            </div>

            {/* Monaco Editor */}
            <Editor
                height="91vh"
                theme="vs-dark"
                language={language}
                defaultValue="// Start coding..."
                onMount={handleEditorDidMount}
                onChange={handleEditorChange}
                options={{
                    fontSize: 14,
                    tabSize: 4,
                    automaticLayout: true,
                    minimap: { enabled: false },
                    autoClosingBrackets: "always",
                    autoClosingQuotes: "always",
                    suggestOnTriggerCharacters: true,
                }}
            />
        </div>
    );
};

export default MonacoEditor;
