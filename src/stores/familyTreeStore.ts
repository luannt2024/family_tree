import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  Person, 
  Relation, 
  FamilyTreeState, 
  FamilyMember,
  AddPersonAction,
  UpdatePersonAction,
  AddRelationAction,
  DeletePersonAction,
  DeleteRelationAction,
  Gender,
  RelationType
} from '@/types';
import { ValidationUtils } from '@/utils/validation';
import { AddressingEngine } from '@/utils/addressing';

interface FamilyTreeStore extends FamilyTreeState {
  // Actions
  addPerson: (action: AddPersonAction) => void;
  updatePerson: (action: UpdatePersonAction) => void;
  deletePerson: (action: DeletePersonAction) => void;
  addRelation: (action: AddRelationAction) => void;
  deleteRelation: (action: DeleteRelationAction) => void;
  createRelationship: (personAId: string, personBId: string, relationshipType: RelationType, options?: { label?: string; familyId?: string }) => void;
  
  // User management
  setUser: (personId: string) => void;
  
  // Selection and highlighting
  selectPerson: (personId: string | null) => void;
  highlightPersons: (personIds: string[]) => void;
  clearHighlights: () => void;
  
  // Search
  setSearchQuery: (query: string) => void;
  searchPersons: (query: string) => FamilyMember[];
  
  // UI state
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  toggleDarkMode: () => void;
  toggleAddressingHints: () => void;
  setTreeLayout: (layout: 'horizontal' | 'vertical') => void;
  setZoomLevel: (zoom: number) => void;
  setCenterPosition: (position: { x: number; y: number }) => void;
  
  // Data processing
  getFamilyMembers: () => FamilyMember[];
  getPersonById: (id: string) => Person | undefined;
  getRelationsByPersonId: (personId: string) => Relation[];
  
  // Export/Import
  exportData: () => string;
  importData: (data: string) => boolean;
  
  // Reset
  reset: () => void;
}

const initialState: FamilyTreeState = {
  persons: [],
  relations: [],
  userId: null,
  selectedPersonId: null,
  highlightedPersonIds: [],
  searchQuery: '',
  isLoading: false,
  error: null,
  isDarkMode: false,
  showAddressingHints: true,
  treeLayout: 'horizontal',
  zoomLevel: 1,
  centerPosition: { x: 0, y: 0 }
};

