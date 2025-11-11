import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FamilyMember } from '@/types';

interface SimpleRelationshipFormProps {
  isOpen: boolean;
  onClose: () => void;
  person?: FamilyMember;
}

export const SimpleRelationshipForm: React.FC<SimpleRelationshipFormProps> = ({
  isOpen,
  onClose,
  person
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Thêm Quan Hệ Gia Đình">
      <div className="space-y-4">
        {person && (
          <div className="p-4 bg-gray-100 rounded-lg">
            <h3 className="font-semibold">Tạo quan hệ cho: {person.name}</h3>
          </div>
        )}
        
        <div className="text-center">
          <p>Chức năng đang được phát triển...</p>
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
        </div>
      </div>
    </Modal>
  );
};