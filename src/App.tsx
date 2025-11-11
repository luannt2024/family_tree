import React, { useEffect } from 'react';
import { useFamilyTreeStore } from '@/stores/familyTreeStore';
import { ToastProvider } from '@/components/ui/Toast';
import { FamilyTreeView } from '@/components/family-tree/FamilyTreeView';
import { ExportUtils } from '@/utils/export';

function App() {
  const { isDarkMode, importData, setError } = useFamilyTreeStore();

  // Apply dark mode class to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Handle share link on app load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shareParam = urlParams.get('share');
    
    if (shareParam) {
      try {
        const sharedData = ExportUtils.parseShareLink(shareParam);
        if (sharedData) {
          const success = importData(sharedData);
          if (!success) {
            setError('Không thể tải dữ liệu từ link chia sẻ');
          }
        }
      } catch (error) {
        console.error('Error loading shared data:', error);
        setError('Link chia sẻ không hợp lệ');
      }
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [importData, setError]);

  return (
    <div className="App">
      <ToastProvider />
      <FamilyTreeView />
    </div>
  );
}

export default App;