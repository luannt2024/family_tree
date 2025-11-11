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
  private tree: Record<string, { parents: string[]; children: string[]; spouses: string[] }>;
  private clusterMap: Record<string, string[]>;

  constructor(
    persons: Person[],
    relations: Relation[],
    userId: string,
    tree?: Record<string, { parents: string[]; children: string[]; spouses: string[] }>,
    clusterMap?: Record<string, string[]>
  ) {
    this.persons = persons;
    this.relations = relations;
    this.userId = userId;

    // Use provided tree if available, otherwise build from relations/persons
    if (tree) {
      this.tree = tree;
    } else {
      this.tree = {};
      this.persons.forEach(p => {
        this.tree[p.id] = { parents: [], children: [], spouses: [] };
      });

      this.relations.forEach(r => {
        if (r.type === RelationType.PARENT) {
          if (r.parentId && r.childId) {
            if (!this.tree[r.parentId]) this.tree[r.parentId] = { parents: [], children: [], spouses: [] };
            if (!this.tree[r.childId]) this.tree[r.childId] = { parents: [], children: [], spouses: [] };
            this.tree[r.parentId].children.push(r.childId);
            this.tree[r.childId].parents.push(r.parentId);
          } else {
            const a = this.persons.find(p => p.id === r.personAId);
            const b = this.persons.find(p => p.id === r.personBId);
            if (a && b && typeof a.birthYear === 'number' && typeof b.birthYear === 'number') {
              if (a.birthYear < b.birthYear) {
                if (!this.tree[a.id]) this.tree[a.id] = { parents: [], children: [], spouses: [] };
                if (!this.tree[b.id]) this.tree[b.id] = { parents: [], children: [], spouses: [] };
                this.tree[a.id].children.push(b.id);
                this.tree[b.id].parents.push(a.id);
              } else {
                if (!this.tree[b.id]) this.tree[b.id] = { parents: [], children: [], spouses: [] };
                if (!this.tree[a.id]) this.tree[a.id] = { parents: [], children: [], spouses: [] };
                this.tree[b.id].children.push(a.id);
                this.tree[a.id].parents.push(b.id);
              }
            } else {
              if (!this.tree[r.personAId]) this.tree[r.personAId] = { parents: [], children: [], spouses: [] };
              if (!this.tree[r.personBId]) this.tree[r.personBId] = { parents: [], children: [], spouses: [] };
              this.tree[r.personAId].children.push(r.personBId);
              this.tree[r.personBId].parents.push(r.personAId);
            }
          }
        } else if (r.type === RelationType.SPOUSE) {
          if (!this.tree[r.personAId]) this.tree[r.personAId] = { parents: [], children: [], spouses: [] };
          if (!this.tree[r.personBId]) this.tree[r.personBId] = { parents: [], children: [], spouses: [] };
          this.tree[r.personAId].spouses.push(r.personBId);
          this.tree[r.personBId].spouses.push(r.personAId);
        }
      });
    }

    this.clusterMap = clusterMap || {};
    if (!clusterMap) {
      const map: Record<string, string[]> = {};
      this.persons.forEach(p => {
        (p.families || []).forEach(fid => {
          if (!map[fid]) map[fid] = [];
          map[fid].push(p.id);
        });
      });
      this.relations.forEach(r => {
        if (r.familyId) {
          if (!map[r.familyId]) map[r.familyId] = [];
          if (!map[r.familyId].includes(r.personAId)) map[r.familyId].push(r.personAId);
          if (!map[r.familyId].includes(r.personBId)) map[r.familyId].push(r.personBId);
        }
      });
      this.clusterMap = map;
    }
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

    // Build enriched steps with context (fromId -> toId) and sibling age hints
    let currentPersonId = this.userId;
    type EnrichedStep = { relation: Relation; type: RelationType; isOlder?: boolean; fromId: string; toId: string };
    const steps: EnrichedStep[] = [];

    for (const relationId of relationPath) {
      const relation = this.relations.find(r => r.id === relationId)!;
      const nextPersonId = relation.personAId === currentPersonId ? relation.personBId : relation.personAId;

      let isOlder: boolean | undefined = undefined;
      if (relation.type === RelationType.SIBLING) {
        const cur = this.persons.find(p => p.id === currentPersonId);
        const next = this.persons.find(p => p.id === nextPersonId);
        if (cur?.birthYear !== undefined && next?.birthYear !== undefined) {
          // nextPerson is older if their birthYear is less (born earlier)
          isOlder = next.birthYear < cur.birthYear;
        }
      }

      steps.push({ relation, type: relation.type, isOlder, fromId: currentPersonId, toId: nextPersonId });
      currentPersonId = nextPersonId;
    }

    // Compute generation and lineage similar to previous logic
    let generation = 0;
    let lineage: LineageType | null = null;
    currentPersonId = this.userId;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const relation = step.relation;
      const nextPersonId = step.toId;

      if (step.type === RelationType.PARENT) {
        if (relation.childId === currentPersonId) {
          generation++; // up a generation
        } else {
          generation--; // down a generation
        }
      }

      if (i === 0 && step.type === RelationType.PARENT && relation.childId === currentPersonId) {
        const parent = this.persons.find(p => p.id === nextPersonId);
        if (parent) {
          const userPerson = this.persons.find(p => p.id === this.userId);
          if (userPerson) {
            lineage = this.determineLineage(parent, userPerson);
          }
        }
      }

      currentPersonId = nextPersonId;
    }

    // Target person is the last person reached
    const targetPerson = this.persons.find(p => p.id === currentPersonId)!;

    // Prefer stored label on the last (direct) relation if it applies to the target
    const lastStep = steps[steps.length - 1];
    const lastRelation = lastStep.relation;
    if (lastRelation.label) {
      // If subjectId is not set, assume the stored label applies to the relation (user intent)
      if (!lastRelation.subjectId || lastRelation.subjectId === targetPerson.id) {
        return this.createAddressingInfo(
          lastRelation.label as any,
          `Quan hệ trực tiếp: ${String(lastRelation.label)}`,
          lineage,
          generation
        );
      }
      // If subjectId exists and does not match targetPerson, fall through to derived logic
    }

    // Map to simple step summary for backward-compatible complex analysis
    const simpleSteps = steps.map(s => ({ type: s.type, isOlder: s.isOlder }));

    return this.determineAddressingTitle(simpleSteps, generation, lineage, targetPerson);
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
    title: AddressingTitle | string,
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
  private generateGreetingExamples(title: AddressingTitle | string): string[] {
    // If title is a custom string (not in AddressingTitle enum) return a generic greeting
    const enumValues = Object.values(AddressingTitle) as string[];
    if (typeof title === 'string' && !enumValues.includes(title)) {
      if (title.trim().length === 0) return [];
      return [`Xin chào ${title}`];
    }

    const t = title as AddressingTitle;
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

    return greetings[t] || [];
  }

  /**
   * Tính độ tin cậy của gợi ý
   */
  private calculateConfidence(title: AddressingTitle | string, explanation: string): number {
    if (title === AddressingTitle.UNKNOWN) return 0.0;
    if (explanation.includes('Không xác định')) return 0.3;
    if (explanation.includes('?')) return 0.6;
    return 0.9;
  }
}