import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useFamilyTreeStore } from '@/stores/familyTreeStore';
import { FamilyMember, RelationType } from '@/types';
import { showToast } from '@/components/ui/Toast';

interface RelationshipFormProps {
  isOpen: boolean;
  onClose: () => void;
  person?: FamilyMember;
}

export const NewRelationshipForm: React.FC<RelationshipFormProps> = ({
  isOpen,
  onClose,
  person
}) => {
  const { persons, createRelationship } = useFamilyTreeStore();
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [relationType, setRelationType] = useState<RelationType>(RelationType.PARENT);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detailed label and family cluster
  const [selectedLabel, setSelectedLabel] = useState<string>('');
  const [customLabel, setCustomLabel] = useState<string>('');
  const [familyId, setFamilyId] = useState<string>('');
  // Optional subject anchor: who is the primary subject of this relation (helps disambiguation)
  const [subjectId, setSubjectId] = useState<string>('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedPersonId('');
      setRelationType(RelationType.PARENT);
      setSelectedLabel('');
      setCustomLabel('');
      setFamilyId('');
    }
  }, [isOpen]);

  // Get available persons (exclude current person)
  const availablePersons = persons.filter(p => p.id !== person?.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!person || !selectedPersonId) {
      showToast.error('Vui lòng chọn người để tạo quan hệ');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalLabel = selectedLabel === '__other' ? (customLabel.trim() || undefined) : (selectedLabel || undefined);
      const options = {
        label: finalLabel,
        familyId: familyId.trim() || undefined,
        subjectId: subjectId || undefined
      };

      createRelationship(person.id, selectedPersonId, relationType, options);
      showToast.success('Đã tạo quan hệ gia đình thành công!');
      onClose();
    } catch (error) {
      console.error('Error creating relationship:', error);
      showToast.error('Không thể tạo quan hệ. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const relationTypeOptions = [
    { value: RelationType.PARENT, label: 'Cha/Mẹ - Con' },
    { value: RelationType.SPOUSE, label: 'Vợ/Chồng' },
    { value: RelationType.SIBLING, label: 'Anh/Chị/Em' },
    { value: RelationType.CUSTOM, label: 'Khác (tùy chỉnh)' }
  ];

  const labelOptionsForType = (type: RelationType) => {
    switch (type) {
      case RelationType.PARENT:
        return [{ value: 'Ba', label: 'Ba' }, { value: 'Mẹ', label: 'Mẹ' }, { value: 'Con', label: 'Con' }];
      case RelationType.SPOUSE:
        return [{ value: 'Chồng', label: 'Chồng' }, { value: 'Vợ', label: 'Vợ' }];
      case RelationType.SIBLING:
        return [{ value: 'Anh', label: 'Anh' }, { value: 'Chị', label: 'Chị' }, { value: 'Em', label: 'Em' }];
      default:
        return [];
    }
  };

  const personOptions = availablePersons.map(p => ({
    value: p.id,
    label: p.name
  }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Thêm Quan Hệ Gia Đình">
      <form onSubmit={handleSubmit} className="space-y-6">
        {person && (
          <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-200">
            <h3 className="font-semibold text-red-800 mb-2">
              Tạo quan hệ cho: {person.name}
            </h3>
            <p className="text-sm text-red-600">
              Chọn người và loại quan hệ để kết nối với {person.name}
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chọn người
            </label>
            <select
              value={selectedPersonId}
              onChange={(e) => setSelectedPersonId(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              required
            >
              <option value="">Chọn người để tạo quan hệ...</option>
              {personOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loại quan hệ
            </label>
            <select
              value={relationType}
              onChange={(e) => setRelationType(e.target.value as RelationType)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              required
            >
              {relationTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Detailed label */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Danh xưng cụ thể (tùy chọn)</label>
            <div className="grid grid-cols-1 gap-2">
              <select
                value={selectedLabel}
                onChange={(e) => setSelectedLabel(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Tự động (gợi ý từ hệ thống)</option>
                {labelOptionsForType(relationType).map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
                <option value="__other">Khác (nhập tay)</option>
              </select>

              {selectedLabel === '__other' && (
                <input
                  type="text"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="Ví dụ: Cô ruột, Cô (vợ chú), Thím..."
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              )}
            </div>
          </div>


          {/* Subject anchor selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Người chủ đạo (điểm neo để phân định hướng)</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="">Tự động (hệ thống sẽ chọn)</option>
              <option value={person?.id}>{person?.name} (Người đang chọn)</option>
              {availablePersons.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Family cluster */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nhóm / Gia đình (tùy chọn)</label>
            <input
              type="text"
              value={familyId}
              onChange={(e) => setFamilyId(e.target.value)}
              placeholder="Ví dụ: Gia đình bác 5, Gia đình cô 10"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
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
            disabled={isSubmitting || !selectedPersonId}
            className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700"
          >
            {isSubmitting ? 'Đang tạo...' : 'Tạo quan hệ'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};