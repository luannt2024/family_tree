// Enums và constants
export enum Gender {
  MALE = 'M',
  FEMALE = 'F',
  UNKNOWN = 'U'
}

export enum RelationType {
  PARENT = 'parent',
  SPOUSE = 'spouse',
  SIBLING = 'sibling',
  CUSTOM = 'custom' // Cho quan hệ tùy chỉnh (cô ruột, thím, ...)
}

export enum AddressingTitle {
  // Thế hệ trên (cha mẹ và anh chị em của cha mẹ)
  BA = 'Ba',
  ME = 'Mẹ',
  BAC_TRAI = 'Bác trai',
  BAC_GAI = 'Bác gái',
  CHU = 'Chú',
  CO = 'Cô',
  CAU = 'Cậu',
  DI = 'Dì',
  
  // Vợ/chồng của thế hệ trên
  THIM = 'Thím',
  DUONG = 'Dượng',
  MO = 'Mợ',
  
  // Thế hệ ngang hàng
  ANH_HO = 'Anh họ',
  CHI_HO = 'Chị họ',
  EM_HO = 'Em họ',
  ANH = 'Anh',
  CHI = 'Chị',
  EM = 'Em',
  
  // Thế hệ dưới
  CON = 'Con',
  CHAU = 'Cháu',
  
  // Ông bà
  ONG_NOI = 'Ông nội',
  BA_NOI = 'Bà nội',
  ONG_NGOAI = 'Ông ngoại',
  BA_NGOAI = 'Bà ngoại',
  
  // Không xác định
  UNKNOWN = '?'
}

export enum LineageType {
  PATERNAL = 'paternal', // Nội
  MATERNAL = 'maternal'  // Ngoại
}

// Interfaces chính
export interface Person {
  id: string;
  name: string;
  gender: Gender;
  birthYear?: number;
  birthDate?: string;
  deathYear?: number;
  deathDate?: string;
  avatar?: string;
  notes?: string;
  isUser?: boolean; // Đánh dấu người dùng chính (điểm quy chiếu)

  // Nhóm/gia đình (tùy chọn) - dùng để phân cụm cây gia phả
  families?: string[];
  
  // Metadata cho UI
  position?: { x: number; y: number };
  isHighlighted?: boolean;
}

export interface Relation {
  id: string;
  type: RelationType;
  personAId: string;
  personBId: string;
  
  // Cho parent relation
  parentId?: string;
  childId?: string;

  // Ai là người chủ đạo trong quan hệ (tuỳ chọn) - giúp xác định hướng khi cần
  subjectId?: string;

  // Thông tin mô tả chi tiết (ví dụ: 'Anh', 'Chị', 'Cô ruột', 'Thím', ...)
  label?: AddressingTitle | string;

  // Nhóm gia đình / family cluster id (ví dụ: 'Gia đình bác 5')
  familyId?: string;
  
  // Metadata
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AddressingInfo {
  title: AddressingTitle | string;
  explanation: string;
  greetingExamples: string[];
  lineage: LineageType | null;
  generation: number; // Số thế hệ so với user (âm = trên, dương = dưới, 0 = ngang)
  confidence: number; // Độ tin cậy của gợi ý (0-1)
}

export interface FamilyMember extends Person {
  addressing: AddressingInfo;
  relationPath: string[]; // Đường đi từ user đến person này
  directRelation?: RelationType;
  directRelationLabel?: string; // Ghi nhãn quan hệ trực tiếp (nếu có)
  relationFamilyId?: string; // family cluster id for the direct relation
  families?: string[]; // Danh sách các nhóm/gia đình (family cluster) người này thuộc về
}

// Store interfaces
export interface FamilyTreeState {
  persons: Person[];
  relations: Relation[];
  userId: string | null;
  selectedPersonId: string | null;
  highlightedPersonIds: string[];
  searchQuery: string;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  isDarkMode: boolean;
  showAddressingHints: boolean;
  
  // Tree layout
  treeLayout: 'horizontal' | 'vertical';
  zoomLevel: number;
  centerPosition: { x: number; y: number };
}

// Action interfaces
export interface AddPersonAction {
  person: Omit<Person, 'id'>;
  relationTo?: {
    personId: string;
    relationType: RelationType;
  };
}

export interface UpdatePersonAction {
  personId: string;
  updates: Partial<Person>;
}

export interface AddRelationAction {
  relation: Omit<Relation, 'id'>;
}

export interface DeletePersonAction {
  personId: string;
}

export interface DeleteRelationAction {
  relationId: string;
}

// Export/Import interfaces
export interface FamilyTreeExport {
  version: string;
  exportDate: string;
  persons: Person[];
  relations: Relation[];
  userId: string | null;
  metadata: {
    appName: string;
    appVersion: string;
  };
}

// UI Component Props
export interface PersonCardProps {
  person: FamilyMember;
  isSelected?: boolean;
  isHighlighted?: boolean;
  onClick?: (person: FamilyMember) => void;
  onEdit?: (person: FamilyMember) => void;
  onDelete?: (person: FamilyMember) => void;
  onAddRelation?: (person: FamilyMember) => void;
  showAddressing?: boolean;
}

export interface TreeNodeData {
  person: FamilyMember;
  level: number;
  children: TreeNodeData[];
  parents: TreeNodeData[];
  spouses: TreeNodeData[];
}

// Form interfaces
export interface PersonFormData {
  name: string;
  gender: Gender;
  birthYear?: number;
  birthDate?: string;
  deathYear?: number;
  deathDate?: string;
  notes?: string;
  avatar?: string;
}

export interface RelationFormData {
  personAId: string;
  personBId: string;
  relationType: RelationType;
  notes?: string;
}

// Search and filter
export interface SearchFilters {
  query: string;
  gender?: Gender;
  generation?: number;
  lineage?: LineageType;
  isAlive?: boolean;
}

export interface SearchResult {
  person: FamilyMember;
  matchScore: number;
  matchedFields: string[];
}

// Theme
export interface ThemeConfig {
  isDark: boolean;
  primaryColor: string;
  maleColor: string;
  femaleColor: string;
  paternalColor: string;
  maternalColor: string;
}

// Utility types
export type PersonId = string;
export type RelationId = string;

export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: ValidationError[];
}