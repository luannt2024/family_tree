import { 
  Person, 
  Relation, 
  RelationType, 
  Gender, 
  AddressingTitle, 
  AddressingInfo, 
  LineageType 
} from '@/types';

export class AddressingEngine {
  private persons: Person[];
  private relations: Relation[];
  private userId: string;

  constructor(persons: Person[], relations: Relation[], userId: string) {
    this.persons = persons;
    this.relations = relations;
    this.userId = userId;
  }

  /**
   * Tính toán danh xưng cho một người dựa trên quan hệ với user
   */
  calculateAddressing(personId: string): AddressingInfo {
    if (personId === this.userId) {
      return {
        title: AddressingTitle.UNKNOWN,
        explanation: 'Bạn',
        greetingExamples: [],
        lineage: null,
        generation: 0,
        confidence: 1.0
      };
    }

    const relationPath = this.findRelationPath(this.userId, personId);
    if (!relationPath || relationPath.length === 0) {
      return {
        title: AddressingTitle.UNKNOWN,
        explanation: 'Không xác định được quan hệ',
        greetingExamples: [],
        lineage: null,
        generation: 0,
        confidence: 0.0
      };
    }

    return this.analyzeRelationPath(relationPath);
  }

  // Public helper to retrieve the raw relation path (chuỗi id quan hệ) between two persons
  public getRelationPath(fromId: string, toId: string): string[] | null {
    return this.findRelationPath(fromId, toId);
  }

  /**
   * Tìm đường đi quan hệ từ user đến person
   */
  private findRelationPath(fromId: string, toId: string): string[] | null {
    if (fromId === toId) return [];

    const visited = new Set<string>();
    const queue: { personId: string; path: string[] }[] = [
      { personId: fromId, path: [] }
    ];

    while (queue.length > 0) {
      const { personId, path } = queue.shift()!;
      
      if (visited.has(personId)) continue;
      visited.add(personId);

      if (personId === toId) {
        return path;
      }

      // Tìm tất cả người liên quan
      const relatedPersons = this.getRelatedPersons(personId);
      
      for (const { relatedPersonId, relation } of relatedPersons) {
        if (!visited.has(relatedPersonId)) {
          queue.push({
            personId: relatedPersonId,
            path: [...path, relation.id]
          });
        }
      }
    }

    return null;
  }

  /**
   * Lấy danh sách người liên quan trực tiếp
   */
  private getRelatedPersons(personId: string): Array<{ relatedPersonId: string; relation: Relation }> {
    const related: Array<{ relatedPersonId: string; relation: Relation }> = [];

    this.relations.forEach(relation => {
      if (relation.personAId === personId) {
        related.push({ relatedPersonId: relation.personBId, relation });
      } else if (relation.personBId === personId) {
        related.push({ relatedPersonId: relation.personAId, relation });
      }
    });

    return related;
  }

  /**
   * Phân tích đường đi quan hệ để xác định danh xưng
   */
  private analyzeRelationPath(relationPath: string[]): AddressingInfo {
    if (relationPath.length === 0) {
      return {
        title: AddressingTitle.UNKNOWN,
        explanation: 'Bạn',
        greetingExamples: [],
        lineage: null,
        generation: 0,
        confidence: 1.0
      };
    }

    // Phân tích từng bước trong đường đi
    const steps = relationPath.map(relationId => {
      const relation = this.relations.find(r => r.id === relationId)!;
      return this.analyzeRelationStep(relation);
    });

    // Tính toán thế hệ và nhánh
    let generation = 0;
    let lineage: LineageType | null = null;
    let currentPersonId = this.userId;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const relation = this.relations.find(r => r.id === relationPath[i])!;
      
      // Xác định người tiếp theo trong đường đi
      const nextPersonId = relation.personAId === currentPersonId 
        ? relation.personBId 
        : relation.personAId;

      // Cập nhật thế hệ
      if (step.type === RelationType.PARENT) {
        if (relation.childId === currentPersonId) {
          generation++; // Đi lên thế hệ trên
        } else {
          generation--; // Đi xuống thế hệ dưới
        }
      }

      // Xác định nhánh nội/ngoại ở bước đầu tiên
      if (i === 0 && step.type === RelationType.PARENT && relation.childId === currentPersonId) {
        const parent = this.persons.find(p => p.id === nextPersonId);
        if (parent) {
          // Kiểm tra xem đây là cha hay mẹ
          const userPerson = this.persons.find(p => p.id === this.userId);
          if (userPerson) {
            lineage = this.determineLineage(parent, userPerson);
          }
        }
      }

      currentPersonId = nextPersonId;
    }

    // Xác định danh xưng dựa trên phân tích
    const targetPerson = this.persons.find(p => p.id === currentPersonId)!;
    const addressing = this.determineAddressingTitle(steps, generation, lineage, targetPerson);

