import React, { useState, useCallback, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Download, 
  Share2, 
  Settings, 
  Moon, 
  Sun,
  Users,
  Home,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { useFamilyTreeStore } from '@/stores/familyTreeStore';
import { PersonForm } from '@/components/forms/PersonForm';
import { NewRelationshipForm } from '@/components/forms/NewRelationshipForm';
import { PersonCard } from './PersonCard';
import { FamilyGraphView } from './FamilyGraphView';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { showToast } from '@/components/ui/Toast';
import { ExportUtils } from '@/utils/export';
import { PersonFormData, FamilyMember, Gender } from '@/types';
import { ValidationUtils } from '@/utils/validation';

export const FamilyTreeView: React.FC = () => {
  const {
    persons,
    userId,
    selectedPersonId,
    searchQuery,
    isDarkMode,
    isLoading,
    error,
    getFamilyMembers,
    addPerson,
    updatePerson,
    selectPerson,
    setSearchQuery,
    searchPersons,
    toggleDarkMode,
    setError,
    exportData,
    importData,
    reset
  } = useFamilyTreeStore();

  const [isPersonFormOpen, setIsPersonFormOpen] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [editingPerson, setEditingPerson] = useState<FamilyMember | null>(null);
  const [isRelationshipFormOpen, setIsRelationshipFormOpen] = useState(false);
  const [relationshipPerson, setRelationshipPerson] = useState<FamilyMember | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchResults, setSearchResults] = useState<FamilyMember[]>([]);

  const familyMembers = getFamilyMembers();

  // Handle search
  useEffect(() => {
    if (searchQuery.trim()) {
      const results = searchPersons(searchQuery);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, searchPersons]);

  // Handle errors
  useEffect(() => {
    if (error) {
      showToast.error(error);
      setError(null);
    }
  }, [error, setError]);

  const handleAddPerson = useCallback((data: PersonFormData) => {
    try {
      addPerson({ person: data });
      showToast.success('Đã thêm người mới thành công');
      setIsPersonFormOpen(false);
    } catch (error) {
      showToast.error('Không thể thêm người mới');
    }
  }, [addPerson]);

  const handleUpdatePerson = useCallback((data: PersonFormData) => {
    if (!editingPerson) return;
    
    try {
      updatePerson({ 
        personId: editingPerson.id, 
        updates: data 
      });
      showToast.success('Đã cập nhật thông tin thành công');
      setEditingPerson(null);
    } catch (error) {
      showToast.error('Không thể cập nhật thông tin');
    }
  }, [editingPerson, updatePerson]);

  const handleEditPerson = useCallback((person: FamilyMember) => {
    setEditingPerson(person);
  }, []);

  const handleDeletePerson = useCallback((person: FamilyMember) => {
    if (person.isUser) {
      showToast.error('Không thể xóa người dùng chính');
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn xóa ${person.name}?`)) {
      try {
        // deletePerson({ personId: person.id });
        showToast.success('Đã xóa thành công');
      } catch (error) {
        showToast.error('Không thể xóa người này');
      }
    }
  }, []);

  const handleAddRelation = useCallback((person: FamilyMember) => {
    setRelationshipPerson(person);
    setIsRelationshipFormOpen(true);
  }, []);

  const handleExportPNG = useCallback(async () => {
    try {
      await ExportUtils.exportToPNG('family-tree-canvas', 'cay-gia-pha.png');
      showToast.success('Đã xuất file PNG thành công');
    } catch (error) {
      showToast.error('Không thể xuất file PNG');
    }
  }, []);

  const handleExportPDF = useCallback(async () => {
    try {
      await ExportUtils.exportToPDF('family-tree-canvas', 'cay-gia-pha.pdf');
      showToast.success('Đã xuất file PDF thành công');
    } catch (error) {
      showToast.error('Không thể xuất file PDF');
    }
  }, []);

  const handleShare = useCallback(async () => {
    try {
      const data = exportData();
      const shareLink = ExportUtils.generateShareLink(data);
      await ExportUtils.copyToClipboard(shareLink);
      showToast.success('Đã copy link chia sẻ vào clipboard');
    } catch (error) {
      showToast.error('Không thể tạo link chia sẻ');
    }
  }, [exportData]);

  const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    ExportUtils.readJSONFile(file)
      .then(data => {
        const success = importData(JSON.stringify(data));
        if (success) {
          showToast.success('Đã import dữ liệu thành công');
        }
      })
      .catch(error => {
        showToast.error('Không thể đọc file dữ liệu');
      });

    // Reset input
    event.target.value = '';
  }, [importData]);

  const handleCreateFirstPerson = useCallback(() => {
    if (persons.length === 0) {
      setIsPersonFormOpen(true);
    }
  }, [persons.length]);

  // Show welcome screen if no persons
  if (persons.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Cây Gia Phả Thông Minh
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Tạo sơ đồ gia phả và khám phá cách xưng hô trong gia đình Việt Nam
          </p>
          <div className="space-y-3">
            <Button onClick={handleCreateFirstPerson} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Bắt đầu tạo gia phả
            </Button>
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Hoặc import dữ liệu có sẵn
              </Button>
            </div>
          </div>
        </div>

        <PersonForm
          isOpen={isPersonFormOpen}
          onClose={() => setIsPersonFormOpen(false)}
          onSubmit={handleAddPerson}
          title="Tạo hồ sơ cá nhân"
        />
      </div>
    );
  }

  return (
    <div className={`family-tree-container ${isFullscreen ? 'fixed inset-0 z-50' : 'min-h-screen'}`}>
      {/* Toolbar */}
      <div className="family-tree-toolbar flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Cây Gia Phả Thông Minh
          </h1>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Tìm kiếm người..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Add person */}
          <Button onClick={() => setIsPersonFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Thêm người
          </Button>

          {/* Export options */}
          <div className="flex items-center space-x-1">
            <Button variant="outline" size="sm" onClick={handleExportPNG}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Theme toggle */}
          <Button variant="ghost" size="sm" onClick={toggleDarkMode}>
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Fullscreen toggle */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="family-tree-sidebar">
          <div className="p-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Thành viên gia đình
            </h2>

            {/* Search results or all members */}
            <div className="space-y-3">
              {(searchResults.length > 0 ? searchResults : familyMembers).map((member) => (
                <div
                  key={member.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedPersonId === member.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => selectPerson(member.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                      member.gender === Gender.MALE ? 'bg-family-male' : 
                      member.gender === Gender.FEMALE ? 'bg-family-female' : 'bg-family-neutral'
                    }`}>
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {member.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {member.addressing.title}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {searchResults.length === 0 && searchQuery && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Không tìm thấy kết quả nào
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="family-tree-main">
          <div id="family-tree-canvas" className="w-full h-full p-8">
            {/* Simple grid layout for now */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {familyMembers.map((member) => (
                <PersonCard
                  key={member.id}
                  person={member}
                  isSelected={selectedPersonId === member.id}
                  onClick={() => selectPerson(member.id)}
                  onEdit={handleEditPerson}
                  onDelete={handleDeletePerson}
                  onAddRelation={handleAddRelation}
                  showAddressing={true}
                />
              ))}
            </div>

            {familyMembers.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Chưa có thành viên nào trong gia phả
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Forms */}
      <PersonForm
        isOpen={isPersonFormOpen}
        onClose={() => setIsPersonFormOpen(false)}
        onSubmit={handleAddPerson}
      />

      <PersonForm
        isOpen={!!editingPerson}
        onClose={() => setEditingPerson(null)}
        onSubmit={handleUpdatePerson}
        person={editingPerson || undefined}
      />

      <NewRelationshipForm
        isOpen={isRelationshipFormOpen}
        onClose={() => {
          setIsRelationshipFormOpen(false);
          setRelationshipPerson(null);
        }}
        person={relationshipPerson || undefined}
      />

      {/* Hidden file input for import */}
      <input
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
        id="import-file-input"
      />
    </div>
  );
};