import React, { useState, useEffect } from 'react';
import { X, Users, Heart, Baby, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { showToast } from '@/components/ui/Toast';
import { useFamilyTreeStore } from '@/stores/familyTreeStore';
import { FamilyMember, RelationType, Gender } from '@/types';

interface RelationshipFormProps {
  isOpen: boolean;
  onClose: () => void;
  person?: FamilyMember;
}

export const RelationshipForm: React.FC<RelationshipFormProps> = ({
  isOpen,
  onClose,
  person
}) => {
  const { persons, createRelationship } = useFamilyTreeStore();
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [relationType, setRelationType] = useState<RelationType>(RelationType.PARENT);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedPersonId('');
      setRelationType(RelationType.PARENT);
    }
  }, [isOpen]);

  // Get available persons (exclude current person)
  const availablePersons = persons.filter(p => p.id !== person?.id);

  // New fields for detailed label and family cluster (kept minimal to match NewRelationshipForm)
  const [selectedLabel, setSelectedLabel] = useState<string>('');
  const [customLabel, setCustomLabel] = useState<string>('');
  const [familyIdInput, setFamilyIdInput] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!person || !selectedPersonId) return;

    setIsSubmitting(true);
    try {
      const finalLabel = selectedLabel === '__other' ? (customLabel.trim() || undefined) : (selectedLabel || undefined);
      const options = {
        label: finalLabel,
        familyId: familyIdInput.trim() || undefined
      };

      createRelationship(person.id, selectedPersonId, relationType, options);
      showToast.success('Đã tạo quan hệ gia đình thành công!');
      onClose();
    } catch (error) {
      console.error('Error adding relationship:', error);
      showToast.error('Không thể tạo quan hệ. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRelationIcon = (type: RelationType) => {
    switch (type) {
      case RelationType.PARENT:
        return <Baby className="h-4 w-4" />;
      case RelationType.SPOUSE:
        return <Heart className="h-4 w-4" />;
      case RelationType.SIBLING:
        return <Users className="h-4 w-4" />;
      default:
        return <UserPlus className="h-4 w-4" />;
    }
  };

  const getRelationLabel = (type: RelationType) => {
    switch (type) {
      case RelationType.PARENT:
        return 'Cha/Mẹ - Con';
      case RelationType.SPOUSE:
        return 'Vợ/Chồng';
      case RelationType.SIBLING:
        return 'Anh/Chị/Em';
      default:
        return 'Khác';
    }
  };

  const getRelationDescription = (type: RelationType) => {
    switch (type) {
      case RelationType.PARENT:
        return `${person?.name} là cha/mẹ của người được chọn`;
      case RelationType.SPOUSE:
        return `${person?.name} là vợ/chồng của người được chọn`;
      case RelationType.SIBLING:
        return `${person?.name} là anh/chị/em của người được chọn`;
      default:
        return 'Quan hệ khác';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Thêm Quan Hệ Gia Đình">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Person info */}
        {person && (
          <div className="bg-gradient-to-r from-red-50 to-yellow-50 dark:from-red-900/20 dark:to-yellow-900/20 p-4 rounded-lg border-l-4 border-red-500">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                person.gender === Gender.MALE ? 'bg-blue-500' : 'bg-red-500'
              }`}>
                {person.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {person.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Đang tạo quan hệ cho người này
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Relationship type */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Loại quan hệ
          </label>
          <div className="grid grid-cols-1 gap-3">
            {Object.values(RelationType).map((type) => (
              <label
                key={type}
                className={`relative flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  relationType === type
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="relationType"
                  value={type}
                  checked={relationType === type}
                  onChange={(e) => setRelationType(e.target.value as RelationType)}
                  className="sr-only"
                />
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${
                    relationType === type ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {getRelationIcon(type)}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {getRelationLabel(type)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {getRelationDescription(type)}
                    </div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Select person */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Chọn người có quan hệ
          </label>
          <Select
            value={selectedPersonId}
            onChange={setSelectedPersonId}
            placeholder="Chọn một người..."
            required
          >
            {availablePersons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.gender === 'MALE' ? 'Nam' : 'Nữ'})
                {p.birthYear && ` - ${new Date().getFullYear() - p.birthYear} tuổi`}
              </option>
            ))}
          </Select>
          {availablePersons.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Cần có ít nhất 2 người để tạo quan hệ
            </p>
          )}
        </div>

        {/* Preview */}
        {selectedPersonId && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              Xem trước quan hệ:
            </h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              {getRelationDescription(relationType)}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            disabled={!selectedPersonId || isSubmitting || availablePersons.length === 0}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
          >
            {isSubmitting ? 'Đang thêm...' : 'Thêm quan hệ'}
          </Button>
        </div>

        {/* Minimal inputs for label and family cluster (placed after actions to avoid UI churn) */}
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-gray-700">Danh xưng cụ thể (tùy chọn)</label>
          <select
            value={selectedLabel}
            onChange={(e) => setSelectedLabel(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Tự động (gợi ý)</option>
            <option value="Anh">Anh</option>
            <option value="Chị">Chị</option>
            <option value="Em">Em</option>
            <option value="__other">Khác (nhập tay)</option>
          </select>
          {selectedLabel === '__other' && (
            <input
              type="text"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="Ví dụ: Cô ruột, Cô (vợ chú), Thím..."
              className="block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          )}

          <label className="block text-sm font-medium text-gray-700">Nhóm/Gia đình (tùy chọn)</label>
          <input
            type="text"
            value={familyIdInput}
            onChange={(e) => setFamilyIdInput(e.target.value)}
            placeholder="Tên nhóm/gia đình (ví dụ: Gia đình bác 5)"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        </div>
      </form>
    </Modal>
  );
};