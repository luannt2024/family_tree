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
  getFamilyMembers: () => {
        const state = get();

        if (!state.userId) return [];

        const addressingEngine = new AddressingEngine(state.persons, state.relations, state.userId);

        return state.persons.map(person => {
          const addressing = addressingEngine.calculateAddressing(person.id);

          // Compute real relation path (relation ids) from user to this person
          const relationPath = person.id === state.userId ? [] : (addressingEngine.getRelationPath(state.userId!, person.id) || []);

          // If there is a direct relation (last relation on the path), surface its label and familyId
          let directRelationLabel: string | undefined = undefined;
          let relationFamilyId: string | undefined = undefined;
          if (relationPath.length > 0) {
            const lastRelId = relationPath[relationPath.length - 1];
            const rel = state.relations.find(r => r.id === lastRelId);
            if (rel) {
              directRelationLabel = rel.label as any;
              relationFamilyId = rel.familyId;
            }
          }

          return {
            ...person,
            addressing,
            relationPath,
            directRelationLabel,
            relationFamilyId,
            families: person.families || []
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