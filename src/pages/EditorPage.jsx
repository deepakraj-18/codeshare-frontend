import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { initSocket, disconnectSocket, getSocket } from '../utils/socket';

// Editor states
const EDITOR_STATE = {
  LOADING: 'loading',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error',
};

const EditorPage = () => {
  const { id: sessionId } = useParams();
  const [code, setCode] = useState('');
  const [userCount, setUserCount] = useState(0);
  const [editorState, setEditorState] = useState(EDITOR_STATE.LOADING);
  const [errorMessage, setErrorMessage] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [language, setLanguage] = useState('javascript');
  
  // Flag to prevent emitting when content comes from server
  const isUpdatingFromServer = useRef(false);
  
  // Debounce timer for code-change emits
  const debounceTimerRef = useRef(null);
  
  // Copy feedback timer
  const copyFeedbackTimerRef = useRef(null);
  
  // Editor instance ref
  const editorRef = useRef(null);
  
  // Socket.IO server URL - adjust this to match your backend
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
  
  // Debounce delay: 300ms
  const DEBOUNCE_DELAY = 300;

  useEffect(() => {
    if (!sessionId) {
      setErrorMessage('Session ID is missing');
      setEditorState(EDITOR_STATE.ERROR);
      return;
    }

    // Set initial state to loading
    setEditorState(EDITOR_STATE.LOADING);
    setErrorMessage(null);

    // Initialize socket connection
    const socket = initSocket(SOCKET_URL);

    // Helper function to emit join-session
    const joinSession = () => {
      socket.emit('join-session', sessionId);
    };

    // Join session on mount
    joinSession();

    // Handle session joined
    socket.on('session-joined', (data) => {
      if (data.content !== undefined) {
        isUpdatingFromServer.current = true;
        setCode(data.content || '');
        isUpdatingFromServer.current = false;
      }
      if (data.userCount !== undefined) {
        setUserCount(data.userCount);
      }
      setEditorState(EDITOR_STATE.CONNECTED);
      setErrorMessage(null);
    });

    // Handle code updates from server
    socket.on('code-update', (data) => {
      if (data.content !== undefined) {
        isUpdatingFromServer.current = true;
        setCode(data.content);
        isUpdatingFromServer.current = false;
      }
    });

    // Handle user count updates
    socket.on('user-count-update', (data) => {
      if (data.userCount !== undefined) {
        setUserCount(data.userCount);
      }
    });

    // Handle session errors (unrecoverable)
    socket.on('session-error', (data) => {
      setErrorMessage(data.message || 'An error occurred');
      setEditorState(EDITOR_STATE.ERROR);
    });

    // Handle socket disconnect
    socket.on('disconnect', () => {
      // Set to reconnecting (socket.io will handle reconnection automatically)
      setEditorState((prevState) => {
        // Only set to reconnecting if not already in error state
        if (prevState !== EDITOR_STATE.ERROR) {
          return EDITOR_STATE.RECONNECTING;
        }
        return prevState;
      });
    });

    // Handle socket reconnect
    socket.on('connect', () => {
      // Re-join session on reconnect
      // Use functional update to check current state
      setEditorState((prevState) => {
        if (prevState === EDITOR_STATE.RECONNECTING) {
          // Re-join session
          socket.emit('join-session', sessionId);
          // State will be set to CONNECTED when session-joined is received
        }
        return prevState;
      });
    });

    // Handle connection errors (initial connection failures)
    socket.on('connect_error', (err) => {
      // Only set error if we're in loading state (initial connection failure)
      setEditorState((prevState) => {
        if (prevState === EDITOR_STATE.LOADING) {
          setErrorMessage(`Connection error: ${err.message}`);
          return EDITOR_STATE.ERROR;
        }
        return prevState;
      });
    });

    // Cleanup on unmount
    return () => {
      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      socket.off('session-joined');
      socket.off('code-update');
      socket.off('user-count-update');
      socket.off('session-error');
      socket.off('disconnect');
      socket.off('connect');
      socket.off('connect_error');
      disconnectSocket();
    };
  }, [sessionId, SOCKET_URL]);

  // Handle editor content change with debounce
  const handleEditorChange = (value) => {
    const newCode = value || '';
    
    // Always update local state immediately (no debounce on UI)
    setCode(newCode);
    
    // Debounce socket emit (only if change is from user, not from server)
    if (!isUpdatingFromServer.current) {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      // Set new timer for debounced emit
      // Capture newCode in closure for the timeout callback
      debounceTimerRef.current = setTimeout(() => {
        const socket = getSocket();
        // Check socket connection and emit
        if (socket && socket.connected) {
          socket.emit('code-change', {
            sessionId,
            content: newCode, // Use newCode from closure
          });
        }
        debounceTimerRef.current = null;
      }, DEBOUNCE_DELAY);
    }
  };

  // Handle copy link
  const handleCopyLink = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      
      // Show feedback
      setCopyFeedback(true);
      
      // Clear existing timer if any
      if (copyFeedbackTimerRef.current) {
        clearTimeout(copyFeedbackTimerRef.current);
      }
      
      // Hide feedback after 2 seconds
      copyFeedbackTimerRef.current = setTimeout(() => {
        setCopyFeedback(false);
        copyFeedbackTimerRef.current = null;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopyFeedback(true);
        if (copyFeedbackTimerRef.current) {
          clearTimeout(copyFeedbackTimerRef.current);
        }
        copyFeedbackTimerRef.current = setTimeout(() => {
          setCopyFeedback(false);
          copyFeedbackTimerRef.current = null;
        }, 2000);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  // Cleanup copy feedback timer on unmount
  useEffect(() => {
    return () => {
      if (copyFeedbackTimerRef.current) {
        clearTimeout(copyFeedbackTimerRef.current);
      }
    };
  }, []);

  // Determine if editor should be disabled
  const isEditorDisabled = editorState !== EDITOR_STATE.CONNECTED;
  
  // Get status text based on state
  const getStatusText = () => {
    switch (editorState) {
      case EDITOR_STATE.LOADING:
        return 'Loading';
      case EDITOR_STATE.CONNECTED:
        return 'Connected';
      case EDITOR_STATE.RECONNECTING:
        return 'Reconnecting';
      case EDITOR_STATE.ERROR:
        return 'Error';
      default:
        return '';
    }
  };

  // Get status badge class based on state
  const getStatusBadgeClass = () => {
    switch (editorState) {
      case EDITOR_STATE.LOADING:
        return 'editor-status-badge editor-status-loading';
      case EDITOR_STATE.CONNECTED:
        return 'editor-status-badge editor-status-connected';
      case EDITOR_STATE.RECONNECTING:
        return 'editor-status-badge editor-status-reconnecting';
      case EDITOR_STATE.ERROR:
        return 'editor-status-badge editor-status-error';
      default:
        return 'editor-status-badge editor-status-loading';
    }
  };

  return (
    <div className="editor-page">
      {/* Header Section */}
      <header className="editor-header">
        <div className="editor-header-content">
          <Link to="/" className="editor-header-logo">
            <span className="editor-header-logo-icon">&lt;/&gt;</span>
            <span>Codeshare</span>
          </Link>
          
          <div className="editor-header-center">
            <span className="editor-header-label">Session:</span>
            <button className="editor-header-session-button">New</button>
            <button
              className="editor-header-copy-button"
              onClick={handleCopyLink}
              title="Copy session link"
            >
              {copyFeedback ? '✓' : '📋'}
            </button>
          </div>
          
          <div className="editor-header-actions">
            <button className="editor-header-share-button">Share</button>
            <button className="editor-header-login-button">Login (Demo Pro)</button>
          </div>
        </div>
      </header>

      {/* Editor Area */}
      <div className="editor-main-content">
        <div className="editor-area">
          <Editor
            height="100%"
            defaultLanguage={language}
            theme="vs-dark"
            value={code}
            onChange={handleEditorChange}
            onMount={(editor) => {
              editorRef.current = editor;
              // Update cursor position on change
              editor.onDidChangeCursorPosition((e) => {
                setCursorPosition({
                  line: e.position.lineNumber,
                  column: e.position.column,
                });
              });
            }}
            language={language}
            options={{
              readOnly: isEditorDisabled,
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: 'on',
            }}
          />
        </div>

        {/* Collaboration Panel */}
        <aside className="editor-sidebar">
          <div className="editor-sidebar-header">
            <h3 className="editor-sidebar-title">Online ({userCount})</h3>
          </div>
          
          <div className="editor-sidebar-users">
            <div className="editor-sidebar-user">
              <div className="editor-sidebar-avatar">me</div>
              <div className="editor-sidebar-user-info">
                <div className="editor-sidebar-user-name">You</div>
                <div className="editor-sidebar-user-status">Editing...</div>
              </div>
            </div>
            
            {userCount > 1 && (
              <>
                <div className="editor-sidebar-user">
                  <div className="editor-sidebar-avatar">JD</div>
                  <div className="editor-sidebar-user-info">
                    <div className="editor-sidebar-user-name">John Doe</div>
                    <div className="editor-sidebar-user-status">Idle</div>
                  </div>
                </div>
                
                {userCount > 2 && (
                  <div className="editor-sidebar-user">
                    <div className="editor-sidebar-avatar">Gues</div>
                    <div className="editor-sidebar-user-info">
                      <div className="editor-sidebar-user-name">Guest User</div>
                      <div className="editor-sidebar-user-status">Viewing</div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="editor-sidebar-ad">
            <div className="editor-sidebar-ad-placeholder">Ad Space</div>
          </div>
        </aside>
      </div>

      {/* Footer Section */}
      <footer className="editor-footer">
        <div className="editor-footer-left">
          <div className="editor-footer-status">
            <span className={`editor-footer-status-dot ${editorState === EDITOR_STATE.CONNECTED ? 'editor-footer-status-dot-connected' : ''}`}></span>
            <span>{getStatusText()}</span>
          </div>
          <span className="editor-footer-separator">•</span>
          <span>Line {cursorPosition.line}, Column {cursorPosition.column}</span>
          <span className="editor-footer-separator">•</span>
          <span>UTF-8</span>
        </div>
        
        <div className="editor-footer-center">
          <select 
            className="editor-footer-language-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="csharp">C#</option>
            <option value="go">Go</option>
            <option value="rust">Rust</option>
          </select>
        </div>
        
        <div className="editor-footer-right">
          <button className="editor-footer-help-button" title="Help">?</button>
          <span>{language.charAt(0).toUpperCase() + language.slice(1)}</span>
          <span className="editor-footer-separator">•</span>
          <span>2 Spaces</span>
        </div>
      </footer>
    </div>
  );
};

export default EditorPage;

