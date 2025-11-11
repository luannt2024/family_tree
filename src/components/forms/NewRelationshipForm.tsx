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

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedPersonId('');
      setRelationType(RelationType.PARENT);
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
      createRelationship(person.id, selectedPersonId, relationType);
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
  ];

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