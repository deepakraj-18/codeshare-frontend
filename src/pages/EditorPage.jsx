import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { initSocket, disconnectSocket, getSocket } from '../utils/socket';

const EditorPage = () => {
  const { id: sessionId } = useParams();
  const [code, setCode] = useState('');
  const [userCount, setUserCount] = useState(0);
  const [error, setError] = useState(null);
  const [isEditorDisabled, setIsEditorDisabled] = useState(false);
  
  // Flag to prevent emitting when content comes from server
  const isUpdatingFromServer = useRef(false);
  
  // Socket.IO server URL - adjust this to match your backend
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

  useEffect(() => {
    if (!sessionId) {
      setError('Session ID is missing');
      setIsEditorDisabled(true);
      return;
    }

    // Initialize socket connection
    const socket = initSocket(SOCKET_URL);

    // Join session
    socket.emit('join-session', sessionId);

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
      setError(null);
      setIsEditorDisabled(false);
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

    // Handle session errors
    socket.on('session-error', (data) => {
      setError(data.message || 'An error occurred');
      setIsEditorDisabled(true);
    });

    // Handle connection errors
    socket.on('connect_error', (err) => {
      setError(`Connection error: ${err.message}`);
      setIsEditorDisabled(true);
    });

    // Cleanup on unmount
    return () => {
      socket.off('session-joined');
      socket.off('code-update');
      socket.off('user-count-update');
      socket.off('session-error');
      socket.off('connect_error');
      disconnectSocket();
    };
  }, [sessionId, SOCKET_URL]);

  // Handle editor content change
  const handleEditorChange = (value) => {
    const newCode = value || '';
    
    // Only emit if change is from user, not from server
    if (!isUpdatingFromServer.current) {
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit('code-change', {
          sessionId,
          content: newCode,
        });
      }
    }
    
    // Always update local state
    setCode(newCode);
  };

  return (
    <div style={{ padding: '20px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '10px' }}>
        <div>Session ID: {sessionId}</div>
        <div>Users: {userCount}</div>
        {error && (
          <div style={{ color: 'red', marginTop: '10px' }}>
            Error: {error}
          </div>
        )}
      </div>
      
      <div style={{ flex: 1, border: '1px solid #ccc' }}>
        <Editor
          height="100%"
          defaultLanguage="javascript"
          value={code}
          onChange={handleEditorChange}
          options={{
            readOnly: isEditorDisabled,
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
          }}
        />
      </div>
    </div>
  );
};

export default EditorPage;