    return addressing;
  }

  /**
   * Phân tích một bước quan hệ
   */
  private analyzeRelationStep(relation: Relation): { type: RelationType; isOlder?: boolean } {
    return {
      type: relation.type,
      // Có thể thêm logic để xác định anh/chị/em dựa trên tuổi
    };
  }

  /**
   * Xác định nhánh nội/ngoại
   */
  private determineLineage(parent: Person, user: Person): LineageType {
    // Logic đơn giản: giả sử cha là nội, mẹ là ngoại
    // Trong thực tế có thể phức tạp hơn
    return parent.gender === Gender.MALE ? LineageType.PATERNAL : LineageType.MATERNAL;
  }

  /**
   * Xác định danh xưng cuối cùng
   */
  private determineAddressingTitle(
    steps: Array<{ type: RelationType; isOlder?: boolean }>,
    generation: number,
    lineage: LineageType | null,
    targetPerson: Person
  ): AddressingInfo {
    
    // Trường hợp đặc biệt: quan hệ trực tiếp
    if (steps.length === 1) {
      const step = steps[0];
      
      if (step.type === RelationType.PARENT) {
        if (generation > 0) {
          // Cha mẹ
          return targetPerson.gender === Gender.MALE 
            ? this.createAddressingInfo(AddressingTitle.BA, 'Cha của bạn', lineage, generation)
            : this.createAddressingInfo(AddressingTitle.ME, 'Mẹ của bạn', lineage, generation);
        } else {
          // Con
          return this.createAddressingInfo(AddressingTitle.CON, 'Con của bạn', lineage, generation);
        }
      }
      
      if (step.type === RelationType.SPOUSE) {
        return targetPerson.gender === Gender.MALE
          ? this.createAddressingInfo(AddressingTitle.ANH, 'Chồng của bạn', lineage, generation)
          : this.createAddressingInfo(AddressingTitle.CHI, 'Vợ của bạn', lineage, generation);
      }
      
      if (step.type === RelationType.SIBLING) {
        // Cần logic để xác định anh/chị/em dựa trên tuổi
        return this.createAddressingInfo(AddressingTitle.ANH, 'Anh/chị/em của bạn', lineage, generation);
      }
    }

    // Trường hợp phức tạp: nhiều bước
    return this.analyzeComplexRelation(steps, generation, lineage, targetPerson);
  }

  /**
   * Phân tích quan hệ phức tạp (nhiều bước)
   */
  private analyzeComplexRelation(
    steps: Array<{ type: RelationType; isOlder?: boolean }>,
    generation: number,
    lineage: LineageType | null,
    targetPerson: Person
  ): AddressingInfo {
    
    // Thế hệ trên (generation > 0)
    if (generation === 1) {
      // Anh chị em của cha mẹ
      if (steps.length === 2 && 
          steps[0].type === RelationType.PARENT && 
          steps[1].type === RelationType.SIBLING) {
        
        if (lineage === LineageType.PATERNAL) {
          // Anh chị em của cha
          if (targetPerson.gender === Gender.MALE) {
            // Cần logic để phân biệt bác/chú dựa trên tuổi so với cha
            return this.createAddressingInfo(AddressingTitle.CHU, 'Em trai của Ba', lineage, generation);
          } else {
            return this.createAddressingInfo(AddressingTitle.CO, 'Em gái của Ba', lineage, generation);
          }
        } else {
          // Anh chị em của mẹ
          if (targetPerson.gender === Gender.MALE) {
            return this.createAddressingInfo(AddressingTitle.CAU, 'Em trai của Mẹ', lineage, generation);
          } else {
            return this.createAddressingInfo(AddressingTitle.DI, 'Em gái của Mẹ', lineage, generation);
          }
        }
      }
      
      // Vợ/chồng của anh chị em cha mẹ
      if (steps.length === 3 && 
          steps[0].type === RelationType.PARENT && 
          steps[1].type === RelationType.SIBLING &&
          steps[2].type === RelationType.SPOUSE) {
        
        if (lineage === LineageType.PATERNAL) {
          if (targetPerson.gender === Gender.FEMALE) {
            return this.createAddressingInfo(AddressingTitle.THIM, 'Vợ của Chú', lineage, generation);
          } else {
            return this.createAddressingInfo(AddressingTitle.DUONG, 'Chồng của Cô', lineage, generation);
          }
        } else {
          if (targetPerson.gender === Gender.FEMALE) {
            return this.createAddressingInfo(AddressingTitle.MO, 'Vợ của Cậu', lineage, generation);
          } else {
            return this.createAddressingInfo(AddressingTitle.DUONG, 'Chồng của Dì', lineage, generation);
          }
        }
      }
    }

    // Thế hệ ngang hàng (generation === 0)
    if (generation === 0) {
      // Con của anh chị em cha mẹ (anh chị em họ)
      if (steps.length === 3 && 
          steps[0].type === RelationType.PARENT && 
          steps[1].type === RelationType.SIBLING &&
          steps[2].type === RelationType.PARENT) {
        
        return this.createAddressingInfo(AddressingTitle.ANH_HO, 'Anh/chị/em họ', lineage, generation);
      }
    }

    // Thế hệ dưới (generation < 0)
    if (generation === -1) {
      return this.createAddressingInfo(AddressingTitle.CHAU, 'Cháu', lineage, generation);
    }

    // Trường hợp không xác định được
    return this.createAddressingInfo(AddressingTitle.UNKNOWN, 'Không xác định được quan hệ', lineage, generation);
  }

  /**
   * Tạo thông tin danh xưng
   */
  private createAddressingInfo(
    title: AddressingTitle,
    explanation: string,
    lineage: LineageType | null,
    generation: number
  ): AddressingInfo {
    const greetingExamples = this.generateGreetingExamples(title);
    const confidence = this.calculateConfidence(title, explanation);

    return {
      title,
      explanation,
      greetingExamples,
      lineage,
      generation,
      confidence
    };
  }

  /**
   * Tạo ví dụ câu chào
   */
  private generateGreetingExamples(title: AddressingTitle): string[] {
    const greetings: Record<AddressingTitle, string[]> = {
      [AddressingTitle.BA]: ['Con chào Ba ạ', 'Ba có khỏe không ạ?'],
      [AddressingTitle.ME]: ['Con chào Mẹ ạ', 'Mẹ có khỏe không ạ?'],
      [AddressingTitle.BAC_TRAI]: ['Cháu chào Bác ạ', 'Cháu nhờ Bác giúp...'],
      [AddressingTitle.BAC_GAI]: ['Cháu chào Bác ạ', 'Cháu nhờ Bác giúp...'],
      [AddressingTitle.CHU]: ['Cháu chào Chú ạ', 'Chú có khỏe không ạ?'],
      [AddressingTitle.CO]: ['Cháu chào Cô ạ', 'Cô có khỏe không ạ?'],
      [AddressingTitle.CAU]: ['Cháu chào Cậu ạ', 'Cậu có khỏe không ạ?'],
      [AddressingTitle.DI]: ['Cháu chào Dì ạ', 'Dì có khỏe không ạ?'],
      [AddressingTitle.THIM]: ['Cháu chào Thím ạ', 'Thím có khỏe không ạ?'],
      [AddressingTitle.DUONG]: ['Cháu chào Dượng ạ', 'Dượng có khỏe không ạ?'],
      [AddressingTitle.MO]: ['Cháu chào Mợ ạ', 'Mợ có khỏe không ạ?'],
      [AddressingTitle.ANH_HO]: ['Em chào Anh họ', 'Anh họ có khỏe không?'],
      [AddressingTitle.CHI_HO]: ['Em chào Chị họ', 'Chị họ có khỏe không?'],
      [AddressingTitle.EM_HO]: ['Anh/Chị chào Em họ', 'Em họ có khỏe không?'],
      [AddressingTitle.ANH]: ['Em chào Anh', 'Anh có khỏe không?'],
      [AddressingTitle.CHI]: ['Em chào Chị', 'Chị có khỏe không?'],
      [AddressingTitle.EM]: ['Anh/Chị chào Em', 'Em có khỏe không?'],
      [AddressingTitle.CON]: ['Ba/Mẹ chào con', 'Con có khỏe không?'],
      [AddressingTitle.CHAU]: ['Ông/Bà chào cháu', 'Cháu có khỏe không?'],
      [AddressingTitle.ONG_NOI]: ['Cháu chào Ông ạ', 'Ông có khỏe không ạ?'],
      [AddressingTitle.BA_NOI]: ['Cháu chào Bà ạ', 'Bà có khỏe không ạ?'],
      [AddressingTitle.ONG_NGOAI]: ['Cháu chào Ông ạ', 'Ông có khỏe không ạ?'],
      [AddressingTitle.BA_NGOAI]: ['Cháu chào Bà ạ', 'Bà có khỏe không ạ?'],
      [AddressingTitle.UNKNOWN]: []
    };

    return greetings[title] || [];
  }

  /**
   * Tính độ tin cậy của gợi ý
   */
  private calculateConfidence(title: AddressingTitle, explanation: string): number {
    if (title === AddressingTitle.UNKNOWN) return 0.0;
    if (explanation.includes('Không xác định')) return 0.3;
    if (explanation.includes('?')) return 0.6;
    return 0.9;
  }
}