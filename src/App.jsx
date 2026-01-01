import { BrowserRouter, Routes, Route } from 'react-router-dom';
import EditorPage from './pages/EditorPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/session/:id" element={<EditorPage />} />
        <Route path="/" element={<div>Navigate to /session/:id to start editing</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