export const useFamilyTreeStore = create<FamilyTreeStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Person management
      addPerson: (action: AddPersonAction) => {
        const state = get();
        
        // Validate person data
        const errors = ValidationUtils.validatePerson(action.person);
        if (errors.length > 0) {
          set({ error: errors.map(e => e.message).join(', ') });
          return;
        }

        // Generate ID and create person
        const newPerson: Person = {
          ...action.person,
          id: ValidationUtils.generatePersonId(),
          name: ValidationUtils.sanitizeName(action.person.name),
          notes: action.person.notes ? ValidationUtils.sanitizeNotes(action.person.notes) : undefined
        };

        const newPersons = [...state.persons, newPerson];
        let newRelations = [...state.relations];

        // Add relation if specified
        if (action.relationTo) {
          const relationId = ValidationUtils.generateRelationId();
          let newRelation: Relation;

          if (action.relationTo.relationType === RelationType.PARENT) {
            // Need to determine who is parent and who is child
            // For now, assume the existing person is parent
            newRelation = {
              id: relationId,
              type: RelationType.PARENT,
              personAId: action.relationTo.personId,
              personBId: newPerson.id,
              parentId: action.relationTo.personId,
              childId: newPerson.id
            };
          } else {
            newRelation = {
              id: relationId,
              type: action.relationTo.relationType,
              personAId: action.relationTo.personId,
              personBId: newPerson.id
            };
          }

          // Validate relation
          const relationErrors = ValidationUtils.validateRelation(newRelation, newPersons);
          if (relationErrors.length > 0) {
            set({ error: relationErrors.map(e => e.message).join(', ') });
            return;
          }

          newRelations.push(newRelation);
        }

        // Set as user if this is the first person
        const newUserId = state.userId || (newPersons.length === 1 ? newPerson.id : state.userId);

        set({
          persons: newPersons,
          relations: newRelations,
          userId: newUserId,
          error: null
        });
      },

      updatePerson: (action: UpdatePersonAction) => {
        const state = get();
        const personIndex = state.persons.findIndex(p => p.id === action.personId);
        
        if (personIndex === -1) {
          set({ error: 'Không tìm thấy người cần cập nhật' });
          return;
        }

        const updatedPerson = { ...state.persons[personIndex], ...action.updates };
        
        // Validate updated person
        const errors = ValidationUtils.validatePerson(updatedPerson);
        if (errors.length > 0) {
          set({ error: errors.map(e => e.message).join(', ') });
          return;
        }

        // Sanitize data
        if (updatedPerson.name) {
          updatedPerson.name = ValidationUtils.sanitizeName(updatedPerson.name);
        }
        if (updatedPerson.notes) {
          updatedPerson.notes = ValidationUtils.sanitizeNotes(updatedPerson.notes);
        }

        const newPersons = [...state.persons];
        newPersons[personIndex] = updatedPerson;

        set({
          persons: newPersons,
          error: null
        });
      },

      deletePerson: (action: DeletePersonAction) => {
        const state = get();
        
        // Cannot delete user
        if (action.personId === state.userId) {
          set({ error: 'Không thể xóa người dùng chính' });
          return;
        }

        // Remove person and all related relations
        const newPersons = state.persons.filter(p => p.id !== action.personId);
        const newRelations = state.relations.filter(r => 
          r.personAId !== action.personId && r.personBId !== action.personId
        );

        // Clear selection if deleted person was selected
        const newSelectedPersonId = state.selectedPersonId === action.personId 
          ? null 
          : state.selectedPersonId;

        // Remove from highlights
        const newHighlightedPersonIds = state.highlightedPersonIds.filter(id => id !== action.personId);

        set({
          persons: newPersons,
          relations: newRelations,
          selectedPersonId: newSelectedPersonId,
          highlightedPersonIds: newHighlightedPersonIds,
          error: null
        });
      },

      addRelation: (action: AddRelationAction) => {
        const state = get();
        
        const newRelation: Relation = {
          ...action.relation,
          id: ValidationUtils.generateRelationId()
        };

        // Validate relation
        const errors = ValidationUtils.validateRelation(newRelation, state.persons);
        if (errors.length > 0) {
          set({ error: errors.map(e => e.message).join(', ') });
          return;
        }

        // Check for duplicate relations
        const isDuplicate = state.relations.some(r => 
          (r.personAId === newRelation.personAId && r.personBId === newRelation.personBId && r.type === newRelation.type) ||
          (r.personAId === newRelation.personBId && r.personBId === newRelation.personAId && r.type === newRelation.type)
        );

        if (isDuplicate) {
          set({ error: 'Quan hệ này đã tồn tại' });
          return;
        }

        set({
          relations: [...state.relations, newRelation],
          error: null
        });
      },

      deleteRelation: (action: DeleteRelationAction) => {
        const state = get();
        const newRelations = state.relations.filter(r => r.id !== action.relationId);
        
        set({
          relations: newRelations,
          error: null
        });
      },

      createRelationship: (personAId: string, personBId: string, relationshipType: RelationType, options?: { label?: string; familyId?: string }) => {
        const state = get();
        
        // Validate that both persons exist
        const personA = state.persons.find(p => p.id === personAId);
        const personB = state.persons.find(p => p.id === personBId);
        
        if (!personA || !personB) {
          set({ error: 'Không tìm thấy một trong hai người' });
          return;
        }

        // Create the relation
        const newRelation: Relation = {
          id: ValidationUtils.generateRelationId(),
          personAId,
          personBId,
          type: relationshipType,
          label: options?.label,
          familyId: options?.familyId,
          createdAt: new Date().toISOString()
        } as Relation;

        // If it's a parent relation, try to determine parent/child direction
        if (relationshipType === RelationType.PARENT) {
          // If personAId is the parent of personBId, set parent/child accordingly; otherwise, try to infer by birthYear if available
          // Default: treat personA as parent and personB as child
          newRelation.parentId = personA.id;
          newRelation.childId = personB.id;

          // Attempt to refine using birthYear
          if (personA.birthYear && personB.birthYear) {
            if (personA.birthYear > personB.birthYear) {
              // If A is younger than B, swap
              newRelation.parentId = personB.id;
              newRelation.childId = personA.id;
            }
          }
        }

        // Validate relation
        const errors = ValidationUtils.validateRelation(newRelation, state.persons);
        if (errors.length > 0) {
          set({ error: errors.map(e => e.message).join(', ') });
          return;
        }

        // Check for duplicate relations (considering label/familyId as well)
        const isDuplicate = state.relations.some(r => 
          (r.personAId === newRelation.personAId && r.personBId === newRelation.personBId && r.type === newRelation.type) ||
          (r.personAId === newRelation.personBId && r.personBId === newRelation.personAId && r.type === newRelation.type)
        );

        if (isDuplicate) {
          set({ error: 'Quan hệ này đã tồn tại' });
          return;
        }

        const newRelations = [...state.relations, newRelation];

        // If familyId provided, tag affected persons with that family cluster
        if (options?.familyId) {
          const updatedPersons = state.persons.map(p => {
            if (p.id === personAId || p.id === personBId) {
              const families = (p as any).families || [];
              if (!families.includes(options.familyId!)) families.push(options.familyId!);
              return { ...p, families };
            }
            return p;
          });

          set({ relations: newRelations, persons: updatedPersons, error: null });
          return;
        }

        set({ relations: newRelations, error: null });
      },

      // User management
      setUser: (personId: string) => {
        const state = get();
        const person = state.persons.find(p => p.id === personId);
        
        if (!person) {
          set({ error: 'Không tìm thấy người dùng' });
          return;
        }

        set({
          userId: personId,
          error: null
        });
      },

      // Selection and highlighting
      selectPerson: (personId: string | null) => {
        set({ selectedPersonId: personId });
      },

      highlightPersons: (personIds: string[]) => {
        set({ highlightedPersonIds: personIds });
      },

      clearHighlights: () => {
        set({ highlightedPersonIds: [] });
      },

      // Search
      setSearchQuery: (query: string) => {
        set({ searchQuery: query });
      },

      searchPersons: (query: string) => {
        const state = get();
        const familyMembers = get().getFamilyMembers();
        
        if (!query.trim()) return familyMembers;

        const lowerQuery = query.toLowerCase().trim();
        
        return familyMembers.filter(member => 
          member.name.toLowerCase().includes(lowerQuery) ||
          member.addressing.title.toLowerCase().includes(lowerQuery) ||
          member.addressing.explanation.toLowerCase().includes(lowerQuery) ||
          (member.notes && member.notes.toLowerCase().includes(lowerQuery))
        );
      },

      // UI state
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      toggleDarkMode: () => {
        set(state => ({ isDarkMode: !state.isDarkMode }));
      },

      toggleAddressingHints: () => {
        set(state => ({ showAddressingHints: !state.showAddressingHints }));
      },

      setTreeLayout: (layout: 'horizontal' | 'vertical') => {
        set({ treeLayout: layout });
      },

      setZoomLevel: (zoom: number) => {
        set({ zoomLevel: Math.max(0.1, Math.min(3, zoom)) });
      },

      setCenterPosition: (position: { x: number; y: number }) => {
        set({ centerPosition: position });
      },

      // Data processing
      getFamilyMembers: () => {
        const state = get();
        
        if (!state.userId) return [];

        const addressingEngine = new AddressingEngine(state.persons, state.relations, state.userId);
        
        return state.persons.map(person => {
          const addressing = addressingEngine.calculateAddressing(person.id);
          const relationPath = person.id === state.userId ? [] : ['path']; // Simplified
          
          return {
            ...person,
            addressing,
            relationPath
          } as FamilyMember;
        });
      },

      getPersonById: (id: string) => {
        return get().persons.find(p => p.id === id);
      },

      getRelationsByPersonId: (personId: string) => {
        return get().relations.filter(r => r.personAId === personId || r.personBId === personId);
      },

      // Export/Import
      exportData: () => {
        const state = get();
        const exportData = {
          version: '1.0.0',
          exportDate: new Date().toISOString(),
          persons: state.persons,
          relations: state.relations,
          userId: state.userId,
          metadata: {
            appName: 'Smart Family Tree',
            appVersion: '1.0.0'
          }
        };
        
        return JSON.stringify(exportData, null, 2);
      },

      importData: (data: string) => {
        try {
          const importData = JSON.parse(data);
          
          // Basic validation
          if (!importData.persons || !Array.isArray(importData.persons)) {
            set({ error: 'Dữ liệu không hợp lệ: thiếu danh sách người' });
            return false;
          }
          
          if (!importData.relations || !Array.isArray(importData.relations)) {
            set({ error: 'Dữ liệu không hợp lệ: thiếu danh sách quan hệ' });
            return false;
          }

          // Validate each person
          for (const person of importData.persons) {
            const errors = ValidationUtils.validatePerson(person);
            if (errors.length > 0) {
              set({ error: `Dữ liệu người không hợp lệ: ${errors[0].message}` });
              return false;
            }
          }

          // Validate each relation
          for (const relation of importData.relations) {
            const errors = ValidationUtils.validateRelation(relation, importData.persons);
            if (errors.length > 0) {
              set({ error: `Dữ liệu quan hệ không hợp lệ: ${errors[0].message}` });
              return false;
            }
          }

          // Import data
          set({
            persons: importData.persons,
            relations: importData.relations,
            userId: importData.userId,
            error: null
          });

          return true;
        } catch (error) {
          set({ error: 'Không thể đọc dữ liệu: định dạng JSON không hợp lệ' });
          return false;
        }
      },

      // Reset
      reset: () => {
        set(initialState);
      }
    }),
    {
      name: 'family-tree-storage',
      partialize: (state) => ({
        persons: state.persons,
        relations: state.relations,
        userId: state.userId,
        isDarkMode: state.isDarkMode,
        showAddressingHints: state.showAddressingHints,
        treeLayout: state.treeLayout
      })
    }
  )
);