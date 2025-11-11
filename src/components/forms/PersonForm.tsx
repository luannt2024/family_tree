import React, { useState, useEffect } from 'react';
import { PersonFormData, Gender, Person } from '@/types';
import { ValidationUtils } from '@/utils/validation';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Modal, ModalFooter } from '@/components/ui/Modal';

interface PersonFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PersonFormData) => void;
  person?: Person; // For editing
  title?: string;
}

export const PersonForm: React.FC<PersonFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  person,
  title
}) => {
  const [formData, setFormData] = useState<PersonFormData>({
    name: '',
    gender: Gender.UNKNOWN,
    birthYear: undefined,
    birthDate: '',
    deathYear: undefined,
    deathDate: '',
    notes: '',
    avatar: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when person changes
  useEffect(() => {
    if (person) {
      setFormData({
        name: person.name,
        gender: person.gender,
        birthYear: person.birthYear,
        birthDate: person.birthDate || '',
        deathYear: person.deathYear,
        deathDate: person.deathDate || '',
        notes: person.notes || '',
        avatar: person.avatar || ''
      });
    } else {
      // Reset form for new person
      setFormData({
        name: '',
        gender: Gender.UNKNOWN,
        birthYear: undefined,
        birthDate: '',
        deathYear: undefined,
        deathDate: '',
        notes: '',
        avatar: ''
      });
    }
    setErrors({});
  }, [person, isOpen]);

  const handleInputChange = (field: keyof PersonFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const validationErrors = ValidationUtils.validatePerson(formData);
    const errorMap: Record<string, string> = {};
    
    validationErrors.forEach(error => {
      errorMap[error.field] = error.message;
    });

    // Additional form-specific validations
    if (!formData.name.trim()) {
      errorMap.name = 'Tên không được để trống';
    }

    if (formData.gender === Gender.UNKNOWN) {
      errorMap.gender = 'Vui lòng chọn giới tính';
    }

    // Validate Vietnamese name
    if (formData.name && !ValidationUtils.isValidVietnameseName(formData.name)) {
      errorMap.name = 'Tên chứa ký tự không hợp lệ';
    }

    setErrors(errorMap);
    return Object.keys(errorMap).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Clean up data before submitting
      const cleanData: PersonFormData = {
        ...formData,
        name: ValidationUtils.sanitizeName(formData.name),
        notes: formData.notes ? ValidationUtils.sanitizeNotes(formData.notes) : undefined,
        birthYear: formData.birthYear || undefined,
        deathYear: formData.deathYear || undefined,
        birthDate: formData.birthDate || undefined,
        deathDate: formData.deathDate || undefined,
        avatar: formData.avatar || undefined
      };

      await onSubmit(cleanData);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const genderOptions = [
    { value: Gender.MALE, label: 'Nam' },
    { value: Gender.FEMALE, label: 'Nữ' },
    { value: Gender.UNKNOWN, label: 'Không xác định' }
  ];

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - 1800 + 1 }, (_, i) => ({
    value: (currentYear - i).toString(),
    label: (currentYear - i).toString()
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || (person ? 'Chỉnh sửa thông tin' : 'Thêm người mới')}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tên */}
        <Input
          label="Họ và tên *"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          error={errors.name}
          placeholder="Nhập họ và tên"
          required
        />

        {/* Giới tính */}
        <Select
          label="Giới tính *"
          value={formData.gender}
          onChange={(e) => handleInputChange('gender', e.target.value as Gender)}
          options={genderOptions}
          error={errors.gender}
          placeholder="Chọn giới tính"
          required
        />

        {/* Năm sinh và ngày sinh */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Năm sinh"
            type="number"
            value={formData.birthYear || ''}
            onChange={(e) => handleInputChange('birthYear', e.target.value ? parseInt(e.target.value) : undefined)}
            error={errors.birthYear}
            placeholder="VD: 1990"
            min={1800}
            max={currentYear}
          />

          <Input
            label="Ngày sinh (chi tiết)"
            type="date"
            value={formData.birthDate}
            onChange={(e) => handleInputChange('birthDate', e.target.value)}
            error={errors.birthDate}
            helperText="Tùy chọn, để trống nếu không biết"
          />
        </div>

        {/* Năm mất và ngày mất */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Năm mất"
            type="number"
            value={formData.deathYear || ''}
            onChange={(e) => handleInputChange('deathYear', e.target.value ? parseInt(e.target.value) : undefined)}
            error={errors.deathYear}
            placeholder="VD: 2020"
            min={formData.birthYear || 1800}
            max={currentYear}
            helperText="Để trống nếu còn sống"
          />

          <Input
            label="Ngày mất (chi tiết)"
            type="date"
            value={formData.deathDate}
            onChange={(e) => handleInputChange('deathDate', e.target.value)}
            error={errors.deathDate}
            helperText="Tùy chọn, để trống nếu không biết"
          />
        </div>

        {/* Avatar URL */}
        <Input
          label="Ảnh đại diện (URL)"
          value={formData.avatar}
          onChange={(e) => handleInputChange('avatar', e.target.value)}
          error={errors.avatar}
          placeholder="https://example.com/avatar.jpg"
          helperText="Tùy chọn, để trống để sử dụng avatar mặc định"
        />

        {/* Ghi chú */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Ghi chú
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500"
            rows={3}
            placeholder="Thông tin bổ sung về người này..."
            maxLength={1000}
          />
          {errors.notes && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.notes}
            </p>
          )}
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {formData.notes.length}/1000 ký tự
          </p>
        </div>

        {/* Form actions */}
        <ModalFooter>
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
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            {person ? 'Cập nhật' : 'Thêm mới'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};