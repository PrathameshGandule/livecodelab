import React, { useEffect, useRef, useState } from 'react';
import Codemirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/dracula.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/hint/show-hint';       // Enable autocomplete feature
import 'codemirror/addon/hint/javascript-hint';

import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/dracula.css';
import 'codemirror/addon/hint/show-hint.css';

import 'codemirror/addon/tern/tern';

import 'codemirror/addon/fold/foldgutter.css';
import 'codemirror/addon/fold/foldgutter';
import 'codemirror/addon/fold/brace-fold';
import 'codemirror/addon/lint/lint.css';
import 'codemirror/addon/lint/lint';
import 'codemirror/addon/lint/javascript-lint';

import ACTIONS from '../Actions';

const Editor = ({ socketRef, roomId, onCodeChange }) => {
    const editorRef = useRef(null);
    const [language, setLanguage] = useState('javascript')
    useEffect(() => {
        async function init() {
            editorRef.current = Codemirror.fromTextArea(
                document.getElementById('realtimeEditor'),
                {
                    mode: language,
                    theme: 'dracula',
                    lineNumbers: true,
                    autoCloseTags: true,
                    autoCloseBrackets: true,
                    matchBrackets: true,
                    showCursorWhenSelecting: true,
                    lineWrapping: true,
                    styleActiveLine: true,
                    indentWithTabs: true,
                    tabSize: 4,
                    smartIndent: true,
                    electricChars: true,
                    foldGutter: true,
                    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],

                    // Enable Auto-Suggestions & Autocomplete
                    extraKeys: { "Ctrl-Space": "autocomplete" }, // Trigger autocomplete with Ctrl+Space
                    hintOptions: { completeSingle: false }, // Avoids auto-completing a single suggestion

                    lint: true,
                    tern: {
                        defs: ['ecma5', 'browser'],
                        plugins: { doc_comment: true },
                        useWorker: true,
                    },
                }
            );

            // Auto-trigger autocomplete when typing
            editorRef.current.on("inputRead", function (cm, event) {
                if (!cm.state.completionActive) {
                    cm.showHint({ hint: Codemirror.hint.javascript });
                }
            });


            editorRef.current.on('change', (instance, changes) => {
                const { origin } = changes;
                const code = instance.getValue();
                onCodeChange(code);
                if (origin !== 'setValue') {
                    socketRef.current.emit(ACTIONS.CODE_CHANGE, {
                        roomId,
                        code,
                    });
                }
            });
        }
        init();
    }, [language]);

    useEffect(() => {
        if (socketRef.current) {
            socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
                if (code !== null) {
                    editorRef.current.setValue(code);
                }
            });
        }

        return () => {
            socketRef.current.off(ACTIONS.CODE_CHANGE);
        };
    }, [socketRef.current]);

    return (
        <div>
            {/* Dropdown to select language */}
            <select onChange={(e) => setLanguage(e.target.value)} value={language}>
                <option value="javascript">JavaScript</option>
                <option value="text/x-csrc">C</option>
                <option value="text/x-c++src">C++</option>
                <option value="text/x-java">Java</option>
                <option value="text/x-python">Python</option>
                <option value="text/x-go">Go</option>
            </select>

            <textarea id="realtimeEditor"></textarea>
        </div>
    );
};

export default Editor;
