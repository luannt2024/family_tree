import React, { useState } from 'react';
import { 
  User, 
  Edit3, 
  Trash2, 
  Info, 
  Calendar,
  Heart,
  Crown,
  HelpCircle,
  Users
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { PersonCardProps, Gender, AddressingTitle } from '@/types';
import { Button } from '@/components/ui/Button';

export const PersonCard: React.FC<PersonCardProps> = ({
  person,
  isSelected = false,
  isHighlighted = false,
  onClick,
  onEdit,
  onDelete,
  onAddRelation,
  showAddressing = true
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const getGenderColor = (gender: Gender) => {
    switch (gender) {
      case Gender.MALE:
        return 'border-family-male bg-blue-50 dark:bg-blue-900/20';
      case Gender.FEMALE:
        return 'border-family-female bg-pink-50 dark:bg-pink-900/20';
      default:
        return 'border-family-neutral bg-gray-50 dark:bg-gray-800';
    }
  };

  const getGenderIcon = (gender: Gender) => {
    switch (gender) {
      case Gender.MALE:
        return '♂';
      case Gender.FEMALE:
        return '♀';
      default:
        return '?';
    }
  };

  const getAddressingColor = (title: AddressingTitle) => {
    // Màu sắc theo thế hệ và vai trò
    if ([AddressingTitle.BA, AddressingTitle.ME].includes(title)) {
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    }
    if ([AddressingTitle.CHU, AddressingTitle.CO, AddressingTitle.BAC_TRAI, AddressingTitle.BAC_GAI].includes(title)) {
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    }
    if ([AddressingTitle.THIM, AddressingTitle.DUONG, AddressingTitle.MO].includes(title)) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    }
    if ([AddressingTitle.ANH_HO, AddressingTitle.CHI_HO, AddressingTitle.EM_HO].includes(title)) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    }
    if ([AddressingTitle.CON, AddressingTitle.CHAU].includes(title)) {
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const formatAge = () => {
    if (!person.birthYear) return null;
    
    const currentYear = new Date().getFullYear();
    const age = person.deathYear ? person.deathYear - person.birthYear : currentYear - person.birthYear;
    
    if (person.deathYear) {
      return `${person.birthYear} - ${person.deathYear} (${age} tuổi)`;
    }
    
    return `${person.birthYear} (${age} tuổi)`;
  };

  return (
    <div
      className={cn(
        'relative rounded-xl shadow-lg transition-all duration-300 cursor-pointer',
        'hover:shadow-xl hover:scale-105 transform',
        person.gender === Gender.MALE ? 'vn-male-card' : 'vn-female-card',
        isSelected && 'ring-4 ring-yellow-400 ring-offset-2 scale-105',
        isHighlighted && 'ring-4 ring-red-400 ring-offset-2 animate-pulse',
        'min-w-[200px] max-w-[280px]'
      )}
      onClick={() => onClick?.(person)}
    >
      {/* Header với avatar và tên */}
      <div className="p-4 pb-2">
        <div className="flex items-start space-x-3">
          {/* Avatar */}
          <div className={cn(
            'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg',
            person.gender === Gender.MALE ? 'bg-family-male' : 
            person.gender === Gender.FEMALE ? 'bg-family-female' : 'bg-family-neutral'
          )}>
            {person.avatar ? (
              <img 
                src={person.avatar} 
                alt={person.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="h-6 w-6" />
            )}
          </div>

          {/* Thông tin cơ bản */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {person.name}
              </h3>
              <span className="text-sm text-gray-500">
                {getGenderIcon(person.gender)}
              </span>
              {person.isUser && (
                <Crown className="h-4 w-4 text-yellow-500" title="Người dùng chính" />
              )}
            </div>
            
            {formatAge() && (
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                <Calendar className="h-3 w-3 mr-1" />
                {formatAge()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Danh xưng */}
      {showAddressing && person.addressing.title !== AddressingTitle.UNKNOWN && (
        <div className="px-4 pb-2">
          <div className="flex items-center space-x-2">
            <span className={cn(
              'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
              getAddressingColor(person.addressing.title)
            )}>
              {person.addressing.title}
            </span>
            
            {person.addressing.confidence < 0.8 && (
              <HelpCircle className="h-3 w-3 text-yellow-500" title="Danh xưng chưa chắc chắn" />
            )}
          </div>
          
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {person.addressing.explanation}
          </p>
        </div>
      )}

      {/* Ghi chú */}
      {person.notes && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
            {person.notes}
          </p>
        </div>
      )}

      {/* Hướng dẫn xưng hô */}
      {showAddressing && person.addressing.greetingExamples.length > 0 && (
        <div className="px-4 pb-2">
          <div 
            className="relative"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <Button
              variant="ghost"
              size="sm"
              className="text-xs p-1 h-auto"
            >
              <Info className="h-3 w-3 mr-1" />
              Cách xưng hô
            </Button>
            
            {showTooltip && (
              <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
                <div className="font-medium mb-2">Ví dụ cách chào:</div>
                <ul className="space-y-1">
                  {person.addressing.greetingExamples.map((example, index) => (
                    <li key={index} className="text-gray-300">
                      • {example}
                    </li>
                  ))}
                </ul>
                <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-end space-x-1 p-2 border-t border-gray-200 dark:border-gray-700">
        {onAddRelation && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onAddRelation(person);
            }}
            className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
            title="Thêm quan hệ gia đình"
          >
            <Users className="h-3 w-3" />
          </Button>
        )}
        
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(person);
            }}
            className="p-2"
            title="Chỉnh sửa thông tin"
          >
            <Edit3 className="h-3 w-3" />
          </Button>
        )}
        
        {onDelete && !person.isUser && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(person);
            }}
            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            title="Xóa người này"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Lineage indicator */}
      {person.addressing.lineage && (
        <div className={cn(
          'absolute top-2 right-2 w-3 h-3 rounded-full',
          person.addressing.lineage === 'paternal' ? 'bg-family-paternal' : 'bg-family-maternal'
        )} 
        title={person.addressing.lineage === 'paternal' ? 'Nhánh nội' : 'Nhánh ngoại'}
        />
      )}

      {/* Generation indicator */}
      {person.addressing.generation !== 0 && (
        <div className="absolute top-2 left-2 text-xs font-bold text-gray-500 dark:text-gray-400">
          {person.addressing.generation > 0 ? `+${person.addressing.generation}` : person.addressing.generation}
        </div>
      )}
    </div>
  );
};