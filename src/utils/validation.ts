import { Person, Relation, Gender, RelationType, ValidationError } from '@/types';

export class ValidationUtils {
  static validatePerson(person: Partial<Person>): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate name
    if (!person.name || person.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'Tên không được để trống' });
    } else if (person.name.trim().length > 100) {
      errors.push({ field: 'name', message: 'Tên không được vượt quá 100 ký tự' });
    }

    // Validate gender
    if (!person.gender || !Object.values(Gender).includes(person.gender)) {
      errors.push({ field: 'gender', message: 'Giới tính không hợp lệ' });
    }

    // Validate birth year
    if (person.birthYear !== undefined) {
      const currentYear = new Date().getFullYear();
      if (person.birthYear < 1800 || person.birthYear > currentYear) {
        errors.push({ 
          field: 'birthYear', 
          message: `Năm sinh phải từ 1800 đến ${currentYear}` 
        });
      }
    }

    // Validate death year
    if (person.deathYear !== undefined && person.birthYear !== undefined) {
      if (person.deathYear < person.birthYear) {
        errors.push({ 
          field: 'deathYear', 
          message: 'Năm mất không thể trước năm sinh' 
        });
      }
      
      const currentYear = new Date().getFullYear();
      if (person.deathYear > currentYear) {
        errors.push({ 
          field: 'deathYear', 
          message: `Năm mất không thể sau năm ${currentYear}` 
        });
      }
    }

    // Validate birth date format
    if (person.birthDate && !this.isValidDate(person.birthDate)) {
      errors.push({ 
        field: 'birthDate', 
        message: 'Ngày sinh không đúng định dạng (YYYY-MM-DD)' 
      });
    }

    // Validate death date format
    if (person.deathDate && !this.isValidDate(person.deathDate)) {
      errors.push({ 
        field: 'deathDate', 
        message: 'Ngày mất không đúng định dạng (YYYY-MM-DD)' 
      });
    }

    // Validate notes length
    if (person.notes && person.notes.length > 1000) {
      errors.push({ 
        field: 'notes', 
        message: 'Ghi chú không được vượt quá 1000 ký tự' 
      });
    }

    return errors;
  }

  static validateRelation(relation: Partial<Relation>, persons: Person[]): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate relation type
    if (!relation.type || !Object.values(RelationType).includes(relation.type)) {
      errors.push({ field: 'type', message: 'Loại quan hệ không hợp lệ' });
    }

    // Validate person IDs
    if (!relation.personAId) {
      errors.push({ field: 'personAId', message: 'Thiếu ID người thứ nhất' });
    } else if (!persons.find(p => p.id === relation.personAId)) {
      errors.push({ field: 'personAId', message: 'Không tìm thấy người thứ nhất' });
    }

    if (!relation.personBId) {
      errors.push({ field: 'personBId', message: 'Thiếu ID người thứ hai' });
    } else if (!persons.find(p => p.id === relation.personBId)) {
      errors.push({ field: 'personBId', message: 'Không tìm thấy người thứ hai' });
    }

    // Cannot relate to self
    if (relation.personAId === relation.personBId) {
      errors.push({ 
        field: 'personBId', 
        message: 'Không thể tạo quan hệ với chính mình' 
      });
    }

    // Validate parent-child relation
    if (relation.type === RelationType.PARENT) {
      // For parent relation, we need to determine which person is parent and which is child
      // This will be handled by the relationship engine
      // For now, just ensure both persons exist (already validated above)
    }

    return errors;
  }

  static validateFamilyTreeConsistency(persons: Person[], relations: Relation[]): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check for duplicate relations
    const relationKeys = new Set<string>();
    relations.forEach((relation, index) => {
      const key1 = `${relation.personAId}-${relation.personBId}-${relation.type}`;
      const key2 = `${relation.personBId}-${relation.personAId}-${relation.type}`;
      
      if (relationKeys.has(key1) || relationKeys.has(key2)) {
        errors.push({
          field: `relations[${index}]`,
          message: 'Quan hệ trùng lặp'
        });
      }
      
      relationKeys.add(key1);
    });

    // Check for impossible relations (e.g., person being their own grandparent)
    // This would require more complex graph analysis
    
    // Check for multiple spouses (optional validation)
    const spouseMap = new Map<string, string[]>();
    relations
      .filter(r => r.type === RelationType.SPOUSE)
      .forEach(relation => {
        if (!spouseMap.has(relation.personAId)) {
          spouseMap.set(relation.personAId, []);
        }
        if (!spouseMap.has(relation.personBId)) {
          spouseMap.set(relation.personBId, []);
        }
        
        spouseMap.get(relation.personAId)!.push(relation.personBId);
        spouseMap.get(relation.personBId)!.push(relation.personAId);
      });

    // Warn about multiple spouses (not an error, just a warning)
    spouseMap.forEach((spouses, personId) => {
      if (spouses.length > 1) {
        const person = persons.find(p => p.id === personId);
        errors.push({
          field: 'relations',
          message: `${person?.name || 'Người này'} có nhiều vợ/chồng`
        });
      }
    });

    return errors;
  }

  private static isValidDate(dateString: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  static sanitizeName(name: string): string {
    return name.trim().replace(/\s+/g, ' ');
  }

  static sanitizeNotes(notes: string): string {
    return notes.trim().substring(0, 1000);
  }

  static isValidVietnameseName(name: string): boolean {
    // Basic Vietnamese name validation
    const vietnameseNameRegex = /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵýỷỹ\s]+$/;
    return vietnameseNameRegex.test(name);
  }

  static generatePersonId(): string {
    return `person_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static generateRelationId(): string {
    return `relation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}